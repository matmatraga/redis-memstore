// server/tlsServer.js
const tls = require("tls");
const fs = require("fs");
const readline = require("readline");
const { commandParser } = require("./commandParser");
const routeCommand = require("./commandRouter");
const { registerClient, unregisterClient } = require("../core/monitoring");

const options = {
  key: fs.readFileSync("tls/key.pem"),
  cert: fs.readFileSync("tls/cert.pem"),
};

function startTLSServer(port = 6380) {
  const server = tls.createServer(options, (socket) => {
    const clientId = `${socket.remoteAddress}:${socket.remotePort}`;
    registerClient(clientId);

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
      socket.write(result + "\n");
      rl.prompt();
    });

    socket.on("close", () => {
      unregisterClient(clientId);
      rl.close();
    });
  });

  server.listen(port, () => {
    console.log(`🔐 TLS server running on port ${port}`);
  });
}

module.exports = startTLSServer;
