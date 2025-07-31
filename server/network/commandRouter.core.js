// Core
const store = require("../core/datastore");
const strings = require("../core/types/strings");
const json = require("../core/types/json");
const list = require("../core/types/lists");
const sets = require("../core/types/sets");
const hashes = require("../core/types/hashes");
const sortedSets = require("../core/types/sortedSets");
const streams = require("../core/types/streams");
const bitmaps = require("../core/types/bitmaps");
const geo = require("../core/types/geospatial");
const bitfields = require("../core/types/bitfields");
const hyperloglog = require("../core/types/hyperloglog");
const bloomfilter = require("../core/types/bloomfilter");
const cuckoo = require("../core/types/cuckoofilter");
const timeseries = require("../core/types/timeseries");
const vector = require("../core/types/vector");
const documents = require("../core/types/documents");
const cluster = require("../core/clusterManager");
const { runLuaScript } = require("../core/luaEngine");
const {
  incrementCommandCount,
  logIfSlow,
  getSlowlog,
  getInfo,
} = require("../core/monitoring");

// Services
const transactionManager = require("../services/transactionManager");
const pubsub = require("../services/pubsubService");
const { getRole, forwardToSlaves } = require("../services/replicationService");
const { commandParser } = require("./commandParser");
const {
  appendToAOF,
  saveSnapshot,
  loadAOF,
  bgSaveSnapshot,
  logAOF,
  setReplayingAOF,
} = require("../services/persistenceService");

