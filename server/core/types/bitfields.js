const store = require("../datastore");
const { parseBitfieldType } = require("../../network/commandParser");
const { logAOF } = require("../../services/persistenceService");

function handle(store, key, subcommands) {
  const results = [];
  let i = 0;

  while (i < subcommands.length) {
    const op = subcommands[i]?.toUpperCase();

    if (op === "GET") {
      const type = subcommands[i + 1];
      const offsetStr = subcommands[i + 2];
      if (!type || !offsetStr) throw new Error("ERR syntax error");
      results.push(get(store, key, type, offsetStr));
      i += 3;
    } else if (op === "SET") {
      const type = subcommands[i + 1];
      const offsetStr = subcommands[i + 2];
      const valueStr = subcommands[i + 3];
      if (!type || !offsetStr || !valueStr) throw new Error("ERR syntax error");
      results.push(set(store, key, type, offsetStr, parseInt(valueStr)));
      logAOF("BITFIELD", [key, "SET", type, offsetStr, valueStr]);
      i += 4;
    } else if (op === "INCRBY") {
      const type = subcommands[i + 1];
      const offsetStr = subcommands[i + 2];
      const incrementStr = subcommands[i + 3];
      if (!type || !offsetStr || !incrementStr)
        throw new Error("ERR syntax error");
      results.push(incrby(store, key, type, offsetStr, parseInt(incrementStr)));
      logAOF("BITFIELD", [key, "INCRBY", type, offsetStr, incrementStr]);
      i += 4;
    } else {
      throw new Error(
        `ERR unknown subcommand or syntax error: ${subcommands[i]}`
      );
    }
  }

  return results;
}

function resolveOffset(buf, offset, bits) {
  if (offset >= 0) return offset;

  const totalBits = (buf?.length || 0) * 8;
  const resolved = totalBits + offset;

  return resolved < 0 ? 0 : resolved; // clamp to 0 if too negative
}

function get(store, key, type, offsetStr) {
  const { bits, signed } = parseBitfieldType(type);
  const rawOffset = parseInt(offsetStr, 10);
  if (isNaN(rawOffset)) return null;

  const buf = store.get(key);
  if (!Buffer.isBuffer(buf)) return 0;

  const offset = resolveOffset(buf, rawOffset, bits);
  const byteOffset = Math.floor(offset / 8);
  const bitOffset = offset % 8;
  const neededBits = bitOffset + bits;
  const neededBytes = Math.ceil(neededBits / 8);

  const target = buf.slice(byteOffset, byteOffset + neededBytes);
  let value = 0;

  for (let i = 0; i < bits; i++) {
    const bit =
      (target[Math.floor((bitOffset + i) / 8)] >> (7 - ((bitOffset + i) % 8))) &
      1;
    value = (value << 1) | bit;
  }

  if (signed) {
    const signBit = 1 << (bits - 1);
    if (value & signBit) {
      value = value - (1 << bits);
    }
  }

  return value;
}

function set(store, key, type, offsetStr, valueStr) {
  const { bits, signed } = parseBitfieldType(type);
  const rawOffset = parseInt(offsetStr, 10);
  const offset = resolveOffset(store.get(key), rawOffset, bits);
  const value = parseInt(valueStr, 10);

  if ([offset, value].some(Number.isNaN)) return null;

  const totalBits = offset + bits;
  const totalBytes = Math.ceil(totalBits / 8);
  let buf = store.get(key);

  if (!Buffer.isBuffer(buf)) {
    buf = Buffer.alloc(totalBytes);
  } else if (buf.length < totalBytes) {
    const expanded = Buffer.alloc(totalBytes);
    buf.copy(expanded);
    buf = expanded;
  }

  // Clamp value to the allowed range
  const max = signed ? (1 << (bits - 1)) - 1 : (1 << bits) - 1;
  const min = signed ? -(1 << (bits - 1)) : 0;
  const clamped = Math.max(min, Math.min(max, value));

  for (let i = 0; i < bits; i++) {
    const bitIndex = offset + i;
    const byteIndex = Math.floor(bitIndex / 8);
    const bitPos = 7 - (bitIndex % 8);

    const bitVal = (clamped >> (bits - i - 1)) & 1;
    buf[byteIndex] &= ~(1 << bitPos);
    buf[byteIndex] |= bitVal << bitPos;
  }

  store.set(key, buf);
  return clamped;
}

function incrby(store, key, type, offsetStr, incrementStr) {
  const { bits, signed } = parseBitfieldType(type); // get bit width and sign
  const rawOffset = parseInt(offsetStr, 10);
  if (isNaN(rawOffset)) return null;

  const buf = store.get(key);
  const offset = resolveOffset(buf, rawOffset, bits); // resolve negative offset

  const current = get(store, key, type, offset);
  const newVal = current + parseInt(incrementStr, 10);

  return set(store, key, type, offset, newVal.toString());
}

module.exports = {
  get,
  set,
  incrby,
  handle,
};
