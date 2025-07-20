function hset(store, key, ...args) {
  if (args.length < 2 || args.length % 2 !== 0) {
    return "ERR wrong number of arguments for 'hset' command";
  }

  let hash = store.get(key);
  if (!hash || typeof hash !== "object" || Array.isArray(hash)) {
    hash = {};
  }

  let newFields = 0;
  for (let i = 0; i < args.length; i += 2) {
    const field = args[i];
    const value = args[i + 1];
    if (!(field in hash)) newFields++;
    hash[field] = value;
  }

  store.set(key, hash);
  return newFields;
}

function hget(store, key, field) {
  const hash = store.get(key);
  if (!hash || typeof hash !== "object" || Array.isArray(hash)) return null;
  return field in hash ? hash[field] : null;
}

function hmset(store, key, ...args) {
  if (args.length < 2 || args.length % 2 !== 0) {
    return "ERR wrong number of arguments for 'hmset' command";
  }

  let hash = store.get(key);
  if (!hash || typeof hash !== "object" || Array.isArray(hash)) {
    hash = {};
  }

  for (let i = 0; i < args.length; i += 2) {
    const field = args[i];
    const value = args[i + 1];
    hash[field] = value;
  }

  store.set(key, hash);
  return "OK";
}

function hgetall(store, key) {
  const hash = store.get(key);
  if (!hash || typeof hash !== "object" || Array.isArray(hash)) return [];

  const result = [];
  for (const [field, value] of Object.entries(hash)) {
    result.push(field, value);
  }

  return result;
}

function hdel(store, key, ...fields) {
  const hash = store.get(key);
  if (!hash || typeof hash !== "object" || Array.isArray(hash)) return 0;

  let deleted = 0;
  for (const field of fields) {
    if (field in hash) {
      delete hash[field];
      deleted++;
    }
  }

  store.set(key, hash);
  return deleted;
}

function hexists(store, key, field) {
  const hash = store.get(key);
  if (!hash || typeof hash !== "object" || Array.isArray(hash)) return 0;
  return field in hash ? 1 : 0;
}

module.exports = {
  hset,
  hget,
  hmset,
  hgetall,
  hdel,
  hexists,
};
