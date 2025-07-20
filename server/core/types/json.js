// core/types/json.js
const pathUtil = require("../../utils/jsonPath");

function updateAllMatchingKeys(obj, targetKey, newValue) {
  if (typeof obj !== "object" || obj === null) return;

  for (const key in obj) {
    if (key === targetKey) {
      obj[key] = newValue;
    } else if (typeof obj[key] === "object") {
      updateAllMatchingKeys(obj[key], targetKey, newValue);
    }
  }
}
function set(store, key, path, valueStr) {
  let parsedValue;
  try {
    parsedValue = JSON.parse(valueStr);
  } catch (e) {
    return "ERR invalid JSON";
  }

  const existing = store.get(key);

  // If key doesn't exist and path is not root
  if (!existing && path !== "$") {
    return "ERR new objects must be created at the root";
  }

  // Case 1: Root path
  if (path === "$") {
    store.set(key, parsedValue);
    return "OK";
  }

  // Case 2: Recursive path
  if (path.startsWith("$..")) {
    const targetKey = path.slice(3);
    if (existing && typeof existing === "object") {
      updateAllMatchingKeys(existing, targetKey, parsedValue);
      store.set(key, existing);
      return "OK";
    } else {
      return null;
    }
  }

  // Case 3: Top-level or nested path like $.x or $.x.y.z
  if (path.startsWith("$.")) {
    if (!existing || typeof existing !== "object") return null;

    const segments = path.slice(2).split(".");
    let current = existing;

    for (let i = 0; i < segments.length - 1; i++) {
      const segment = segments[i];
      if (typeof current[segment] !== "object" || current[segment] === null) {
        return null; // Cannot traverse deeper
      }
      current = current[segment];
    }

    current[segments.at(-1)] = parsedValue;
    store.set(key, existing);
    return "OK";
  }

  // Unknown path format
  return "ERR only root path '$', top-level '$.key', or recursive '$..key' are supported";
}

function get(store, key, path = "$") {
  const data = store.get(key);
  if (data === null) return null;

  try {
    const result = pathUtil.evaluatePath(data, path);
    if (typeof result === "undefined") throw new Error();
    return JSON.stringify(result);
  } catch {
    return "ERR invalid path";
  }
}

function del(store, key, path = "$") {
  if (path !== "$") return 'ERR only root path "$" is supported for JSON.DEL';
  return store.del(key);
}

function arrappend(store, key, path, ...elements) {
  const data = store.get(key);
  if (!data) return null;

  let target;
  try {
    target = pathUtil.evaluatePath(data, path, true);
  } catch {
    return "ERR invalid path";
  }

  if (target === undefined) {
    return "ERR invalid path";
  }

  if (!Array.isArray(target)) {
    return "ERR path must point to an array";
  }

  const parsedElements = elements.map((el) => {
    try {
      return JSON.parse(el);
    } catch {
      return el;
    }
  });

  target.push(...parsedElements);
  store.set(key, data);
  return target.length;
}

module.exports = {
  set,
  get,
  del,
  arrappend,
};
