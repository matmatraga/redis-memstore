// core/types/lists.js
function lpush(store, key, ...values) {
  let list = store.get(key);
  if (!list) list = [];
  if (!Array.isArray(list)) return "ERR wrong type";

  list.unshift(...values.reverse());
  store.set(key, list);
  return list.length;
}

function rpush(store, key, ...values) {
  let list = store.get(key);
  if (!list) list = [];
  if (!Array.isArray(list)) return "ERR wrong type";

  list.push(...values);
  store.set(key, list);
  return list.length;
}

function lpop(store, key) {
  const list = store.get(key);
  if (!Array.isArray(list) || list.length === 0) return null;

  const val = list.shift();
  store.set(key, list);
  return val;
}

function rpop(store, key) {
  const list = store.get(key);
  if (!Array.isArray(list) || list.length === 0) return null;

  const val = list.pop();
  store.set(key, list);
  return val;
}

function lrange(store, key, start, stop) {
  const list = store.get(key);
  if (!Array.isArray(list)) return [];

  const s = parseInt(start);
  const e = parseInt(stop);
  const len = list.length;

  let realStart = s < 0 ? len + s : s;
  let realEnd = e < 0 ? len + e : e;

  // Clamp indices
  if (realStart < 0) realStart = 0;
  if (realEnd >= len) realEnd = len - 1;

  // Return empty if out of range
  if (realStart > realEnd || realStart >= len) return [];

  return list.slice(realStart, realEnd + 1);
}

function lindex(store, key, index) {
  const list = store.get(key);
  if (!Array.isArray(list)) return null;

  const i = parseInt(index);
  if (i < 0 || i >= list.length) return null;
  return list[i];
}

function lset(store, key, index, value) {
  const list = store.get(key);
  if (!Array.isArray(list)) return "ERR wrong type";

  const i = parseInt(index);
  if (i < 0 || i >= list.length) return "ERR index out of range";

  list[i] = value;
  store.set(key, list);
  return "OK";
}

module.exports = {
  lpush,
  rpush,
  lpop,
  rpop,
  lrange,
  lindex,
  lset,
};
