// Updated replicationService.js to support both TCP and TLS with snapshot sync and command forwarding
const tls = require("tls");
const net = require("net");
const fs = require("fs");
const config = require("../config");
const { exportSnapshot, importSnapshot } = require("../core/datastore");
const { commandParser } = require("../network/commandParser");
const routeCommandRaw = require("../network/commandRouter.core");

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
        await routeCommandRaw({ command, args, bypassTransaction: true });
      }
    }
  });

  socket.on("close", () => {
    const i = slaves.indexOf(socket);
    if (i !== -1) slaves.splice(i, 1);
  });
}

function connectToMaster(host, port = 6379, useTLS = true) {
  setRole("slave");

  const handleData = async (chunk) => {
    const lines = chunk.toString().split("\n").filter(Boolean);
    for (const line of lines) {
      if (line.startsWith("__SYNC__::")) {
        const snapshot = JSON.parse(line.replace("__SYNC__::", ""));
        importSnapshot(snapshot);
        console.log("✅ Initial snapshot synced from master");
      } else if (line.startsWith("__CMD__::")) {
        const { command, args } = JSON.parse(line.replace("__CMD__::", ""));
        await routeCommandRaw({ command, args, bypassTransaction: true });
      }
    }
  };

  const handleError = (err) => {
    console.error("❌ Replication error:", err.message);
  };

  const handleEnd = () => {
    console.warn("⚠️  Disconnected from master.");
  };

  if (useTLS) {
    const options = {
      host,
      port: config.tlsPort || 6380,
      key: fs.readFileSync("tls/key.pem"),
      cert: fs.readFileSync("tls/cert.pem"),
      rejectUnauthorized: false,
    };

    const socket = tls.connect(options, () => {
      console.log(
        "🔐 Connected to master via TLS at",
        `${host}:${options.port}`
      );
    });

    socket.on("data", handleData);
    socket.on("end", handleEnd);
    socket.on("error", handleError);
  } else {
    const socket = net.createConnection({ host, port }, () => {
      console.log("🔌 Connected to master via TCP at", `${host}:${port}`);
    });

    socket.on("data", handleData);
    socket.on("end", handleEnd);
    socket.on("error", handleError);
  }
}

module.exports = {
  getRole,
  setRole,
  handleSlaveConnection,
  connectToMaster,
  forwardToSlaves,
};
