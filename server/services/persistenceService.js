// services/persistenceService.js
const fs = require("fs");
const fsPromises = require("fs/promises");
const path = require("path");
const commandRouter = require("../network/commandRouter.js");

const AOF_PATH = path.join(__dirname, "../data/aof.log");
const SNAPSHOT_PATH = path.join(__dirname, "../data/dump.rdb");

// Ensure the data folder exists
fs.mkdirSync(path.dirname(AOF_PATH), { recursive: true });

// ✅ Append a command to the AOF log
async function logAOF(argsArray) {
  const line = argsArray
    .map((arg) => (/\s/.test(arg) ? `"${arg}"` : arg))
    .join(" ");
  await fsPromises.appendFile(AOF_PATH, line + "\n");
}

// ✅ Replay commands from AOF to restore state
async function replayAOF(store) {
  if (!fs.existsSync(AOF_PATH)) return;

  const lines = fs.readFileSync(AOF_PATH, "utf-8").split("\n");

  for (const line of lines) {
    if (!line.trim()) continue;

    try {
      const commandAndArgs = JSON.parse(line);
      const [command, args] = commandAndArgs;

      await commandRouter(store, command, args);
    } catch (err) {
      console.error("AOF replay error:", err.message);
    }
  }

  delete process.env.AOF_REPLAY;
}

// ✅ Utility to parse one AOF line
function parseAOFLine(line) {
  return line.match(/"[^"]*"|\S+/g).map((token) => {
    if (token.startsWith('"') && token.endsWith('"')) {
      return JSON.parse(token);
    }
    return token;
  });
}

// ✅ Write current in-memory store to snapshot file
function saveSnapshot(store) {
  fs.writeFileSync(SNAPSHOT_PATH, JSON.stringify(store, null, 2));
}

// ✅ Load snapshot from disk and merge into memory
function loadSnapshot(store) {
  if (!fs.existsSync(SNAPSHOT_PATH)) return;
  const raw = fs.readFileSync(SNAPSHOT_PATH, "utf-8");
  const parsed = JSON.parse(raw);
  Object.assign(store, parsed); // shallow merge into existing store
}

module.exports = {
  logAOF,
  replayAOF,
  saveSnapshot,
  loadSnapshot,
};
