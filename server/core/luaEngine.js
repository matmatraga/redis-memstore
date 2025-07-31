// core/luaEngine.js
const { VM } = require("vm2");

function runLuaScript(script, keys, args, datastore) {
  const sandbox = {
    KEYS: keys,
    ARGV: args,
    redis: {},
  };

  // Assign directly in sandbox to avoid closure
  sandbox.redis.get = (key) => {
    console.log("🧪 redis.get key =", key);
    const val = datastore.get(key);
    console.log("🧪 datastore.get(key) returned =", val);
    return val;
  };

  sandbox.redis.set = function (key, value) {
    datastore.set(key, value);
    return "OK";
  };

  sandbox.redis.del = function (key) {
    const existed = datastore.has(key);
    datastore.del(key);
    return existed ? 1 : 0;
  };

  sandbox.redis.exists = function (key) {
    return datastore.has(key) ? 1 : 0;
  };

  sandbox.redis.incr = function (key) {
    let val = parseInt(datastore.get(key) || "0", 10);
    val += 1;
    datastore.set(key, val.toString());
    return val;
  };

  sandbox.redis.decr = function (key) {
    let val = parseInt(datastore.get(key) || "0", 10);
    val -= 1;
    datastore.set(key, val.toString());
    return val;
  };

  const vm = new VM({ sandbox });

  try {
    const result = vm.run(`(() => { ${script} })()`);
    return result;
  } catch (err) {
    return `ERR ${err.message}`;
  }
}

module.exports = { runLuaScript };
