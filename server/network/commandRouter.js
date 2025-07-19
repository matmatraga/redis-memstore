// server/network/commandRouter.js
const store = require('../core/datastore');
module.exports = function routeCommand({ command, args }) {
  switch (command) {
    case 'SET': {
      const [key, ...rest] = args;
      if (!key || rest.length === 0) return 'ERR wrong number of arguments for SET';
      const value = rest.join(' ');
      return store.set(key, value);
    }
    case 'GET': {
      const [key] = args;
      if (!key) return 'ERR wrong number of arguments for GET';
      const result = store.get(key);
      return result !== null ? result : '(nil)';
    }
    case 'EXISTS': {
      const [key] = args;
      if (!key) return 'ERR wrong number of arguments for EXISTS';
      return store.exists(key);
    }
    case 'DEL': {
      const [key] = args;
      if (!key) return 'ERR wrong number of arguments for DEL';
      return store.del(key);
    }
    default:
      return `ERR unknown command '${command}'`;
  }
};