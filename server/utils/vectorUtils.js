// server/utils/vectorUtils.js

function parseVector(vecStr) {
  try {
    const vec = JSON.parse(vecStr);
    if (!Array.isArray(vec) || vec.some((v) => typeof v !== "number")) {
      throw new Error("ERR invalid vector format");
    }
    return vec;
  } catch {
    throw new Error("ERR invalid vector format");
  }
}

function euclideanDistance(a, b) {
  if (a.length !== b.length) throw new Error("ERR dimension mismatch");
  return Math.sqrt(a.reduce((sum, val, i) => sum + (val - b[i]) ** 2, 0));
}

function cosineSimilarity(a, b) {
  if (a.length !== b.length) throw new Error("ERR dimension mismatch");

  const dot = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const magA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const magB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));

  return dot / (magA * magB || 1);
}

module.exports = {
  parseVector,
  euclideanDistance,
  cosineSimilarity,
};
