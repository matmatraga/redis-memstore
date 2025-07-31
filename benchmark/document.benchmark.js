const handleCommand = require("../server/network/commandRouter");

const totalOps = 100000;

async function runDocumentBenchmarks() {
  console.log("\n⏱️ Benchmarking Document Commands");

  await benchmarkCommand("DOC.SET", (i) => [
    "doc" + i,
    JSON.stringify({ name: "User" + i, age: i % 100, skills: ["Node", "JS"] }),
  ]);
  await benchmarkCommand("DOC.GET", (i) => ["doc" + i, "$.name"]);
  await benchmarkCommand("DOC.UPDATE", (i) => [
    "doc" + i,
    "$.age",
    ((i % 100) + 1).toString(),
  ]);
  await benchmarkCommand("DOC.ARRAPPEND", (i) => [
    "doc" + i,
    "$.skills",
    "Redis",
  ]);
  await handleCommand({ command: "DOC.INDEX", args: ["age"] });
  await benchmarkCommand("DOC.FIND", (i) => [
    "age",
    ((i % 100) + 1).toString(),
  ]);
  await benchmarkCommand("DOC.AGGREGATE", () => ["AVG", "age"]);
  await benchmarkCommand("DOC.QUERY", () => ["age", ">", "50"]);
}

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

module.exports = { runDocumentBenchmarks };