module.exports = async function routeCommandRaw({
  command,
  args,
  bypassTransaction = false,
}) {
  incrementCommandCount();
  const start = Date.now();

  try {
    const isTxnCmd = ["MULTI", "EXEC", "DISCARD"].includes(command);
    if (!bypassTransaction && transactionManager.isActive() && !isTxnCmd) {
      return transactionManager.queueCommand(
        "default",
        `${command} ${args.join(" ")}`
      );
    }

    const isMaster = getRole() === "master";
    const replicate = (cmd, argumentsArray) => {
      forwardToSlaves(cmd, argumentsArray);
    };

    let result;

    switch (command) {
      // PubSub Commands
      case "PUBLISH": {
        const [channel, ...messageParts] = args;
        if (!channel || messageParts.length === 0)
          return "ERR wrong number of arguments for PUBLISH";
        const message = messageParts.join(" ");
        const numReceivers = pubsub.publish(channel, message);
        return numReceivers;
      }

      case "SUBSCRIBE": {
        const [channel] = args;
        if (!channel) return "ERR wrong number of arguments for SUBSCRIBE";

        // Subscribe with a basic callback
        pubsub.subscribe(channel, (msg) => {
          console.log(`🔔 Message on [${channel}]: ${msg}`);
        });

        return `Subscribed to ${channel}`;
      }

      case "UNSUBSCRIBE": {
        const [channel] = args;
        if (!channel) return "ERR wrong number of arguments for UNSUBSCRIBE";

        // Unsubscribe using a no-op matching signature (for CLI use)
        pubsub.unsubscribe(channel, (msg) => {
          console.log(`🔔 Message on [${channel}]: ${msg}`);
        });

        return `Unsubscribed from ${channel}`;
      }

      // Transaction Commands
      case "MULTI": {
        return transactionManager.begin();
      }

      case "DISCARD": {
        return transactionManager.discard();
      }

      case "EXEC": {
        const results = await transactionManager.exec(
          "default",
          async (line) => {
            const { command, args } = commandParser(line);
            const result = await routeCommandRaw({
              command,
              args,
              bypassTransaction: true,
            });
            appendToAOF(line);
            return result;
          }
        );

        return results;
      }

      // Persistence Command
      case "SAVE": {
        saveSnapshot();
        loadAOF("SAVE");
        return "OK";
      }

      case "BGSAVE": {
        bgSaveSnapshot();
        return "Background saving started";
      }

      // Core Data Block
      case "SET": {
        const [key, value] = args;
        const result = store.set(key, value);
        if (isMaster) {
          appendToAOF(`SET ${key} ${value}`);
          replicate("SET", [key, value]);
        }
        return result;
      }

      case "GET": {
        const [key] = args;
        if (!key) return "ERR wrong number of arguments for GET";
        const result = store.get(key);
        return result !== null ? `"${result}"` : "(nil)";
      }

      case "EXISTS": {
        const [key] = args;
        if (!key) return "ERR wrong number of arguments for EXISTS";
        return store.has(key) ? 1 : 0;
      }

      case "DEL": {
        const delResult = store.del(...args);
        if (isMaster) {
          appendToAOF(`DEL ${args.join(" ")}`);
          replicate("DEL", args);
        }
        return delResult;
      }

      case "EXPIRE": {
        const [key, secondsStr] = args;
        if (!key || !secondsStr)
          return "ERR wrong number of arguments for EXPIRE";
        const seconds = parseInt(secondsStr, 10);
        if (isNaN(seconds) || seconds < 0) return "ERR invalid expiration time";
        if (isMaster) {
          appendToAOF(`EXPIRE ${key} ${secondsStr}`);
          replicate("EXPIRE", [key, secondsStr]);
        }
        return store.expire(key, seconds);
      }

      case "TTL": {
        const [key] = args;
        if (!key) return "ERR wrong number of arguments for TTL";
        return store.ttl(key);
      }

      case "PERSIST": {
        const [key] = args;
        if (!key) return "ERR wrong number of arguments for PERSIST";
        return store.persist(key);
      }

      case "FLUSHDB": {
        store.flush();
        if (isMaster && !setReplayingAOF()) {
          appendToAOF("FLUSHDB");
        }
        return "OK";
      }

      case "RANDOMKEY": {
        const keys = Array.from(store.store.keys()).filter(
          (k) => !store._isExpired(k)
        );
        if (keys.length === 0) return "(nil)";
        const rand = keys[Math.floor(Math.random() * keys.length)];
        return rand;
      }

      case "SELECT": {
        return "OK"; // Stubbed for single DB context
      }

      // Strings block

      case "APPEND": {
        const [key, value] = args;
        if (!key || value === undefined)
          return "ERR wrong number of arguments for APPEND";
        try {
          if (isMaster) {
            appendToAOF(`APPEND ${key} ${value}`);
            replicate("APPEND", [key, value]);
          }
          return strings.append(store, key, value);
        } catch (err) {
          return `ERR ${err.message}`;
        }
      }

      case "STRLEN": {
        const [key] = args;
        if (!key) return "ERR wrong number of arguments for STRLEN";
        try {
          return strings.strlen(store, key);
        } catch (err) {
          return `ERR ${err.message}`;
        }
      }

      case "INCR": {
        const [key] = args;
        if (!key) return "ERR wrong number of arguments for INCR";
        try {
          if (isMaster) {
            appendToAOF(`${command} ${args.join(" ")}`);
            replicate(command, args);
          }
          return strings.incr(store, key);
        } catch (err) {
          return `ERR ${err.message}`;
        }
      }

      case "DECR": {
        const [key] = args;
        if (!key) return "ERR wrong number of arguments for DECR";
        try {
          if (isMaster) {
            appendToAOF(`${command} ${args.join(" ")}`);
            replicate(command, args);
          }
          return strings.decr(store, key);
        } catch (err) {
          return `ERR ${err.message}`;
        }
      }

      case "INCRBY": {
        const [key, value] = args;
        if (!key || value === undefined)
          return "ERR wrong number of arguments for INCRBY";
        try {
          if (isMaster) {
            appendToAOF(`${command} ${args.join(" ")}`);
            replicate(command, args);
          }
          return strings.incrby(store, key, parseInt(value));
        } catch (err) {
          return `ERR ${err.message}`;
        }
      }

      case "DECRBY": {
        const [key, value] = args;
        if (!key || value === undefined)
          return "ERR wrong number of arguments for DECRBY";
        try {
          if (isMaster) {
            appendToAOF(`${command} ${args.join(" ")}`);
            replicate(command, args);
          }
          return strings.incrby(store, key, -parseInt(value));
        } catch (err) {
          return `ERR ${err.message}`;
        }
      }

      case "GETRANGE": {
        const [key, start, end] = args;
        if (!key || start === undefined || end === undefined)
          return "ERR wrong number of arguments for GETRANGE";
        try {
          return strings.getrange(store, key, parseInt(start), parseInt(end));
        } catch (err) {
          return `ERR ${err.message}`;
        }
      }

      case "SETRANGE": {
        const [key, offset, subStr] = args;
        if (!key || offset === undefined || subStr === undefined)
          return "ERR wrong number of arguments for SETRANGE";
        try {
          appendToAOF(`SETRANGE ${args[0]} ${args[1]} ${args[2]}`);
          return strings.setrange(store, key, parseInt(offset), subStr);
        } catch (err) {
          return `ERR ${err.message}`;
        }
      }

      // JSON block

      case "JSON.SET": {
        const [key, path, ...valueParts] = args;
        const valueStr = valueParts.join(" ");
        if (isMaster) {
          appendToAOF(`JSON.SET ${key} ${path} ${valueStr}`);
          replicate("JSON.SET", [key, path, valueStr]);
        }
        return json.set(store, key, path, valueStr);
      }

      case "JSON.GET": {
        const [key, path] = args;
        if (!key) return "ERR wrong number of arguments for JSON.GET";
        return json.get(store, key, path);
      }

      case "JSON.DEL": {
        const [key, path] = args;
        if (!key) return "ERR wrong number of arguments for JSON.DEL";
        if (isMaster) {
          appendToAOF(`JSON.DEL ${key} ${path}`);
          replicate("JSON.DEL", [key, path]);
        }
        return json.del(store, key, path);
      }

      case "JSON.ARRAPPEND": {
        const [key, path, ...values] = args;
        if (!key || !path || values.length === 0) {
          return "ERR wrong number of arguments for 'JSON.ARRAPPEND'";
        }
        if (isMaster) {
          appendToAOF(`${command} ${args.join(" ")}`);
          replicate(command, args);
        }
        return json.arrappend(store, key, path, ...values);
      }

      // Lists block

      case "LPUSH": {
        const [key, ...values] = args;
        if (!key || values.length === 0)
          return "ERR wrong number of arguments for LPUSH";
        try {
          if (isMaster) {
            appendToAOF(`${command} ${args.join(" ")}`);
            replicate(command, args);
          }
          return list.lpush(store, key, ...values);
        } catch (err) {
          return `ERR ${err.message}`;
        }
      }

      case "RPUSH": {
        const [key, ...values] = args;
        if (!key || values.length === 0)
          return "ERR wrong number of arguments for RPUSH";
        try {
          if (isMaster) {
            appendToAOF(`${command} ${args.join(" ")}`);
            replicate(command, args);
          }
          return list.rpush(store, key, ...values);
        } catch (err) {
          return `ERR ${err.message}`;
        }
      }

      case "LPOP": {
        const [key] = args;
        if (!key) return "ERR wrong number of arguments for LPOP";
        try {
          const value = list.lpop(store, key);
          if (isMaster) {
            appendToAOF(`${command} ${args.join(" ")}`);
            replicate(command, args);
          }
          return value === null ? "(nil)" : `"${value}"`;
        } catch (err) {
          return `ERR ${err.message}`;
        }
      }

      case "RPOP": {
        const [key] = args;
        if (!key) return "ERR wrong number of arguments for RPOP";
        try {
          const value = list.rpop(store, key);
          if (isMaster) {
            appendToAOF(`${command} ${args.join(" ")}`);
            replicate(command, args);
          }
          return value === null ? "(nil)" : `"${value}"`;
        } catch (err) {
          return `ERR ${err.message}`;
        }
      }

      case "LRANGE": {
        const [key, start, stop] = args;
        if (!key || start === undefined || stop === undefined)
          return "ERR wrong number of arguments for LRANGE";
        try {
          const result = list.lrange(store, key, start, stop);
          if (result.length === 0) return "(empty array)";
          return result.map((item, i) => `${i + 1}) "${item}"`).join("\n");
        } catch (err) {
          return `ERR ${err.message}`;
        }
      }

      case "LINDEX": {
        const [key, indexStr] = args;
        if (!key || indexStr === undefined)
          return "ERR wrong number of arguments for LINDEX";
        const index = parseInt(indexStr);
        if (isNaN(index)) return "ERR index is not an integer";
        try {
          const result = list.lindex(store, key, index);
          return result === null ? "(nil)" : `"${result}"`;
        } catch (err) {
          return `ERR ${err.message}`;
        }
      }

      case "LSET": {
        const [key, indexStr, value] = args;
        if (!key || indexStr === undefined || value === undefined)
          return "ERR wrong number of arguments for LSET";
        const index = parseInt(indexStr);
        if (isNaN(index)) return "ERR index is not an integer";
        try {
          if (isMaster) {
            appendToAOF(`LSET ${key} ${indexStr} ${value}`);
            replicate(command, args);
          }
          return list.lset(store, key, index, value);
        } catch (err) {
          return `ERR ${err.message}`;
        }
      }

      // Sets block

      case "SADD": {
        const [key, ...members] = args;
        if (!key || members.length === 0)
          return "ERR wrong number of arguments for SADD";
        try {
          if (isMaster) {
            appendToAOF(`${command} ${args.join(" ")}`);
            replicate(command, args);
          }
          return sets.sadd(store, key, ...members);
        } catch (err) {
          return `ERR ${err.message}`;
        }
      }

      case "SREM": {
        const [key, ...members] = args;
        if (!key || members.length === 0)
          return "ERR wrong number of arguments for SREM";
        try {
          if (isMaster) {
            appendToAOF(`${command} ${args.join(" ")}`);
            replicate(command, args);
          }
          return sets.srem(store, key, ...members);
        } catch (err) {
          return `ERR ${err.message}`;
        }
      }

      case "SMEMBERS": {
        const [key] = args;
        if (!key) return "ERR wrong number of arguments for SMEMBERS";
        try {
          return sets.smembers(store, key);
        } catch (err) {
          return `ERR ${err.message}`;
        }
      }

      case "SISMEMBER": {
        const [key, member] = args;
        if (!key || member === undefined)
          return "ERR wrong number of arguments for SISMEMBER";
        try {
          return sets.sismember(store, key, member);
        } catch (err) {
          return `ERR ${err.message}`;
        }
      }

      case "SCARD": {
        const [key] = args;
        if (!key) return "ERR wrong number of arguments for SCARD";
        try {
          return sets.scard(store, key);
        } catch (err) {
          return `ERR ${err.message}`;
        }
      }

      case "SPOP": {
        const [key] = args;
        if (!key) return "ERR wrong number of arguments for SPOP";
        try {
          if (isMaster) {
            appendToAOF(`${command} ${args.join(" ")}`);
            replicate(command, args);
          }
          return sets.spop(store, key);
        } catch (err) {
          return `ERR ${err.message}`;
        }
      }

      case "SRANDMEMBER": {
        const [key] = args;
        if (!key) return "ERR wrong number of arguments for SRANDMEMBER";
        try {
          return sets.srandmember(store, key);
        } catch (err) {
          return `ERR ${err.message}`;
        }
      }

      case "SUNION": {
        if (args.length === 0)
          return "ERR wrong number of arguments for SUNION";
        try {
          if (isMaster) {
            appendToAOF(`SUNION ${args.join(" ")}`);
            replicate(command, args);
          }
          return sets.sunion(store, ...args);
        } catch (err) {
          return `ERR ${err.message}`;
        }
      }

      case "SINTER": {
        if (args.length === 0)
          return "ERR wrong number of arguments for SINTER";
        try {
          if (isMaster) {
            appendToAOF(`SINTER ${args.join(" ")}`);
            replicate(command, args);
          }
          return sets.sinter(store, ...args);
        } catch (err) {
          return `ERR ${err.message}`;
        }
      }

      case "SDIFF": {
        if (args.length === 0) return "ERR wrong number of arguments for SDIFF";
        try {
          if (isMaster) {
            appendToAOF(`SDIFF ${args.join(" ")}`);
            replicate(command, args);
          }
          return sets.sdiff(store, ...args);
        } catch (err) {
          return `ERR ${err.message}`;
        }
      }

      // Hashes block

      case "HSET": {
        const [key, ...fieldValuePairs] = args;
        if (
          !key ||
          fieldValuePairs.length < 2 ||
          fieldValuePairs.length % 2 !== 0
        )
          return "ERR wrong number of arguments for HSET";

        try {
          if (isMaster) {
            appendToAOF(`HSET ${key} ${fieldValuePairs.join(" ")}`);
            replicate("HSET", [key, ...fieldValuePairs]);
          }
          return hashes.hset(store, key, ...fieldValuePairs);
        } catch (err) {
          return `ERR ${err.message}`;
        }
      }

      case "HGET": {
        const [key, field] = args;
        if (!key || field === undefined)
          return "ERR wrong number of arguments for HGET";

        try {
          const result = hashes.hget(store, key, field);
          return result === null ? "(nil)" : `"${result}"`;
        } catch (err) {
          return `ERR ${err.message}`;
        }
      }

      case "HMSET": {
        const [key, ...fieldValuePairs] = args;
        if (
          !key ||
          fieldValuePairs.length < 2 ||
          fieldValuePairs.length % 2 !== 0
        )
          return "ERR wrong number of arguments for HMSET";

        try {
          if (isMaster) {
            appendToAOF(`HMSET ${key} ${fieldValuePairs}`);
            replicate(command, args);
          }
          return hashes.hmset(store, key, ...fieldValuePairs);
        } catch (err) {
          return `ERR ${err.message}`;
        }
      }

      case "HGETALL": {
        const [key] = args;
        if (!key) return "ERR wrong number of arguments for HGETALL";

        try {
          const result = hashes.hgetall(store, key);
          if (result.length === 0) return "(empty array)";
          return result.map((val, i) => `${i + 1}) "${val}"`).join("\n");
        } catch (err) {
          return `ERR ${err.message}`;
        }
      }

      case "HDEL": {
        const [key, ...fields] = args;
        if (!key || fields.length === 0)
          return "ERR wrong number of arguments for HDEL";

        try {
          if (isMaster) {
            appendToAOF(`HDEL ${key} ${fields.join(" ")}`);
            replicate(command, args);
          }
          return hashes.hdel(store, key, ...fields);
        } catch (err) {
          return `ERR ${err.message}`;
        }
      }

      case "HEXISTS": {
        const [key, field] = args;
        if (!key || field === undefined)
          return "ERR wrong number of arguments for HEXISTS";

        try {
          return hashes.hexists(store, key, field);
        } catch (err) {
          return `ERR ${err.message}`;
        }
      }

      // Sorted Sets Block

      case "ZADD": {
        const [key, ...argsRest] = args;
        if (!key || argsRest.length < 2)
          return "ERR wrong number of arguments for ZADD";

        try {
          const result = sortedSets.zadd(store, key, ...argsRest);
          if (result === null) return "(nil)";
          if (isMaster) {
            appendToAOF(`ZADD ${key} ${argsRest.join(" ")}`);
            replicate("ZADD", [key, ...argsRest]);
          }
          return result;
        } catch (err) {
          return `ERR ${err.message}`;
        }
      }

      case "ZRANGE": {
        const [key, start, stop] = args;
        if (!key || start === undefined || stop === undefined)
          return "ERR wrong number of arguments for ZRANGE";

        try {
          const result = sortedSets.zrange(store, key, start, stop);
          if (result.length === 0) return "(empty array)";
          return result.map((val, i) => `${i + 1}) "${val}"`).join("\n");
        } catch (err) {
          return `ERR ${err.message}`;
        }
      }

      case "ZRANK": {
        const [key, member] = args;
        if (!key || member === undefined)
          return "ERR wrong number of arguments for ZRANK";

        try {
          const rank = sortedSets.zrank(store, key, member);
          return rank === null ? "(nil)" : rank;
        } catch (err) {
          return `ERR ${err.message}`;
        }
      }

      case "ZREM": {
        const [key, ...members] = args;
        if (!key || members.length === 0)
          return "ERR wrong number of arguments for ZREM";

        try {
          if (isMaster) {
            appendToAOF(`ZREM ${key} ${members.join(" ")}`);
            replicate(command, args);
          }
          return sortedSets.zrem(store, key, ...members);
        } catch (err) {
          return `ERR ${err.message}`;
        }
      }

      case "ZRANGEBYSCORE": {
        const [key, min, max] = args;
        if (!key || min === undefined || max === undefined)
          return "ERR wrong number of arguments for ZRANGEBYSCORE";

        try {
          const result = sortedSets.zrangebyscore(store, key, min, max);
          if (result.length === 0) return "(empty array)";
          return result.map((val, i) => `${i + 1}) "${val}"`).join("\n");
        } catch (err) {
          return `ERR ${err.message}`;
        }
      }

      // Streams block
      case "XADD": {
        const [key, id, ...fieldValues] = args;
        if (!key || !id || fieldValues.length % 2 !== 0) {
          return "ERR wrong number of arguments for XADD";
        }

        try {
          if (isMaster) {
            appendToAOF(`XADD ${key} ${id} ${fieldValues.join(" ")}`);
            replicate("XADD", [key, id, ...fieldValues]);
          }
          return streams.xadd(store, key, id, ...fieldValues);
        } catch (err) {
          return `ERR ${err.message}`;
        }
      }

      case "XRANGE": {
        const [key, start, end] = args;
        if (!key || start === undefined || end === undefined)
          return "ERR wrong number of arguments for XRANGE";

        try {
          const result = streams.xrange(store, key, start, end);
          if (!result || result.length === 0) return "(empty array)";
          return result
            .map(
              ([id, fields], i) =>
                `${i + 1}) ["${id}", ${JSON.stringify(fields)}]`
            )
            .join("\n");
        } catch (err) {
          return `ERR ${err.message}`;
        }
      }

      case "XLEN": {
        const [key] = args;
        if (!key) return "ERR wrong number of arguments for XLEN";

        try {
          return streams.xlen(store, key);
        } catch (err) {
          return `ERR ${err.message}`;
        }
      }

      case "XREAD": {
        const streamsIndex = args.indexOf("STREAMS");
        if (streamsIndex === -1 || streamsIndex === args.length - 1) {
          return "ERR syntax error";
        }

        const streamKeys = args.slice(streamsIndex + 1, streamsIndex + 2);
        const ids = args.slice(streamsIndex + 2);
        if (streamKeys.length !== ids.length) {
          return "ERR wrong number of arguments for XREAD STREAMS";
        }

        try {
          const result = streams.xread(store, null, null, {
            streams: streamKeys.map((key, i) => [key, ids[i]]),
          });

          if (!result || result.length === 0) return "(empty array)";
          return JSON.stringify(result);
        } catch (err) {
          return `ERR ${err.message}`;
        }
      }

      case "XGROUP": {
        const subcommand = args[0]?.toUpperCase();
        if (subcommand === "CREATE") {
          const [_, key, group, id] = args;
          if (!key || !group || !id)
            return "ERR wrong number of arguments for XGROUP CREATE";
          try {
            if (isMaster) {
              appendToAOF(`XGROUP CREATE ${key} ${group} ${id}`);
              replicate(command, args);
            }
            return streams.xgroupCreate(store, key, group, id);
          } catch (err) {
            return `ERR ${err.message}`;
          }
        }

        return "ERR unknown subcommand for XGROUP";
      }

      case "XREADGROUP": {
        const [_, group, consumer, , ...rest] = args;
        const streamsIndex = rest.indexOf("STREAMS");
        if (
          !group ||
          !consumer ||
          streamsIndex === -1 ||
          streamsIndex === rest.length - 1
        ) {
          return "ERR wrong number of arguments for XREADGROUP";
        }

        const streamKeys = rest.slice(streamsIndex + 1, streamsIndex + 2);
        const ids = rest.slice(streamsIndex + 2);
        if (streamKeys.length !== ids.length) {
          return "ERR wrong number of streams/ids in XREADGROUP";
        }

        try {
          const result = streams.xreadgroup(store, group, consumer, {
            streams: streamKeys.map((key, i) => [key, ids[i]]),
          });

          if (!result || result.length === 0) return "(empty array)";
          return JSON.stringify(result);
        } catch (err) {
          return `ERR ${err.message}`;
        }
      }

      case "XACK": {
        const [key, group, ...ids] = args;
        if (!key || !group || ids.length === 0)
          return "ERR wrong number of arguments for XACK";
        try {
          if (isMaster) {
            appendToAOF(`XACK ${key} ${group} ${ids}`);
            replicate(command, args);
          }
          return streams.xack(store, key, group, ...ids);
        } catch (err) {
          return `ERR ${err.message}`;
        }
      }

      // Bitmaps block

      case "SETBIT": {
        const [key, offsetStr, bitStr] = args;
        if (!key || offsetStr === undefined || bitStr === undefined)
          return "ERR wrong number of arguments for SETBIT";

        const offset = parseInt(offsetStr, 10);
        const bit = parseInt(bitStr, 10);

        if (isNaN(offset) || offset < 0)
          return "ERR bit offset is not an integer or out of range";
        if (bit !== 0 && bit !== 1) return "ERR bit is not 0 or 1";

        try {
          if (isMaster) {
            appendToAOF(`BITSET ${key} ${offsetStr} ${bitStr}`);
            replicate(command, args);
          }
          return bitmaps.setbit(store, key, offset, bit);
        } catch (err) {
          return `ERR ${err.message}`;
        }
      }

      case "GETBIT": {
        const [key, offsetStr] = args;
        if (!key || offsetStr === undefined)
          return "ERR wrong number of arguments for GETBIT";

        const offset = parseInt(offsetStr, 10);
        if (isNaN(offset) || offset < 0)
          return "ERR bit offset is not an integer or out of range";

        try {
          return bitmaps.getbit(store, key, offset);
        } catch (err) {
          return `ERR ${err.message}`;
        }
      }

      case "BITCOUNT": {
        const [key, startStr, endStr] = args;
        if (!key) return "ERR wrong number of arguments for BITCOUNT";

        try {
          if (startStr !== undefined && endStr !== undefined) {
            const start = parseInt(startStr, 10);
            const end = parseInt(endStr, 10);
            return bitmaps.bitcount(store, key, start, end);
          } else {
            return bitmaps.bitcount(store, key);
          }
        } catch (err) {
          return `ERR ${err.message}`;
        }
      }

      case "BITOP": {
        const [opRaw, destKey, ...srcKeys] = args;
        if (!opRaw || !destKey || srcKeys.length === 0)
          return "ERR wrong number of arguments for BITOP";

        const op = opRaw.toUpperCase();
        try {
          if (isMaster) replicate(command, args);
          return bitmaps.bitop(store, op, destKey, ...srcKeys);
        } catch (err) {
          return `ERR ${err.message}`;
        }
      }

      // Geospatial Block
      case "GEOADD": {
        const [key, lonStr, latStr, member] = args;
        if (!key || !lonStr || !latStr || !member)
          return "ERR wrong number of arguments for GEOADD";

        const lon = parseFloat(lonStr);
        const lat = parseFloat(latStr);
        if (isNaN(lon) || isNaN(lat))
          return "ERR invalid longitude or latitude";

        try {
          if (isMaster) {
            appendToAOF(`GEOADD ${key} ${lonStr} ${latStr} ${member}`);
            replicate(command, args);
          }
          return geo.geoadd(store, key, lon, lat, member);
        } catch (err) {
          return `ERR ${err.message}`;
        }
      }

      case "GEODIST": {
        const [key, m1, m2, unit = "m"] = args;
        if (!key || !m1 || !m2)
          return "ERR wrong number of arguments for GEODIST";

        try {
          const result = geo.geodist(store, key, m1, m2, unit);
          return result !== null ? result : null;
        } catch (err) {
          return `ERR ${err.message}`;
        }
      }

      case "GEOSEARCH": {
        const [
          key,
          fromKeyword,
          fromMember,
          byKeyword,
          radiusStr,
          unitOrFlag,
          ...rest
        ] = args;

        if (
          !key ||
          fromKeyword?.toUpperCase() !== "FROMMEMBER" ||
          !fromMember ||
          byKeyword?.toUpperCase() !== "BYRADIUS" ||
          !radiusStr
        )
          return "ERR syntax error";

        const radius = parseFloat(radiusStr);
        if (isNaN(radius)) return "ERR invalid radius";

        let unit = "m";
        const flags = [];

        if (unitOrFlag && ["m", "km", "mi", "ft"].includes(unitOrFlag)) {
          unit = unitOrFlag;
          flags.push(...rest);
        } else {
          flags.push(unitOrFlag, ...rest);
        }

        const options = {
          withDist: flags.includes("WITHDIST"),
          withCoord: flags.includes("WITHCOORD"),
        };

        if (flags.includes("ASC")) options.sort = "ASC";
        if (flags.includes("DESC")) options.sort = "DESC";

        try {
          return geo.geosearch(store, key, fromMember, radius, unit, options);
        } catch (err) {
          return `ERR ${err.message}`;
        }
      }

      // Bitfields block
      case "BITFIELD": {
        const [key, ...subcommands] = args;

        if (!key || subcommands.length === 0) {
          return "ERR wrong number of arguments for 'BITFIELD' command";
        }

        try {
          if (isMaster) replicate(command, args);
          const result = bitfields.handle(store, key, subcommands);

          // Append to AOF here after successful execution
          if (isMaster) {
            // Append each subcommand separately
            // Because BITFIELD can have multiple subcommands (GET, SET, INCRBY)
            let i = 0;
            while (i < subcommands.length) {
              const op = subcommands[i]?.toUpperCase();
              if (op === "GET") {
                i += 3; // GET key type offset — no AOF since it's read-only
              } else if (op === "SET") {
                const type = subcommands[i + 1];
                const offsetStr = subcommands[i + 2];
                const valueStr = subcommands[i + 3];
                appendToAOF("BITFIELD", [
                  key,
                  "SET",
                  type,
                  offsetStr,
                  valueStr,
                ]);
                i += 4;
              } else if (op === "INCRBY") {
                const type = subcommands[i + 1];
                const offsetStr = subcommands[i + 2];
                const incrementStr = subcommands[i + 3];
                appendToAOF("BITFIELD", [
                  key,
                  "INCRBY",
                  type,
                  offsetStr,
                  incrementStr,
                ]);
                i += 4;
              } else {
                i++; // unknown subcommand, just skip or throw error earlier
              }
            }
          }

          return result;
        } catch (err) {
          return `ERR ${err.message}`;
        }
      }

      // 📦 HyperLogLog
      case "PFADD": {
        const [key, ...elements] = args;
        if (!key || elements.length === 0)
          return "ERR wrong number of arguments for 'PFADD' command";

        try {
          const result = hyperloglog.pfadd(store, key, elements);
          if (isMaster && result === 1) {
            appendToAOF(`PFADD ${key} ${elements.join(" ")}`);
            replicate("PFADD", [key, ...elements]);
          }
          return result;
        } catch (err) {
          return `ERR ${err.message}`;
        }
      }

      case "PFCOUNT": {
        const keys = args;
        if (keys.length === 0)
          return "ERR wrong number of arguments for 'PFCOUNT' command";

        try {
          return hyperloglog.pfcount(store, keys);
        } catch (err) {
          return `ERR ${err.message}`;
        }
      }

      case "PFMERGE": {
        const [destKey, ...sourceKeys] = args;
        if (!destKey || sourceKeys.length === 0)
          return "ERR wrong number of arguments for 'PFMERGE' command";

        try {
          const result = hyperloglog.pfmerge(store, destKey, sourceKeys);
          if (isMaster) {
            appendToAOF(`PFMERGE ${destKey} ${sourceKeys.join(" ")}`);
            replicate("PFMERGE", [destKey, ...sourceKeys]);
          }
          return result;
        } catch (err) {
          return `ERR ${err.message}`;
        }
      }

      // Bloom Filters
      case "BF.RESERVE": {
        const [key, errorRateStr, capacityStr] = args;
        if ([key, errorRateStr, capacityStr].some((v) => v === undefined))
          return "ERR wrong number of arguments";
        if (isMaster) {
          appendToAOF(`BF.RESERVE ${key} ${errorRateStr} ${capacityStr}`);
          replicate(command, args);
        }
        return bloomfilter.reserve(store, key, errorRateStr, capacityStr);
      }

      case "BF.ADD": {
        const [key, value] = args;
        const result = bloomfilter.add(store, key, value);
        if (typeof result === "string") return result;
        if (isMaster && typeof result !== "string") {
          logAOF("BF.ADD", [key, value]);
          replicate("BF.ADD", [key, value]);
        }
        return result;
      }

      case "BF.EXISTS": {
        const [key, value] = args;
        return bloomfilter.exists(store, key, value);
      }

      // Cuckoo Filters
      case "CF.RESERVE": {
        const [key, capacityStr] = args;
        if (!key || !capacityStr) return "ERR wrong number of arguments";
        const result = cuckoo.reserve(store, key, capacityStr);
        if (isMaster && result === "OK") {
          appendToAOF("CF.RESERVE", [key, capacityStr]);
        }
        return result;
      }
      case "CF.ADD": {
        const [key, item] = args;
        if (!key || !item) return "ERR wrong number of arguments";
        if (isMaster) replicate("CF.ADD", [key, item]);
        const result = cuckoo.add(store, key, item);
        if (isMaster && result === 1) {
          // success returns 1
          appendToAOF("CF.ADD", [key, item]);
        }
        return result;
      }
      case "CF.EXISTS": {
        const [key, item] = args;
        if (!key || !item) return "ERR wrong number of arguments";
        return cuckoo.exists(store, key, item);
      }
      case "CF.DEL": {
        const [key, item] = args;
        if (!key || !item) return "ERR wrong number of arguments";
        if (isMaster) replicate(command, args);
        const result = cuckoo.del(store, key, item);
        if (isMaster && result === 1) {
          appendToAOF("CF.DEL", [key, item]);
        }
        return result;
      }

      // Time Series
      case "TS.CREATE": {
        const [key, ...args] = args;
        if (!key) return "ERR wrong number of arguments for 'TS.CREATE'";
        if (isMaster) replicate(command, args);
        const result = timeseries.create(store, key, ...args);
        if (isMaster && result === "OK") {
          // Include retention if provided
          const retentionArgIndex = args.findIndex(
            (arg) => arg.toUpperCase() === "RETENTION"
          );
          if (retentionArgIndex !== -1 && args.length > retentionArgIndex + 1) {
            appendToAOF("TS.CREATE", [
              key,
              "RETENTION",
              args[retentionArgIndex + 1],
            ]);
          } else {
            appendToAOF("TS.CREATE", [key]);
          }
        }
        return result;
      }

      case "TS.ADD": {
        const [key, timestamp, value] = args;
        if (!key || !timestamp || !value)
          return "ERR wrong number of arguments for 'TS.ADD'";
        if (isMaster) replicate("TS.ADD", [key, timestamp, value]);
        const result = timeseries.add(store, key, timestamp, value);
        if (isMaster && !result.toLowerCase().startsWith("err")) {
          appendToAOF("TS.ADD", [key, timestamp, value]);
        }
        return result;
      }

      case "TS.RANGE": {
        const [key, from, to, ...rest] = args;
        if (!key || !from || !to) return "ERR wrong number of arguments";

        if (rest.length === 0) {
          return timeseries.range(store, key, from, to);
        }

        if (rest.length !== 3 || rest[0].toUpperCase() !== "AGGREGATION") {
          return "ERR syntax error";
        }

        const [_, aggType, timeBucket] = rest;
        return timeseries.range(
          store,
          key,
          from,
          to,
          "AGGREGATION",
          aggType,
          timeBucket
        );
      }

      case "TS.GET": {
        const [key] = args;
        if (!key) return "ERR wrong number of arguments for 'TS.GET'";
        return timeseries.get(store, key);
      }

      // Monitoring
      case "INFO":
        result = getInfo(store);
        break;

      case "SLOWLOG": {
        return getSlowlog() || "empty";
      }

      // Vector Commands
      case "VECTOR.SET": {
        const [key, vectorString] = args;
        if (!key || !vectorString)
          return "ERR wrong number of arguments for 'VECTOR.SET'";
        const result = vector.set(args);
        if (isMaster && result === "OK") {
          appendToAOF("VECTOR.SET", args);
        }
        return result;
      }

      case "VECTOR.GET": {
        const [key] = args;
        if (!key) return "ERR wrong number of arguments for 'VECTOR.GET'";
        return vector.get(args);
      }

      case "VECTOR.SEARCH": {
        if (args.length !== 2 && args.length !== 4)
          return "ERR wrong number of arguments for 'VECTOR.SEARCH'";
        return vector.search(args);
      }

      case "VECTOR.DIST": {
        if (args.length !== 2 && args.length !== 4)
          return "ERR wrong number of arguments for 'VECTOR.DIST'";
        return vector.dist(args);
      }

      // Document DB Commands
      case "DOC.SET":
      case "DOC.GET":
      case "DOC.DEL":
      case "DOC.UPDATE":
      case "DOC.ARRAPPEND":
      case "DOC.INDEX":
      case "DOC.FIND":
      case "DOC.AGGREGATE":
      case "DOC.QUERY": {
        const handler = documents[command];
        if (
          isMaster &&
          !["DOC.GET", "DOC.FIND", "DOC.AGGREGATE", "DOC.QUERY"].includes(
            command
          )
        ) {
          appendToAOF(`${command} ${args.join(" ")}`);
          replicate(command, args);
        }
        return handler(args);
      }

      case "EVAL": {
        if (args.length < 2) return "ERR wrong number of arguments for 'EVAL'";

        const [scriptRaw, numKeysRaw, ...rest] = args;
        const script = scriptRaw.startsWith('"')
          ? scriptRaw.slice(1, -1)
          : scriptRaw;
        const numKeys = parseInt(numKeysRaw, 10);

        if (isNaN(numKeys) || numKeys < 0) return "ERR invalid number of keys";

        const keys = rest.slice(0, numKeys);
        const argVals = rest.slice(numKeys);

        return runLuaScript(script, keys, argVals, store);
      }

      // Cluster
      case "CLUSTER": {
        const subcommand = args[0]?.toUpperCase();

        switch (subcommand) {
          case "KEYSLOT": {
            if (args.length !== 2)
              return "ERR wrong number of arguments for 'CLUSTER KEYSLOT'";
            return cluster.getSlotForKey(args[1]);
          }

          case "SLOTS": {
            const slots = cluster.getClusterSlots();
            return slots.map(
              (entry) => `${entry.nodeId} [${entry.slots[0]}-${entry.slots[1]}]`
            );
          }
          default:
            return `ERR unknown subcommand '${subcommand}' for CLUSTER`;
        }
      }

      default:
        result = `ERR unknown command '${command}'`;
        break;
    }

    const duration = Date.now() - start;
    logIfSlow(`${command} ${(args || []).join(" ")}`, duration);

    return result;
  } catch (err) {
    const duration = Date.now() - start;
    logIfSlow(`${command} ${(args || []).join(" ")}`, duration);
    return `ERR ${err.message}`;
  }
};
