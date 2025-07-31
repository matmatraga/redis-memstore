// utils/vectorIndex.js
const { exportVectorsToJSON, importVectorsFromJSON } = require("./mlInterface");
const path = require("path");

const index = new Map(); // key -> vector (copy of stored vector)

function addToIndex(key, vector) {
  index.set(key, vector);
}

function removeFromIndex(key) {
  index.delete(key);
}

function updateIndex(key, vector) {
  index.set(key, vector);
}

function clearIndex() {
  index.clear();
}

function searchKNN(targetVector, k, distanceFn) {
  const results = [];

  for (const [key, vec] of index.entries()) {
    const dist = distanceFn(targetVector, vec);
    results.push({ key, dist });
  }

  results.sort((a, b) => a.dist - b.dist);
  return results.slice(0, k);
}

function saveIndexToFile(filePath) {
  exportVectorsToJSON(filePath, index);
  console.log(`✅ Vector index exported to ${filePath}`);
}

function loadIndexFromFile(filePath) {
  const imported = importVectorsFromJSON(filePath);
  for (const [key, vec] of imported.entries()) {
    index.set(key, vec);
  }
  console.log(`✅ Vector index loaded from ${filePath}`);
}

module.exports = {
  addToIndex,
  removeFromIndex,
  updateIndex,
  clearIndex,
  searchKNN,
  saveIndexToFile,
  loadIndexFromFile,
};
