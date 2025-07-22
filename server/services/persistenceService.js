// server/services/persistenceService.js
const fs = require("fs");
const path = require("path");

const AOF_PATH = path.join(__dirname, "../data/appendonly.aof");

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

module.exports = {
  appendToAOF,
  loadAOF,
};
