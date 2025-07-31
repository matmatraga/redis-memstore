// benchmark/mlInterface.benchmark.js

const { performance } = require("perf_hooks");
const path = require("path");
const fs = require("fs");
const {
  exportVectorsToJSON,
  importVectorsFromJSON,
} = require("../server/utils/mlInterface");

const VECTOR_COUNT = 100000;
const VECTOR_DIM = 128;
const OUTPUT_FILE = path.join(__dirname, "vectors_benchmark.json");

// Generate mock vector data
const vectorMap = new Map();
for (let i = 0; i < VECTOR_COUNT; i++) {
  const vec = Array.from({ length: VECTOR_DIM }, () => Math.random());
  vectorMap.set("vec" + i, vec);
}

// Export benchmark
console.log("\n⏱️ Benchmarking ML Vector Export...");
const startExport = performance.now();
exportVectorsToJSON(OUTPUT_FILE, vectorMap);
const endExport = performance.now();
console.log(
  `✅ Exported ${VECTOR_COUNT} vectors in ${(endExport - startExport).toFixed(
    2
  )} ms`
);

// Import benchmark
console.log("\n⏱️ Benchmarking ML Vector Import...");
const startImport = performance.now();
const importedMap = importVectorsFromJSON(OUTPUT_FILE);
const endImport = performance.now();
console.log(
  `✅ Imported ${importedMap.size} vectors in ${(
    endImport - startImport
  ).toFixed(2)} ms`
);

// Cleanup
fs.unlinkSync(OUTPUT_FILE);
