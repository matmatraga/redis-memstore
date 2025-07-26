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

// Strings
benchmarkCommand("SET", (i) => ["key" + i, "value" + i]);
benchmarkCommand("GET", (i) => ["key" + i]);

// Hashes
benchmarkCommand("HSET", (i) => ["myhash" + (i % 100), "field" + i, i]);
benchmarkCommand("HGET", (i) => ["myhash" + (i % 100), "field" + i]);

// Sets
benchmarkCommand("SADD", (i) => ["myset", "val" + i]);
benchmarkCommand("SMEMBERS", () => ["myset"]);

// Lists
benchmarkCommand("LPUSH", (i) => ["mylist", "val" + i]);
benchmarkCommand("LRANGE", () => ["mylist", "0", "10"]);

// Sorted Sets
benchmarkCommand("ZADD", (i) => ["myzset", i.toString(), "val" + i]);
benchmarkCommand("ZRANGE", () => ["myzset", "0", "10"]);

// JSON
benchmarkCommand("JSON.SET", (i) => ["myjson", "$.key" + i, JSON.stringify(i)]);
benchmarkCommand("JSON.GET", (i) => ["myjson", "$.key" + i]);

// Streams
benchmarkCommand("XADD", (i) => ["mystream", "*", "key", i]);
benchmarkCommand("XRANGE", () => ["mystream", "0-0"]);

// Bitmaps
benchmarkCommand("SETBIT", (i) => ["mybitmap", i.toString(), "1"]);
benchmarkCommand("GETBIT", (i) => ["mybitmap", i.toString()]);

// Geospatial
benchmarkCommand("GEOADD", (i) => ["mygeo", "12.34", "56.78", "loc" + i]);
benchmarkCommand("GEODIST", () => ["mygeo", "loc0", "loc1", "km"]);

// Bitfields (newly added)
benchmarkCommand("BITFIELD", (i) => ["bfkey", "SET", "i8", i % 10, i]);
benchmarkCommand("BITFIELD", (i) => ["bfkey", "GET", "i8", i % 10]);
benchmarkCommand("BITFIELD", (i) => ["bfkey", "INCRBY", "i8", i % 10, "1"]);

// HyperLogLog
benchmarkCommand("PFADD", (i) => ["hll", `user${i}`]);
benchmarkCommand("PFCOUNT", () => ["hll"]);
benchmarkCommand("PFMERGE", () => ["merged", "hll", "hll"]);

// 🔍 Bloom Filters
benchmarkCommand("BF.RESERVE", () => ["bf1", "0.01", "1000"]);
benchmarkCommand("BF.ADD", (i) => ["bf1", "item" + i]);
benchmarkCommand("BF.EXISTS", (i) => ["bf1", "item" + i]);

console.log("\n🎉 All benchmarks completed!");
