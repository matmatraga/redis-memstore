function sadd(store, key, ...members) {
  let set = store.get(key);
  if (!set) {
    set = new Set();
    store.set(key, set);
  }
  if (!(set instanceof Set)) {
    throw new Error(
      "WRONGTYPE Operation against a key holding the wrong kind of value"
    );
  }

  let added = 0;
  for (const member of members) {
    if (!set.has(member)) {
      set.add(member);
      added++;
    }
  }
  return added;
}

function srem(store, key, ...members) {
  const set = store.get(key);
  if (!(set instanceof Set)) return 0;

  let removed = 0;
  for (const member of members) {
    if (set.delete(member)) removed++;
  }
  return removed;
}

function smembers(store, key) {
  const set = store.get(key);
  if (!(set instanceof Set)) return "(empty set)";

  const result = [...set];
  if (result.length === 0) return "(empty set)";

  return result.map((val, i) => `${i + 1}) ${val}`).join("\n");
}

function sismember(store, key, member) {
  const set = store.get(key);
  if (!(set instanceof Set)) return 0;
  return set.has(member) ? 1 : 0;
}

function scard(store, key) {
  const set = store.get(key);
  if (!(set instanceof Set)) return 0;
  return set.size;
}

function spop(store, key) {
  const set = store.get(key);
  if (!(set instanceof Set) || set.size === 0) return "(nil)";
  const values = Array.from(set);
  const index = Math.floor(Math.random() * values.length);
  const val = values[index];
  set.delete(val);
  return `"${val}"`;
}

function srandmember(store, key) {
  const set = store.get(key);
  if (!(set instanceof Set) || set.size === 0) return "(nil)";
  const values = Array.from(set);
  const index = Math.floor(Math.random() * values.length);
  return `"${values[index]}"`;
}

function sunion(store, ...keys) {
  const result = new Set();
  for (const key of keys) {
    const set = store.get(key);
    if (set instanceof Set) {
      for (const val of set) result.add(val);
    }
  }
  if (result.size === 0) return "(empty set)";
  return Array.from(result)
    .map((val, i) => `${i + 1}) "${val}"`)
    .join("\n");
}

function sinter(store, ...keys) {
  const sets = keys
    .map((key) => store.get(key))
    .filter((s) => s instanceof Set);
  if (sets.length === 0) return "(empty set)";
  const [first, ...rest] = sets;
  const result = [...first].filter((val) => rest.every((s) => s.has(val)));
  if (result.length === 0) return "(empty set)";
  return result.map((val, i) => `${i + 1}) "${val}"`).join("\n");
}

function sdiff(store, ...keys) {
  const sets = keys.map((key) => store.get(key));
  if (!(sets[0] instanceof Set)) return "(empty set)";
  const result = new Set(sets[0]);
  for (const set of sets.slice(1)) {
    if (set instanceof Set) {
      for (const val of set) result.delete(val);
    }
  }
  if (result.size === 0) return "(empty set)";
  return [...result].map((val, i) => `${i + 1}) "${val}"`).join("\n");
}

module.exports = {
  sadd,
  srem,
  smembers,
  sismember,
  scard,
  spop,
  srandmember,
  sunion,
  sinter,
  sdiff,
};
