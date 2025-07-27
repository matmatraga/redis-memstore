
const { performance } = require("perf_hooks");
const handleCommand = require("../network/commandRouter");

const totalOps = 100000;

async function benchmarkCommand(command, argsFactory) {
  const start = performance.now();

  for (let i = 0; i < totalOps; i++) {
    const args = argsFactory(i);
    await handleCommand(command, args);
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
  await benchmarkCommand("JSON.SET", (i) => ["myjson", "$.key" + i, JSON.stringify(i)]);
  await benchmarkCommand("JSON.GET", (i) => ["myjson", "$.key" + i]);

  // Streams
  await benchmarkCommand("XADD", (i) => ["mystream", "*", "key", i]);
  await benchmarkCommand("XRANGE", () => ["mystream", "0-0"]);

  // Bitmaps
  await benchmarkCommand("SETBIT", (i) => ["mybitmap", i.toString(), "1"]);
  await benchmarkCommand("GETBIT", (i) => ["mybitmap", i.toString()]);

  // Geospatial
  await benchmarkCommand("GEOADD", (i) => ["mygeo", "12.34", "56.78", "loc" + i]);
  await benchmarkCommand("GEODIST", () => ["mygeo", "loc0", "loc1", "km"]);

  // Bitfields
  await benchmarkCommand("BITFIELD", (i) => ["bfkey", "SET", "i8", i % 10, i]);
  await benchmarkCommand("BITFIELD", (i) => ["bfkey", "GET", "i8", i % 10]);
  await benchmarkCommand("BITFIELD", (i) => ["bfkey", "INCRBY", "i8", i % 10, "1"]);

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
  await benchmarkCommand("TS.RANGE", () => ["temp", "0", (totalOps * 100).toString()]);
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
    await handleCommand("MULTI", []);
    await handleCommand("SET", [`txkey${i}`, `${i}`]);
    await handleCommand("INCR", [`txkey${i}`]);
    await handleCommand("EXEC", []);
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

  let received = 0;
  const subscriber = () => received++;

  // Subscribe once to test channel
  await handleCommand("SUBSCRIBE", ["bench-channel"]);
  const pubsub = require("../services/pubsubService");
  pubsub.subscribe("bench-channel", subscriber);

  const pubStart = performance.now();
  for (let i = 0; i < totalOps; i++) {
    await handleCommand("PUBLISH", ["bench-channel", "message" + i]);
  }
  const pubEnd = performance.now();

  pubsub.unsubscribe("bench-channel", subscriber);

  const pubDuration = pubEnd - pubStart;
  const pubOpsPerSec = (totalOps / pubDuration) * 1000;

  console.log(
    `PUBLISH - Executed ${totalOps} messages in ${pubDuration.toFixed(
      2
    )}ms => ${pubOpsPerSec.toFixed(2)} msg/sec`
  );
  console.log(`Received: ${received}/${totalOps} messages`);

  console.log("\n🎉 All benchmarks completed!");
})();
