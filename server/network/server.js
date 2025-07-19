// server/network/server.js
const readline = require("readline");
const commandParser = require("./commandParser");
const routeCommand = require("./commandRouter");

function startServer() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: "redis> ",
  });

  rl.prompt();

  rl.on("line", (input) => {
    const result = routeCommand(input);
    console.log(result);
    rl.prompt();
  }).on("close", () => {
    console.log("Bye!");
    process.exit(0);
  });
}

module.exports = startServer;
