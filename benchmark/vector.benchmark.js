const handleCommand = require("../server/network/commandRouter");

const totalOps = 100000;

async function runVectorBenchmarks() {
  console.log("\n⏱️ Benchmarking Vector Commands");

  await benchmarkCommand("VECTOR.SET", (i) => [
    "vec" + i,
    `[${(i % 100) + 1}, ${(i % 50) + 2}, ${(i % 25) + 3}]`,
  ]);
  await benchmarkCommand("VECTOR.DIST", (i) => [
    "vec0",
    "vec" + (i % 100),
    "DISTANCE",
    "euclidean",
  ]);
  await benchmarkCommand("VECTOR.SEARCH", () => [
    "vec0",
    "5",
    "DISTANCE",
    "cosine",
  ]);
}

// Reuse benchmarkCommand or import it from main
const { performance } = require("perf_hooks");

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

module.exports = { runVectorBenchmarks };
