// server/services/persistenceService.js
const fs = require("fs");
const path = require("path");
const store = require("../core/datastore");
const { getRole } = require("../services/replicationService");

const AOF_PATH = path.join(__dirname, "../data/appendonly.aof");
const SNAPSHOT_FILE = path.join(__dirname, "../data/dump.json");

let isReplayingAOF = false;

function setReplayingAOF(value) {
  isReplayingAOF = value;
}

function appendToAOF(commandLine) {
  if (getRole() !== "master") return;
  if (isReplayingAOF) return;

  fs.appendFile(AOF_PATH, commandLine + "\n", (err) => {
    if (err) console.error("AOF Write Error:", err);
  });
}

function loadAOF() {
  if (getRole() !== "master") return [];
  if (!fs.existsSync(AOF_PATH)) return [];
  const data = fs.readFileSync(AOF_PATH, "utf-8");
  return data.trim().split("\n").filter(Boolean);
}

function logAOF(command, args = []) {
  const line = [command, ...args].join(" ");
  appendToAOF(line);
}

function saveSnapshot() {
  try {
    const data = {};
    const expirations = {};

    for (const [key, value] of store.store.entries()) {
      if (store._isExpired(key)) continue;

      if (
        value?.bits instanceof Buffer &&
        typeof value.size === "number" &&
        typeof value.hashCount === "number"
      ) {
        data[key] = {
          bits: value.bits.toJSON(),
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

function loadSnapshot() {
  try {
    if (!fs.existsSync(SNAPSHOT_FILE)) return;

    const raw = fs.readFileSync(SNAPSHOT_FILE);
    const snapshot = JSON.parse(raw);
    const now = Date.now();

    for (const [key, value] of Object.entries(snapshot.data || {})) {
      const expireAt = snapshot.expirations?.[key];
      if (expireAt && expireAt <= now) continue;

      if (
        typeof value === "object" &&
        value.bits?.type === "Buffer" &&
        Array.isArray(value.bits.data)
      ) {
        value.bits = Buffer.from(value.bits.data);
      } else if (
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
      if (expireAt) store.expirations.set(key, expireAt);
    }

    console.log("✅ Snapshot loaded.");
  } catch (err) {
    console.error("❌ Failed to load snapshot:", err);
  }
}

function bgSaveSnapshot() {
  console.log("[BGSAVE] Background snapshot initiated...");
  setImmediate(() => {
    saveSnapshot();
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
  setReplayingAOF,
};
