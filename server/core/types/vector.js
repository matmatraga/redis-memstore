// core/types/vector.js
const store = require("../datastore");
const {
  parseVector,
  euclideanDistance,
  cosineSimilarity,
} = require("../../utils/vectorUtils");
const {
  addToIndex,
  removeFromIndex,
  updateIndex,
  searchKNN,
  clearIndex,
} = require("../../utils/vectorIndex");

/**
 * VSET key [vec...]
 * Stores a vector at a key
 */
function set(args) {
  const [key, ...vectorParts] = args;
  if (!key || vectorParts.length === 0)
    return "ERR wrong number of arguments for 'VSET' command";
  let vec;
  try {
    vec = parseVector(vectorParts);
  } catch {
    return "ERR invalid vector format";
  }

  const existing = store.get(key);
  if (existing && existing.type === "vector") {
    updateIndex(key, vec);
  } else {
    addToIndex(key, vec);
  }

  store.set(key, { type: "vector", value: vec });
  return "OK";
}

/**
 * VGET key
 * Retrieves the vector stored at key
 */
function get([key]) {
  if (!key) return "ERR wrong number of arguments for 'VGET' command";
  const val = store.get(key);
  if (!val || val.type !== "vector") return null;
  return JSON.stringify(val.value);
}

/**
 * VDIST key1 key2 [DISTANCE euclidean|cosine]
 */
function dist(args) {
  const [key1, key2, opt, metric] = args;
  if (!key1 || !key2)
    return "ERR wrong number of arguments for 'VDIST' command";

  const v1 = store.get(key1);
  const v2 = store.get(key2);
  if (!v1 || v1.type !== "vector" || !v2 || v2.type !== "vector")
    return "ERR one or both keys do not contain vectors";

  const distanceType =
    opt === "DISTANCE" && metric === "cosine" ? "cosine" : "euclidean";

  if (distanceType === "euclidean") {
    return euclideanDistance(v1.value, v2.value).toFixed(6);
  } else {
    return (1 - cosineSimilarity(v1.value, v2.value)).toFixed(6);
  }
}

/**
 * VSEARCH key k [DISTANCE euclidean|cosine]
 */
function search(args) {
  const [key, kStr, opt, metric] = args;
  if (!key || !kStr)
    return "ERR wrong number of arguments for 'VSEARCH' command";
  const k = parseInt(kStr);
  if (isNaN(k) || k < 1) return "ERR invalid value for k";

  const target = store.get(key);
  if (!target || target.type !== "vector")
    return "ERR target key must be a vector";
  const distanceType =
    opt === "DISTANCE" && metric === "cosine" ? "cosine" : "euclidean";

  const distanceFn =
    distanceType === "euclidean"
      ? euclideanDistance
      : (a, b) => 1 - cosineSimilarity(a, b);

  const results = searchKNN(target.value, k, distanceFn);

  if (!results.length) return "(empty list or set)";

  return results.map((res) => `${res.key} (dist=${res.dist.toFixed(6)})`);
}

module.exports = {
  set,
  get,
  dist,
  search,
};
