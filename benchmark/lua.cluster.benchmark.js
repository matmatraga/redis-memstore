const { runLuaScript } = require("../server/core/luaEngine");
const cluster = require("../server/core/clusterManager");

async function runLuaClusterBenchmarks() {
  console.log("\n📊 Benchmarking Lua and Cluster");

  console.time("Lua EVAL");
  const store = new Map();
  for (let i = 0; i < 1000; i++) {
    runLuaScript("redis.set(KEYS[0], ARGV[0])", ["k" + i], ["v" + i], store);
  }
  console.timeEnd("Lua EVAL");

  console.time("Cluster Slot Resolution");
  cluster.assignSlots(["node-1", "node-2"]);
  for (let i = 0; i < 10000; i++) {
    cluster.getSlotForKey("key" + i);
    cluster.getNodeForKey("key" + i);
  }
  console.timeEnd("Cluster Slot Resolution");
}

module.exports = { runLuaClusterBenchmarks };
