// server/services/persistenceService.js
const fs = require("fs");
const path = require("path");
const store = require("../core/datastore");

const AOF_PATH = path.join(__dirname, "../data/appendonly.aof");
const SNAPSHOT_FILE = path.join(__dirname, "../data/dump.json");

function appendToAOF(commandLine) {
  fs.appendFile(AOF_PATH, commandLine + "\n", (err) => {
    if (err) console.error("AOF Write Error:", err);
  });
}

function loadAOF() {
  if (!fs.existsSync(AOF_PATH)) return [];
  const data = fs.readFileSync(AOF_PATH, "utf-8");
  return data.trim().split("\n").filter(Boolean);
}

// ✅ Save in-memory store to disk
function saveSnapshot() {
  try {
    const snapshot = {
      data: Object.fromEntries(store.store),
      expirations: Object.fromEntries(store.expirations),
    };
    fs.writeFileSync(SNAPSHOT_FILE, JSON.stringify(snapshot, null, 2));
    console.log("📸 Snapshot saved.");
  } catch (err) {
    console.error("Failed to save snapshot:", err);
  }
}

// ✅ Load snapshot from disk and hydrate datastore
function loadSnapshot() {
  try {
    if (fs.existsSync(SNAPSHOT_FILE)) {
      const raw = fs.readFileSync(SNAPSHOT_FILE, "utf-8");
      const parsed = JSON.parse(raw);

      // Restore as Maps
      store.data = new Map(Object.entries(parsed.store || {}));
      store.expirations = new Map(Object.entries(parsed.expirations || {}));

      console.log("🔁 Snapshot loaded into memory.");
    }
  } catch (err) {
    console.error("Failed to load snapshot:", err);
  }
}

module.exports = {
  appendToAOF,
  loadAOF,
  saveSnapshot,
  loadSnapshot,
};
