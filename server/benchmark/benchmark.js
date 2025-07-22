// benchmark/benchmark.js
const { performance } = require("perf_hooks");
const handleCommand = require("../network/commandRouter");

const totalOps = 100000;

function benchmarkCommand(command, argsFactory) {
  const start = performance.now();

  for (let i = 0; i < totalOps; i++) {
    const args = argsFactory(i);
    handleCommand(command, args);
  }

  const end = performance.now();
  const duration = end - start;
  const opsPerSec = (totalOps / duration) * 1000;

  console.log(
    `${command} - Executed ${totalOps} operations in ${duration.toFixed(
      2
    )}ms => ${opsPerSec.toFixed(2)} ops/sec`
  );
}

console.log("\n🧪 Running in-memory benchmarks for Redis-like clone\n");

benchmarkCommand("SET", (i) => ["key" + i, "value" + i]);
benchmarkCommand("GET", (i) => ["key" + i]);
benchmarkCommand("HSET", (i) => ["myhash" + (i % 100), "field" + i, i]);
benchmarkCommand("HGET", (i) => ["myhash" + (i % 100), "field" + i]);
benchmarkCommand("SADD", (i) => ["myset", "val" + i]);
benchmarkCommand("SMEMBERS", () => ["myset"]);
benchmarkCommand("LPUSH", (i) => ["mylist", "val" + i]);
benchmarkCommand("LRANGE", () => ["mylist", "0", "10"]);
benchmarkCommand("ZADD", (i) => ["myzset", i.toString(), "val" + i]);
benchmarkCommand("ZRANGE", () => ["myzset", "0", "10"]);
benchmarkCommand("JSON.SET" + "JSON.GET", (i) => ["myjson", "$.key", i]);
benchmarkCommand("XADD", (i) => ["mystream", "*", "key", i]);
benchmarkCommand("XRANGE", () => ["mystream", "0-0"]);
benchmarkCommand("SETBIT", (i) => ["mybitmap", i, 1]);
benchmarkCommand("GETBIT", (i) => ["mybitmap", i]);
benchmarkCommand("GEOADD", (i) => ["mygeo", i.toString(), "12.34", "56.78"]);
benchmarkCommand("GEODIST", () => ["mygeo", "0", "1", "km"]);

console.log("\n🎉 All benchmarks completed!");
