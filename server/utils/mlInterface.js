// utils/mlInterface.js

/**
 * Interface for ML integration (future-ready).
 * This allows exporting stored vectors for external ML tools (e.g. training, clustering).
 */

const fs = require("fs");

function exportVectorsToJSON(filePath, vectorMap) {
  const exportData = [];

  for (const [key, vec] of vectorMap.entries()) {
    exportData.push({ key, vector: vec });
  }

  fs.writeFileSync(filePath, JSON.stringify(exportData, null, 2));
}

function importVectorsFromJSON(filePath) {
  const raw = fs.readFileSync(filePath);
  const data = JSON.parse(raw);

  const map = new Map();

  for (const item of data) {
    // ✅ Validate structure
    if (
      typeof item.key !== "string" ||
      !Array.isArray(item.vector) ||
      item.vector.some((v) => typeof v !== "number")
    ) {
      throw new Error("Invalid vector data format");
    }

    map.set(item.key, item.vector);
  }

  return map;
}

module.exports = {
  exportVectorsToJSON,
  importVectorsFromJSON,
};
