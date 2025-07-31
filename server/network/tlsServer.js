// server/tlsServer.js
const tls = require("tls");
const fs = require("fs");
const readline = require("readline");
const { commandParser } = require("./commandParser");
const routeCommand = require("./commandRouter");
const { registerClient, unregisterClient } = require("../core/monitoring");
const socketRegistry = require("./socketRegistry");

const options = {
  key: fs.readFileSync("tls/key.pem"),
  cert: fs.readFileSync("tls/cert.pem"),
};

function startTLSServer(port = 6380) {
  const server = tls.createServer(options, (socket) => {
    const clientId = `${socket.remoteAddress}:${socket.remotePort}`;
    registerClient(clientId);
    socketRegistry.register(clientId, socket);

    socket.write("🔒 Welcome to TLS-secured Redis-like server!\n");

    const rl = readline.createInterface({
      input: socket,
      output: socket,
      prompt: "redis-tls> ",
    });

    rl.prompt();

    rl.on("line", async (line) => {
      const parsed = commandParser(line);
      const result = await routeCommand({ ...parsed, clientId });

      if (Array.isArray(result)) {
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

    rl.on("error", (err) => {
      console.warn("[Readline error]", err.message);
      rl.close();
    });

    socket.on("error", (err) => {
      if (err.code === "ECONNRESET") {
        console.warn("[Socket ECONNRESET] Client disconnected abruptly");
      } else {
        console.error("[Socket error]", err);
      }
    });

    socket.on("close", () => {
      unregisterClient(clientId);
      socketRegistry.unregister(clientId);
      rl.close();
    });
  });

  server.listen(port, () => {
    console.log(`🔐 TLS server running on port ${port}`);
  });
}

module.exports = startTLSServer;
