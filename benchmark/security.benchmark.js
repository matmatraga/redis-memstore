const net = require("net");

const HOST = "127.0.0.1";
const PORT = 6379;
const ITERATIONS = 1000;

function send(socket, cmd) {
  return new Promise((resolve) => {
    let buffer = "";
    const onData = (chunk) => {
      buffer += chunk.toString();
      if (buffer.includes("\n")) {
        socket.off("data", onData);
        resolve(buffer.trim());
      }
    };
    socket.on("data", onData);
    socket.write(cmd + "\n");
  });
}

async function benchmarkAuthOnly() {
  const socket = net.createConnection({ host: HOST, port: PORT });
  await new Promise((res) => socket.once("data", res));

  const start = Date.now();
  for (let i = 0; i < ITERATIONS; i++) {
    await send(socket, "AUTH admin admin123");
  }
  const end = Date.now();
  socket.end();
  return end - start;
}

async function benchmarkAuthSet() {
  const socket = net.createConnection({ host: HOST, port: PORT });
  await new Promise((res) => socket.once("data", res));

  const start = Date.now();
  for (let i = 0; i < ITERATIONS; i++) {
    await send(socket, "AUTH admin admin123");
    await send(socket, `SET bench${i} value`);
  }
  const end = Date.now();
  socket.end();
  return end - start;
}

async function benchmarkSetOnly() {
  const socket = net.createConnection({ host: HOST, port: PORT });
  await new Promise((res) => socket.once("data", res));
  await send(socket, "AUTH admin admin123");

  const start = Date.now();
  for (let i = 0; i < ITERATIONS; i++) {
    await send(socket, `SET secure${i} value`);
  }
  const end = Date.now();
  socket.end();
  return end - start;
}

async function runSecurityBenchmarks() {
  console.log(`\n🔐 Running ACL benchmarks (${ITERATIONS} iterations)...`);

  const authOnly = await benchmarkAuthOnly();
  console.log(
    `AUTH-only: ${authOnly}ms (${(authOnly / ITERATIONS).toFixed(2)} ms/op)`
  );

  const authSet = await benchmarkAuthSet();
  console.log(
    `AUTH + SET: ${authSet}ms (${(authSet / ITERATIONS).toFixed(2)} ms/op)`
  );

  const setOnly = await benchmarkSetOnly();
  console.log(
    `SET (with ACL): ${setOnly}ms (${(setOnly / ITERATIONS).toFixed(2)} ms/op)`
  );
}

module.exports = { runSecurityBenchmarks };
