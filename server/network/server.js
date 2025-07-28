// server/network/server.js
const net = require("net");
const readline = require("readline");
const { commandParser } = require("./commandParser");
const routeCommand = require("./commandRouter");
const {
  loadAOF,
  loadSnapshot,
  saveSnapshot,
} = require("../services/persistenceService");
const {
  getRole,
  handleSlaveConnection,
} = require("../services/replicationService");

function replayAOF() {
  const commands = loadAOF();
  console.log(`🔁 Replaying ${commands.length} AOF commands...`);
  for (const line of commands) {
    try {
      const { command, args } = commandParser(line);
      routeCommand({ command, args });
    } catch (err) {
      console.error(`❌ Error replaying: ${line}`, err.message);
    }
  }
}

function startTCPServer(port = 6379) {
  loadSnapshot();

  if (getRole() === "master") {
    replayAOF();

    const server = net.createServer((socket) => {
      // Simple CLI over TCP for clients
      socket.write("Welcome to Redis-like server! Type your commands:\n");
      const rl = readline.createInterface({ input: socket, output: socket });

      rl.on("line", async (line) => {
        const parsed = commandParser(line);
        const result = await routeCommand(parsed);

        if (Array.isArray(result)) {
          result.forEach((item, i) => {
            if (typeof item === "number") {
              socket.write(`${i + 1}) (integer) ${item}\n`);
            } else {
              socket.write(`${i + 1}) ${item}\n`);
            }
          });
        } else {
          socket.write(result + "\n");
        }
      });

      socket.on("close", () => rl.close());
    });

    server.listen(port, () => {
      console.log(`🚀 Redis-like master node running on port ${port}`);
    });
  } else {
    console.log(`🛰️ Redis-like slave node running (no TCP listener)`);
  }

  setInterval(() => {
    saveSnapshot();
  }, 30000);
}

module.exports = startTCPServer;
