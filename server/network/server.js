const readline = require("readline");
const store = require("../core/datastore");
const routeCommand = require("./commandRouter");
const { loadSnapshot, replayAOF } = require("../services/persistenceService");

module.exports = async function startServer() {
  await loadSnapshot(store);

  // await replayAOF(store); // Replay AOF on startup

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: "redis> ",
  });

  rl.prompt();

  rl.on("line", async (line) => {
    const input = line.trim();

    if (!input) return rl.prompt();

    const parts = input
      .match(/"[^"]*"|\S+/g)
      ?.map((s) => (s.startsWith('"') ? s.slice(1, -1) : s));

    const command = parts[0];
    const args = parts.slice(1);

    try {
      const result = await routeCommand(store, command, args);
      if (result !== undefined) {
        console.log(result);
      }
    } catch (err) {
      console.error("ERR", err.message);
    }

    rl.prompt(); // ✅ Use prompt instead of rl.question()
  });

  rl.on("close", () => {
    console.log("Bye!");
    process.exit(0);
  });
};
