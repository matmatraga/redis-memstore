const { performance } = require("perf_hooks");
const handleCommand = require("../server/network/commandRouter");
const pubsub = require("../server/services/pubsubService");

const { runVectorBenchmarks } = require("./vector.benchmark");
const { runDocumentBenchmarks } = require("./document.benchmark");
const { runReplicationBenchmarks } = require("./replication.benchmark");
const { runLuaClusterBenchmarks } = require("./lua.cluster.benchmark");
const { runMLInterfaceBenchmarks } = require("./mlInterface.benchmark");
const { runSecurityBenchmarks } = require("./security.benchmark");
const { runPerformanceBenchmarks } = require("./performance.benchmark");

const totalOps = 100000;

async function benchmarkCommand(command, argsFactory) {
  const start = performance.now();
  for (let i = 0; i < totalOps; i++) {
    const args = argsFactory(i);
    await handleCommand({ command, args });
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

(async () => {
  console.log("\n🧪 Running in-memory benchmarks for Redis-like clone\n");

  // Strings
  await benchmarkCommand("SET", (i) => ["key" + i, "value" + i]);
  await benchmarkCommand("GET", (i) => ["key" + i]);

  // Hashes
  await benchmarkCommand("HSET", (i) => ["myhash" + (i % 100), "field" + i, i]);
  await benchmarkCommand("HGET", (i) => ["myhash" + (i % 100), "field" + i]);

  // Sets
  await benchmarkCommand("SADD", (i) => ["myset", "val" + i]);
  await benchmarkCommand("SMEMBERS", () => ["myset"]);

  // Lists
  await benchmarkCommand("LPUSH", (i) => ["mylist", "val" + i]);
  await benchmarkCommand("LRANGE", () => ["mylist", "0", "10"]);

  // Sorted Sets
  await benchmarkCommand("ZADD", (i) => ["myzset", i.toString(), "val" + i]);
  await benchmarkCommand("ZRANGE", () => ["myzset", "0", "10"]);

  // JSON
  await benchmarkCommand("JSON.SET", (i) => [
    "myjson",
    "$.key" + i,
    JSON.stringify(i),
  ]);
  await benchmarkCommand("JSON.GET", (i) => ["myjson", "$.key" + i]);

  // Streams
  await benchmarkCommand("XADD", (i) => ["mystream", "*", "key", i]);
  await benchmarkCommand("XRANGE", () => ["mystream", "0-0"]);

  // Bitmaps
  await benchmarkCommand("SETBIT", (i) => ["mybitmap", i.toString(), "1"]);
  await benchmarkCommand("GETBIT", (i) => ["mybitmap", i.toString()]);

  // Geospatial
  await benchmarkCommand("GEOADD", (i) => [
    "mygeo",
    "12.34",
    "56.78",
    "loc" + i,
  ]);
  await benchmarkCommand("GEODIST", () => ["mygeo", "loc0", "loc1", "km"]);

  // Bitfields
  await benchmarkCommand("BITFIELD", (i) => ["bfkey", "SET", "i8", i % 10, i]);
  await benchmarkCommand("BITFIELD", (i) => ["bfkey", "GET", "i8", i % 10]);
  await benchmarkCommand("BITFIELD", (i) => [
    "bfkey",
    "INCRBY",
    "i8",
    i % 10,
    "1",
  ]);

  // HyperLogLog
  await benchmarkCommand("PFADD", (i) => ["hll", `user${i}`]);
  await benchmarkCommand("PFCOUNT", () => ["hll"]);
  await benchmarkCommand("PFMERGE", () => ["merged", "hll", "hll"]);

  // Bloom Filters
  await benchmarkCommand("BF.RESERVE", () => ["bf1", "0.01", "1000"]);
  await benchmarkCommand("BF.ADD", (i) => ["bf1", "item" + i]);
  await benchmarkCommand("BF.EXISTS", (i) => ["bf1", "item" + i]);

  // Cuckoo Filter
  await benchmarkCommand("CF.RESERVE", () => ["cf1", "1000"]);
  await benchmarkCommand("CF.ADD", (i) => ["cf1", "item" + i]);
  await benchmarkCommand("CF.EXISTS", (i) => ["cf1", "item" + i]);
  await benchmarkCommand("CF.DEL", (i) => ["cf1", "item" + i]);

  // Time Series
  await benchmarkCommand("TS.CREATE", () => ["temp"]);
  await benchmarkCommand("TS.ADD", (i) => [
    "temp",
    (i * 100).toString(),
    (25 + (i % 5)).toString(),
  ]);
  await benchmarkCommand("TS.RANGE", () => [
    "temp",
    "0",
    (totalOps * 100).toString(),
  ]);
  await benchmarkCommand("TS.RANGE", () => [
    "temp",
    "0",
    (totalOps * 100).toString(),
    "AGGREGATION",
    "AVG",
    "1000",
  ]);
  await benchmarkCommand("TS.GET", () => ["temp"]);

  // Transactions
  console.log("\n⏱️ Benchmarking MULTI → EXEC Transactions");
  const iterations = 1000;
  const txStart = performance.now();
  for (let i = 0; i < iterations; i++) {
    await handleCommand({ command: "MULTI", args: [] });
    await handleCommand({ command: "SET", args: [`txkey${i}`, `${i}`] });
    await handleCommand({ command: "INCR", args: [`txkey${i}`] });
    await handleCommand({ command: "EXEC", args: [] });
  }

  const txEnd = performance.now();
  const txDuration = txEnd - txStart;
  const txOpsPerSec = (iterations / txDuration) * 1000;
  console.log(
    `MULTI/EXEC - Executed ${iterations} transactions in ${txDuration.toFixed(
      2
    )}ms => ${txOpsPerSec.toFixed(2)} tx/sec`
  );

  // Pub/Sub
  console.log("\n⏱️ Benchmarking Pub/Sub messaging");

  // Subscribe once to test channel
  let received = 0;
  const subscriber = () => received++;

  pubsub.subscribe("bench-channel", subscriber);

  console.time("Pub/Sub");
  for (let i = 0; i < totalOps; i++) {
    pubsub.publish("bench-channel", "message" + i);
  }
  console.timeEnd("Pub/Sub");

  pubsub.unsubscribe("bench-channel", subscriber);
  console.log(`Received: ${received}/${totalOps} messages`);

  // Monitoring & Management
  console.log("\n⏱️ Benchmarking Monitoring: INFO and SLOWLOG");
  await benchmarkCommand("INFO", () => []);
  await benchmarkCommand("SLOWLOG", () => []);

  // Modular Benchmarks
  await runVectorBenchmarks();
  await runDocumentBenchmarks();
  await runLuaClusterBenchmarks();
  await runMLInterfaceBenchmarks();
  await runSecurityBenchmarks();
  await runPerformanceBenchmarks();
  await runReplicationBenchmarks();

  console.log("\n🎉 All benchmarks completed!");
})();
