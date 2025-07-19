// server/core/types/strings.js
function ensureString(value) {
  if (typeof value !== "string") {
    throw new Error(
      "WRONGTYPE Operation against a key holding the wrong kind of value"
    );
  }
}

function append(store, key, appendValue) {
  let current = store.get(key);

  if (current === null) {
    // Key doesn't exist, create new string
    store.set(key, appendValue);
    return appendValue.length;
  }

  if (typeof current !== "string") {
    throw new Error(
      "WRONGTYPE Operation against a key holding the wrong kind of value"
    );
  }

  const newValue = current + appendValue;
  store.set(key, newValue);
  return newValue.length;
}

function strlen(store, key) {
  const value = store.get(key);
  if (value === null) return 0;
  ensureString(value);
  return value.length;
}

function incr(store, key) {
  return incrby(store, key, 1);
}

function decr(store, key) {
  return incrby(store, key, -1);
}

function incrby(store, key, amount) {
  const current = store.get(key) ?? "0";
  ensureString(current);
  const num = parseInt(current, 10);
  if (isNaN(num))
    throw new Error("ERR value is not an integer or out of range");
  const result = num + amount;
  store.set(key, result.toString());
  return result;
}

function getrange(store, key, start, end) {
  const value = store.get(key);
  if (typeof value !== "string") {
    throw new Error(
      "WRONGTYPE Operation against a key holding the wrong kind of value"
    );
  }

  const len = value.length;

  // Normalize negative indices
  if (start < 0) start = len + start;
  if (end < 0) end = len + end;

  // Clamp values within valid range
  start = Math.max(0, start);
  end = Math.min(len - 1, end);

  if (start > end || start >= len) {
    return '""';
  }

  const substr = value.substring(start, end + 1); // inclusive end
  return `"${substr}"`;
}

function setrange(store, key, offset, substring) {
  if (isNaN(offset) || offset < 0) {
    throw new Error("offset is out of range");
  }

  let current = store.get(key);
  if (current === null) {
    current = "";
  } else if (typeof current !== "string") {
    throw new Error(
      "WRONGTYPE Operation against a key holding the wrong kind of value"
    );
  }

  // Convert current string to array for easier manipulation
  const charArray = current.split("");

  // Zero-padding
  while (charArray.length < offset) {
    charArray.push(" ");
  }

  // Replace or insert substring starting from offset
  for (let i = 0; i < substring.length; i++) {
    charArray[offset + i] = substring[i];
  }

  const newValue = charArray.join("");
  store.set(key, newValue);
  return newValue.length;
}

module.exports = {
  append,
  strlen,
  incr,
  decr,
  incrby,
  getrange,
  setrange,
};
