// client/replClient.js
const net = require("net");
const readline = require("readline");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: "redis-like> ",
});

const client = net.createConnection({ port: 6379, host: "127.0.0.1" }, () => {
  console.log("✅ Connected to Redis-like server (TCP)");
  rl.prompt();
});

client.on("data", (data) => {
  process.stdout.write(data.toString());
  rl.prompt();
});

client.on("end", () => {
  console.log("\n🔌 Disconnected from Redis-like server.");
  process.exit(0);
});

client.on("error", (err) => {
  console.error("❌ Connection error:", err.message);
  process.exit(1);
});

rl.on("line", (line) => {
  client.write(line.trim() + "\n");
});
