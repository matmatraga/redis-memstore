const net = require("net");
const readline = require("readline");

const client = net.createConnection({ host: "127.0.0.1", port: 6379 }, () => {
  console.log("📡 Connected to Redis-like server.\n");
  autoRefresh();
});

client.setEncoding("utf8");

function sendCommand(cmd) {
  return new Promise((resolve) => {
    client.once("data", (data) => resolve(data.trim()));
    client.write(cmd + "\r\n");
  });
}

async function autoRefresh() {
  while (true) {
    const info = await sendCommand("INFO");
    const slowlog = await sendCommand("SLOWLOG");

    console.clear();
    console.log("🖥️  Redis-like Monitoring Dashboard");
    console.log("=".repeat(40));
    console.log(info);

    console.log("\n📉 SLOWLOG Entries:");
    console.log(slowlog || "(empty)");

    await new Promise((r) => setTimeout(r, 3000));
  }
}

client.on("error", (err) => {
  console.error("❌ Monitoring client error:", err.message);
});
