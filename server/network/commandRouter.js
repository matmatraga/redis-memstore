// server/network/commandRouter.js

const store = require("../core/datastore");
const strings = require("../core/types/strings");
const json = require("../core/types/json");
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

    default:
      return `ERR unknown command '${commandRaw}'`;
  }
};
