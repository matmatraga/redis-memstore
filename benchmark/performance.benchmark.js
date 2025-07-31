const tls = require("tls");

const HOST = "127.0.0.1";
const PORT = 6380;
const ITERATIONS = 1000;

function sendCommand(socket, cmd) {
  return new Promise((resolve) => {
    let buffer = "";
    const handleData = (chunk) => {
      buffer += chunk.toString();
      if (buffer.includes("\n")) {
        socket.off("data", handleData);
        resolve(buffer.trim());
      }
    };
    socket.on("data", handleData);
    socket.write(cmd + "\n");
  });
}

async function benchmarkPipeline() {
  return new Promise((resolve, reject) => {
    const socket = tls.connect(
      { host: HOST, port: PORT, rejectUnauthorized: false },
      async () => {
        const start = Date.now();
        await sendCommand(socket, "AUTH admin admin123");
        await sendCommand(socket, "PIPELINE START");
        for (let i = 0; i < ITERATIONS; i++) {
          await sendCommand(socket, `SET pipekey${i} ${i}`);
        }
        await sendCommand(socket, "PIPELINE EXEC");
        const duration = Date.now() - start;
        socket.end();
        resolve(duration);
      }
    );

    socket.on("error", reject);
  });
}

async function runPerformanceBenchmarks() {
  console.log("\n⏱️ Benchmarking pipelined SET commands...");
  const time = await benchmarkPipeline();
  console.log(`📊 Time taken for ${ITERATIONS} pipelined SETs: ${time} ms`);
}

module.exports = { runPerformanceBenchmarks };
