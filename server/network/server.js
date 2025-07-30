const net = require("net");
const readline = require("readline");
const { commandParser } = require("./commandParser");
const routeCommand = require("./commandRouter");
const {
  loadAOF,
  loadSnapshot,
  saveSnapshot,
  setReplayingAOF,
} = require("../services/persistenceService");
const {
  getRole,
  handleSlaveConnection,
} = require("../services/replicationService");
const aclService = require("../services/aclService");
const { registerClient, unregisterClient } = require("../core/monitoring");
const { redisPassword } = require("../config");

const authStatus = new Map();
function replayAOF() {
  const commands = loadAOF();
  console.log(`🔁 Replaying ${commands.length} AOF commands...`);
  setReplayingAOF(true);

  for (const line of commands) {
    try {
      const { command, args } = commandParser(line);
      routeCommand({ command, args });
    } catch (err) {
      console.error(`❌ Error replaying: ${line}`, err.message);
    }
  }

  setReplayingAOF(false);
}

function startTCPServer(port = 6379) {
  loadSnapshot();

  if (getRole() === "master") {
    replayAOF();

    const server = net.createServer((socket) => {
      const clientId = `${socket.remoteAddress}:${socket.remotePort}`;
      registerClient(clientId);
      authStatus.set(socket, !redisPassword);

      socket.write(
        "Welcome to Redis-like server! Type your commands:\n",
        () => {
          const rl = readline.createInterface({
            input: socket,
            output: socket,
            prompt: "redis-like> ",
          });

          rl.prompt();

          rl.on("line", async (line) => {
            const trimmed = line.trim();
            if (!trimmed) return rl.prompt();

            const parsed = commandParser(trimmed);

            if (!aclService.getClientUser(clientId)) {
              if (parsed.command !== "AUTH") {
                socket.write("NOAUTH Authentication required\n");
                return rl.prompt();
              }

              const result = await routeCommand({ ...parsed, clientId });
              socket.write(result + "\n");
              return rl.prompt();
            }

            const result = await routeCommand({ ...parsed, clientId });

            // special case for ACL WHOAMI → just output string, no "OK"
            if (
              parsed.command.toUpperCase() === "ACL" &&
              parsed.args[0]?.toUpperCase() === "WHOAMI"
            ) {
              socket.write(result + "\n");
            } else if (Array.isArray(result)) {
              const output = result
                .map((item, i) =>
                  typeof item === "number"
                    ? `${i + 1}) (integer) ${item}`
                    : `${i + 1}) ${item}`
                )
                .join("\n");
              socket.write(output + "\n");
            } else if (typeof result === "number") {
              socket.write(`(integer) ${result}\n`);
            } else {
              socket.write(result + "\n");
            }

            rl.prompt();
          });

          socket.on("close", () => {
            unregisterClient(clientId);
            rl.close();
            authStatus.delete(socket);
          });
        }
      );
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
