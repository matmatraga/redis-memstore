// server/core/types/cuckoofilter.js
const crypto = require("crypto");

function hashFn(value) {
  return crypto.createHash("sha256").update(value).digest();
}

function fingerprint(value, size = 1) {
  const hash = hashFn(value);
  return hash.slice(0, size); // fingerprint of 1 byte by default
}

function indexHash(fp, size) {
  return fp[0] % size; // simple index from fingerprint byte
}

function reserve(
  store,
  key,
  capacityStr,
  bucketSizeStr = "4",
  maxKicksStr = "500"
) {
  if (store.has(key)) return "ERR key already exists";

  const capacity = parseInt(capacityStr, 10);
  const bucketSize = parseInt(bucketSizeStr, 10);
  const maxKicks = parseInt(maxKicksStr, 10);

  if (capacity <= 0 || bucketSize <= 0 || maxKicks <= 0)
    return "ERR invalid parameters";

  const buckets = Array.from({ length: capacity }, () => []);

  const data = {
    buckets,
    bucketSize,
    maxKicks,
    capacity,
  };

  store.set(key, data);
  return "OK";
}

function add(store, key, item) {
  const data = store.get(key);
  if (!data) return "ERR no such key";

  const fp = fingerprint(item);
  const i1 = indexHash(fp, data.capacity);
  const i2 = i1 ^ indexHash(fp, data.capacity); // second bucket

  if (tryInsert(data, i1, fp) || tryInsert(data, i2, fp)) {
    return 1;
  }

  // Cuckoo eviction
  let i = Math.random() < 0.5 ? i1 : i2;
  for (let kick = 0; kick < data.maxKicks; kick++) {
    const b = data.buckets[i];
    const randIdx = Math.floor(Math.random() * b.length);
    const evicted = b[randIdx];
    b[randIdx] = fp;

    i = i ^ indexHash(evicted, data.capacity);
    if (tryInsert(data, i, evicted)) {
      return 1;
    }
  }

  return "ERR insert failed";
}

function tryInsert(data, index, fingerprint) {
  if (!data.buckets[index]) {
    data.buckets[index] = [];
  }

  const bucket = data.buckets[index];

  if (bucket.length < data.bucketSize) {
    bucket.push(fingerprint);
    return true;
  }
  return false;
}

function exists(store, key, item) {
  const data = store.get(key);
  if (!data) return 0;

  const fp = fingerprint(item);
  const i1 = indexHash(fp, data.capacity);
  const i2 = i1 ^ indexHash(fp, data.capacity);

  return data.buckets[i1].some((f) => f.equals(fp)) ||
    data.buckets[i2].some((f) => f.equals(fp))
    ? 1
    : 0;
}

function del(store, key, item) {
  const data = store.get(key);
  if (!data) return 0;

  const fp = fingerprint(item);
  const i1 = indexHash(fp, data.capacity);
  const i2 = i1 ^ indexHash(fp, data.capacity);

  const idx1 = data.buckets[i1].findIndex((f) => f.equals(fp));
  if (idx1 !== -1) {
    data.buckets[i1].splice(idx1, 1);

    return 1;
  }

  const idx2 = data.buckets[i2].findIndex((f) => f.equals(fp));
  if (idx2 !== -1) {
    data.buckets[i2].splice(idx2, 1);

    return 1;
  }

  return 0;
}

module.exports = {
  reserve,
  add,
  exists,
  del,
};
