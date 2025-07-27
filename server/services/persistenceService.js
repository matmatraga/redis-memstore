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

function logAOF(command, args = []) {
  const line = [command, ...args].join(" ");
  appendToAOF(line);
}

// ✅ Save in-memory store to disk
function saveSnapshot() {
  try {
    const data = {};
    const expirations = {};

    for (const [key, value] of store.store.entries()) {
      if (store._isExpired(key)) continue; // skip expired keys
      if (
        value?.bits instanceof Buffer &&
        typeof value.size === "number" &&
        typeof value.hashCount === "number"
      ) {
        // This is likely a bloom filter object — ensure buffer is serialized correctly
        data[key] = {
          bits: value.bits.toJSON(), // ensures type + data
          size: value.size,
          hashCount: value.hashCount,
        };
      } else {
        data[key] = value;
      }

      const ttlMs = store.expirations.get(key);
      if (ttlMs) {
        expirations[key] = ttlMs;
      }
    }

    const snapshot = { data, expirations };
    fs.writeFileSync(SNAPSHOT_FILE, JSON.stringify(snapshot, null, 2));
    console.log("💾 Redis-like snapshot saved.");
  } catch (err) {
    console.error("❌ Failed to save snapshot:", err);
  }
}

// ✅ Load snapshot from disk and hydrate datastore
function loadSnapshot() {
  try {
    if (!fs.existsSync(SNAPSHOT_FILE)) return;

    const raw = fs.readFileSync(SNAPSHOT_FILE);
    const snapshot = JSON.parse(raw);

    const now = Date.now();

    for (const [key, value] of Object.entries(snapshot.data || {})) {
      const expireAt = snapshot.expirations?.[key];
      if (expireAt && expireAt <= now) continue;

      // ✅ If this is a Bloom filter, revive the Buffer
      if (
        typeof value === "object" &&
        value.bits &&
        value.bits.type === "Buffer" &&
        Array.isArray(value.bits.data)
      ) {
        value.bits = Buffer.from(value.bits.data);
      }

      // ✅ Hydrate Cuckoo filter
      else if (
        typeof value === "object" &&
        Array.isArray(value.buckets) &&
        typeof value.capacity === "number" &&
        typeof value.bucketSize === "number"
      ) {
        value.buckets = value.buckets.map((bucket) =>
          bucket.map((fp) => Buffer.from(fp.data ?? fp))
        );
      }

      store.store.set(key, value);

      if (expireAt) {
        store.expirations.set(key, expireAt);
      }
    }

    console.log("✅ Snapshot loaded.");
  } catch (err) {
    console.error("❌ Failed to load snapshot:", err);
  }
}

function bgSaveSnapshot() {
  console.log("[BGSAVE] Background snapshot initiated...");
  setImmediate(() => {
    saveSnapshot(); // reuse your existing logic
    console.log("[BGSAVE] Background snapshot completed.");
  });
}

module.exports = {
  appendToAOF,
  logAOF,
  loadAOF,
  saveSnapshot,
  loadSnapshot,
  bgSaveSnapshot,
};
