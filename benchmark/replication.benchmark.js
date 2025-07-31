const { performance } = require("perf_hooks");
const datastore = require("../server/core/datastore");

function generateFakeSnapshot(size) {
  const data = {};
  for (let i = 0; i < size; i++) {
    data[`key${i}`] = `val${i}`;
  }
  return JSON.stringify({ data, expirations: {} });
}

async function runReplicationBenchmarks() {
  console.log("\n🔁 Benchmarking Replication Snapshot Import\n");

  const sizes = [1000, 10_000, 50_000];
  for (const size of sizes) {
    const snapshot = generateFakeSnapshot(size);
    const start = performance.now();

    datastore.importSnapshot(snapshot);

    const end = performance.now();
    const duration = end - start;
    console.log(
      `Imported snapshot with ${size} keys in ${duration.toFixed(2)}ms (${(
        size / duration
      ).toFixed(2)} keys/ms)`
    );
  }

  console.log("✅ Replication benchmarks completed.\n");
}

module.exports = { runReplicationBenchmarks };
