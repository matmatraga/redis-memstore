const crypto = require("crypto");

const HLL_REGISTERS = 256; // 2^8
const HLL_P = 8; // Number of bits for register index

function hash(value) {
  return crypto.createHash("sha256").update(String(value)).digest();
}

function countLeadingZeros(buffer, startBit, bitLength) {
  let zeros = 0;
  for (let i = startBit; i < bitLength; i++) {
    const byteIndex = Math.floor(i / 8);
    const bitIndex = 7 - (i % 8);
    const bit = (buffer[byteIndex] >> bitIndex) & 1;
    if (bit === 0) zeros++;
    else break;
  }
  return zeros;
}

function pfadd(store, key, ...values) {
  if (values.length === 1 && Array.isArray(values[0])) {
    values = values[0];
  }

  if (!store.has(key)) {
    store.set(key, Buffer.alloc(HLL_REGISTERS));
  }

  const buf = store.get(key);
  let updated = false;

  for (const val of values) {
    const hashBuffer = hash(val);
    const index =
      parseInt(hashBuffer.slice(0, 2).toString("hex"), 16) % HLL_REGISTERS;
    const rank = countLeadingZeros(hashBuffer, 16, 256 - 16) + 1;

    if (rank > buf[index]) {
      buf[index] = rank;
      updated = true;
    }
  }

  if (updated) {
    store.set(key, buf);
    return 1;
  }

  return 0;
}

function pfcount(store, ...keys) {
  // Flatten in case it's called with a single array argument like pfcount(store, [])
  keys = keys.flat();

  if (keys.length === 0) {
    throw new Error("ERR wrong number of arguments for 'PFCOUNT'");
  }

  const registers = Buffer.alloc(HLL_REGISTERS);

  for (const key of keys) {
    const buf = store.get(key);
    if (!Buffer.isBuffer(buf)) continue;

    for (let i = 0; i < HLL_REGISTERS; i++) {
      registers[i] = Math.max(registers[i], buf[i]);
    }
  }

  let sum = 0;
  for (const reg of registers) {
    sum += 1 / (1 << reg);
  }

  const alpha = 0.7213 / (1 + 1.079 / HLL_REGISTERS);
  const estimate = (alpha * HLL_REGISTERS * HLL_REGISTERS) / sum;

  return Math.round(estimate);
}

function pfmerge(store, dest, ...sources) {
  if (!sources || sources.length === 0) {
    throw new Error("ERR wrong number of arguments for 'PFMERGE' command");
  }

  const merged = Buffer.alloc(HLL_REGISTERS);

  for (const srcKey of sources) {
    const srcBuf = store.get(srcKey);
    if (!Buffer.isBuffer(srcBuf) || srcBuf.length !== HLL_REGISTERS) {
      continue; // If the key doesn't exist or isn't a valid HLL, skip
    }

    for (let i = 0; i < HLL_REGISTERS; i++) {
      merged[i] = Math.max(merged[i], srcBuf[i]);
    }
  }

  store.set(dest, merged);

  return "OK";
}

module.exports = {
  pfadd,
  pfcount,
  pfmerge,
};
