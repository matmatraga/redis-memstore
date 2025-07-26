// server/core/types/bloomfilter.js
const crypto = require("crypto");

function hashN(value, n, size) {
  const results = [];
  const base = crypto.createHash("sha256").update(value).digest();
  for (let i = 0; i < n; i++) {
    const hash = crypto
      .createHash("sha256")
      .update(Buffer.concat([base, Buffer.from([i])]))
      .digest();

    // Convert hash to integer and reduce into range
    const index = hash.readUInt32BE() % size;
    results.push(index);
  }
  return results;
}

function reserve(store, key, errorRateStr, capacityStr) {
  if (store.has(key)) return "ERR key already exists";

  const errorRate = parseFloat(errorRateStr);
  const capacity = parseInt(capacityStr, 10);

  if (
    isNaN(errorRate) ||
    errorRate <= 0 ||
    errorRate >= 1 ||
    isNaN(capacity) ||
    capacity <= 0
  ) {
    return "ERR invalid error rate or capacity";
  }

  const m = Math.ceil(-(capacity * Math.log(errorRate)) / Math.LN2 ** 2);
  const k = Math.round((m / capacity) * Math.LN2);

  const data = {
    bits: Buffer.alloc(m),
    size: m,
    hashCount: k,
  };

  store.set(key, data);
  return "OK";
}

function add(store, key, value) {
  const data = store.get(key);
  if (!data) return "ERR no such key";
  const { bits, size, hashCount } = data;

  const indexes = hashN(value, hashCount, size);
  indexes.forEach((i) => (bits[i] = 1));
  return 1;
}

function exists(store, key, value) {
  const data = store.get(key);
  if (!data) return 0;
  const { bits, size, hashCount } = data;

  const indexes = hashN(value, hashCount, size);
  return indexes.every((i) => bits[i]) ? 1 : 0;
}

module.exports = {
  reserve,
  add,
  exists,
};
