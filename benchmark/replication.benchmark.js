// benchmark/replication.benchmark.js
const { performance } = require("perf_hooks");
const datastore = require("../server/core/datastore");

function generateFakeSnapshot(size) {
  const data = {};
  for (let i = 0; i < size; i++) {
    data[`key${i}`] = `val${i}`;
  }
  return JSON.stringify({ data, expirations: {} });
}

function benchmarkImportSnapshot(size) {
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

console.log("\n🔁 Benchmarking Replication Snapshot Import\n");
benchmarkImportSnapshot(1000);
benchmarkImportSnapshot(10_000);
benchmarkImportSnapshot(50_000);
console.log("✅ Replication benchmarks completed.\n");
