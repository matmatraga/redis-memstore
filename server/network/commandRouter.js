// server/network/commandRouter.js

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

const {
  appendToAOF,
  saveSnapshot,
  loadAOF,
  bgSaveSnapshot,
} = require("../services/persistenceService");
module.exports = async function routeCommandRaw({ command, args }) {
  switch (command) {
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
      const setResult = store.set(key, value);
      appendToAOF(`SET ${key} ${value}`);
      return setResult;
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
      const delResult = store.del(args);
      appendToAOF(`DEL ${args.join(" ")}`);
      return delResult;
    }

    case "EXPIRE": {
      const [key, secondsStr] = args;
      if (!key || !secondsStr)
        return "ERR wrong number of arguments for EXPIRE";
      const seconds = parseInt(secondsStr, 10);
      if (isNaN(seconds) || seconds < 0) return "ERR invalid expiration time";
      appendToAOF(`EXPIRE ${key} ${secondsStr}`);
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

    // Strings block

    case "APPEND": {
      const [key, value] = args;
      if (!key || value === undefined)
        return "ERR wrong number of arguments for APPEND";
      try {
        appendToAOF(`APPEND ${args[0]} ${args[1]}`);
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
        return strings.incr(store, key);
      } catch (err) {
        return `ERR ${err.message}`;
      }
    }

    case "DECR": {
      const [key] = args;
      if (!key) return "ERR wrong number of arguments for DECR";
      try {
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
      appendToAOF(`JSON.SET ${key} ${path} ${valueParts}`);
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
      appendToAOF(`JSON.DEL ${key} ${path}`);
      return json.del(store, key, path);
    }

    case "JSON.ARRAPPEND": {
      const [key, path, ...values] = args;
      if (!key || !path || values.length === 0) {
        return "ERR wrong number of arguments for 'JSON.ARRAPPEND'";
      }

      return json.arrappend(store, key, path, ...values);
    }

    // Lists block

    case "LPUSH": {
      const [key, ...values] = args;
      if (!key || values.length === 0)
        return "ERR wrong number of arguments for LPUSH";
      try {
        appendToAOF(`LPUSH ${key} ${values.join(" ")}`);
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
        appendToAOF(`RPUSH ${key} ${values.join(" ")}`);
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
        appendToAOF(`LPOP ${args[0]}`);
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
        appendToAOF(`RPOP ${args[0]}`);
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
        appendToAOF(`LSET ${key} ${indexStr} ${value}`);
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
        appendToAOF(`SADD ${key} ${members.join(" ")}`);
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
        appendToAOF(`SREM ${key} ${members.join(" ")}`);
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
      if (args.length === 0) return "ERR wrong number of arguments for SUNION";
      try {
        return sets.sunion(store, ...args);
      } catch (err) {
        return `ERR ${err.message}`;
      }
    }

    case "SINTER": {
      if (args.length === 0) return "ERR wrong number of arguments for SINTER";
      try {
        return sets.sinter(store, ...args);
      } catch (err) {
        return `ERR ${err.message}`;
      }
    }

    case "SDIFF": {
      if (args.length === 0) return "ERR wrong number of arguments for SDIFF";
      try {
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
        appendToAOF(`HSET ${key} ${fieldValuePairs}`);
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
        appendToAOF(`HDEL ${key} ${fields.join(" ")}`);
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
        appendToAOF(`ZADD ${key} ${argsRest.join(" ")}`);
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
        appendToAOF(`ZREM ${key} ${members.join(" ")}`);
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
        appendToAOF(`XADD ${key} ${id} ${fieldValues}`);
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
        appendToAOF(`BITSET ${key} ${offsetStr} ${bitStr}`);
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
      if (isNaN(lon) || isNaN(lat)) return "ERR invalid longitude or latitude";

      try {
        appendToAOF(`GEOADD ${key} ${lonStr} ${latStr} ${member}`);
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
      const [key, fromKeyword, fromMember, byKeyword, radiusStr, unit = "m"] =
        args;
      if (
        !key ||
        fromKeyword !== "FROMMEMBER" ||
        !fromMember ||
        byKeyword !== "BYRADIUS" ||
        !radiusStr
      )
        return "ERR syntax error";

      const radius = parseFloat(radiusStr);
      if (isNaN(radius)) return "ERR invalid radius";

      try {
        return geo.geosearch(store, key, fromMember, radius, unit);
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
        return bitfields.handle(store, key, subcommands);
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
        if (result === 1) {
          appendToAOF(`PFADD ${key} ${elements.join(" ")}`);
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
        appendToAOF(`PFMERGE ${destKey} ${sourceKeys.join(" ")}`);
        return result;
      } catch (err) {
        return `ERR ${err.message}`;
      }
    }

    default:
      return `ERR unknown command '${command}'`;
  }
};
