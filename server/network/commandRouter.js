// server/network/commandRouter.js

const store = require("../core/datastore");
const strings = require("../core/types/strings");
const json = require("../core/types/json");
const list = require("../core/types/lists");
const sets = require("../core/types/sets");
const hashes = require("../core/types/hashes");
const sortedSets = require("../core/types/sortedSets");
module.exports = function routeCommandRaw({ command, args }) {
  switch (command) {
    case "SET": {
      const [key, ...valueParts] = args;
      if (!key || valueParts.length === 0)
        return "ERR wrong number of arguments for SET";
      const value = valueParts.join(" ");
      return store.set(key, value);
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
      const [key] = args;
      if (!key) return "ERR wrong number of arguments for DEL";
      return store.del(key);
    }

    case "EXPIRE": {
      const [key, secondsStr] = args;
      if (!key || !secondsStr)
        return "ERR wrong number of arguments for EXPIRE";
      const seconds = parseInt(secondsStr, 10);
      if (isNaN(seconds) || seconds < 0) return "ERR invalid expiration time";
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

    case "APPEND": {
      const [key, value] = args;
      if (!key || value === undefined)
        return "ERR wrong number of arguments for APPEND";
      try {
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
        return strings.setrange(store, key, parseInt(offset), subStr);
      } catch (err) {
        return `ERR ${err.message}`;
      }
    }

    case "JSON.SET": {
      const [key, path, ...valueParts] = args;
      const valueStr = valueParts.join(" ");
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
      return json.del(store, key, path);
    }

    case "JSON.ARRAPPEND": {
      const [key, path, ...values] = args;
      if (!key || !path || values.length === 0) {
        return "ERR wrong number of arguments for 'JSON.ARRAPPEND'";
      }

      return json.arrappend(store, key, path, ...values);
    }

    case "LPUSH": {
      const [key, ...values] = args;
      if (!key || values.length === 0)
        return "ERR wrong number of arguments for LPUSH";
      try {
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
        return list.lset(store, key, index, value);
      } catch (err) {
        return `ERR ${err.message}`;
      }
    }

    case "SADD": {
      const [key, ...members] = args;
      if (!key || members.length === 0)
        return "ERR wrong number of arguments for SADD";
      try {
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

    case "HSET": {
      const [key, ...fieldValuePairs] = args;
      if (
        !key ||
        fieldValuePairs.length < 2 ||
        fieldValuePairs.length % 2 !== 0
      )
        return "ERR wrong number of arguments for HSET";

      try {
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

    case "ZADD": {
      const [key, ...argsRest] = args;
      if (!key || argsRest.length < 2)
        return "ERR wrong number of arguments for ZADD";

      try {
        const result = sortedSets.zadd(store, key, ...argsRest);
        if (result === null) return "(nil)";
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

    default:
      return `ERR unknown command '${commandRaw}'`;
  }
};
