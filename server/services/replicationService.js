// server/services/replicationService.js
const net = require("net");
const { exportSnapshot, importSnapshot } = require("../core/datastore");
const { commandParser } = require("../network/commandParser");
const routeCommand = require("../network/commandRouter");

let role = "master";
const slaves = [];

function getRole() {
  return role;
}

function setRole(newRole) {
  role = newRole;
}

function addSlave(socket) {
  slaves.push(socket);
  console.log(`🟢 New slave connected (${slaves.length} total)`);

  // 🔄 Send initial snapshot
  const snapshot = JSON.stringify(exportSnapshot());
  socket.write(`__SYNC__::${snapshot}\n`);
}

function forwardToSlaves(command, args) {
  const serialized = JSON.stringify({ command, args });
  for (const socket of slaves) {
    socket.write(`__CMD__::${serialized}\n`);
  }
}

function handleSlaveConnection(socket) {
  addSlave(socket);

  socket.on("data", async (chunk) => {
    const lines = chunk.toString().split("\n").filter(Boolean);
    for (const line of lines) {
      if (line.startsWith("__CMD__::")) {
        const { command, args } = JSON.parse(line.replace("__CMD__::", ""));
        await routeCommand({ command, args, bypassTransaction: true });
      }
    }
  });

  socket.on("close", () => {
    const i = slaves.indexOf(socket);
    if (i !== -1) slaves.splice(i, 1);
  });
}

function connectToMaster(host, port) {
  setRole("slave");
  const socket = net.createConnection({ host, port }, () => {
    console.log(`🔗 Connected to master at ${host}:${port}`);
  });

  socket.on("data", async (chunk) => {
    const lines = chunk.toString().split("\n").filter(Boolean);
    for (const line of lines) {
      if (line.startsWith("__SYNC__::")) {
        const snapshot = JSON.parse(line.replace("__SYNC__::", ""));
        importSnapshot(snapshot);
        console.log("✅ Initial snapshot synced from master");
      } else if (line.startsWith("__CMD__::")) {
        const { command, args } = JSON.parse(line.replace("__CMD__::", ""));
        await routeCommand({ command, args, bypassTransaction: true });
      }
    }
  });

  socket.on("close", () => {
    console.log("🔌 Disconnected from master.");
  });

  socket.on("error", (err) => {
    console.error("❌ Replication error:", err.message);
  });
}

module.exports = {
  getRole,
  setRole,
  handleSlaveConnection,
  connectToMaster,
  forwardToSlaves,
};
