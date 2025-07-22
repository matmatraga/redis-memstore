// server/network/server.js
const readline = require("readline");
const commandParser = require("./commandParser");
const routeCommand = require("./commandRouter");
const {
  loadAOF,
  loadSnapshot,
  saveSnapshot,
} = require("../services/persistenceService");

function replayAOF() {
  const commands = loadAOF();
  console.log(`🔁 Replaying ${commands.length} AOF commands...`);

  for (const line of commands) {
    const [command, ...args] = line.trim().split(/\s+/);
    try {
      routeCommand(command.toUpperCase(), args);
    } catch (err) {
      console.error(`❌ Error replaying: ${line}`, err.message);
    }
  }
}

function startServer() {
  // Load Snapshot
  loadSnapshot();

  // Replay AOF entries to recover latest changes
  replayAOF();

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: "redis> ",
  });

  rl.prompt();

  // Auto-save every 30 seconds
  setInterval(() => {
    saveSnapshot();
    rl.prompt();
  }, 30000);

  rl.on("line", async (input) => {
    const parsed = commandParser(input);
    const result = await routeCommand(parsed);
    console.log(result);
    rl.prompt();
  }).on("close", () => {
    saveSnapshot();
    console.log("Bye!");
    process.exit(0);
  });
}

module.exports = startServer;
