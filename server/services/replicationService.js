// server/services/replicationService.js
const net = require("net");
const store = require("../core/datastore");
const routeCommand = require("../network/commandRouter");

let role = "master"; // Default role
const connectedSlaves = new Set(); // Slave sockets

function setRole(newRole) {
  role = newRole;
}

function getRole() {
  return role;
}

// Called by master to forward writes to slaves
function forwardToSlaves(command, args) {
  if (role !== "master") return;

  const payload = JSON.stringify({ command, args });

  for (const socket of connectedSlaves) {
    socket.write(payload + "\n");
  }
}

// Slave connects to master, performs initial sync and listens
function connectToMaster(host, port = 6379) {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection(port, host, () => {
      console.log(`🔗 Connected to master at ${host}:${port}`);
    });

    let buffer = "";
    socket.on("data", async (chunk) => {
      buffer += chunk.toString();

      let newlineIndex;
      while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
        const line = buffer.slice(0, newlineIndex);
        buffer = buffer.slice(newlineIndex + 1);

        try {
          const { command, args } = JSON.parse(line);
          await routeCommand({ command, args }, true); // bypass replication
        } catch (err) {
          console.error("❌ Failed to apply command from master:", err.message);
        }
      }
    });

    socket.on("error", (err) => {
      console.error("❌ Connection error with master:", err.message);
      reject(err);
    });

    socket.on("end", () => {
      console.warn("⚠️ Disconnected from master");
    });

    resolve();
  });
}

// Called by master when a new slave connects
function handleSlaveConnection(socket) {
  console.log("📡 Slave connected");
  connectedSlaves.add(socket);

  // Initial sync: serialize all data
  const snapshot = store.exportSnapshot(); // exportSnapshot must return a JS object

  for (const key of Object.keys(snapshot)) {
    const value = snapshot[key];
    const payload = JSON.stringify({ command: "SET", args: [key, value] });
    socket.write(payload + "\n");
  }

  socket.on("end", () => {
    connectedSlaves.delete(socket);
    console.log("❌ Slave disconnected");
  });
}

module.exports = {
  setRole,
  getRole,
  forwardToSlaves,
  connectToMaster,
  handleSlaveConnection,
};
