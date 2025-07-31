const tls = require("tls");
const fs = require("fs");
const readline = require("readline");

const options = {
  ca: fs.readFileSync("client/tls/cert.pem"),
  host: "127.0.0.1",
  port: 6380,
  rejectUnauthorized: false,
};

const socket = tls.connect(options, () => {
  console.log("✅ Connected to TLS-secured Redis-like server");
});

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: "redis-tls> ",
});

socket.on("data", (data) => {
  process.stdout.write(data.toString());
  rl.prompt();
});

rl.on("line", (line) => {
  socket.write(line.trim() + "\n");
});

socket.on("error", (err) => {
  console.error("❌ TLS Client Error:", err.message);
  process.exit(1);
});
