// core/types/bitmaps.js

function ensureBuffer(store, key, length) {
  let val = store.get(key);
  if (!val || !(val instanceof Buffer)) {
    val = Buffer.alloc(length);
  } else if (val.length < length) {
    const newBuf = Buffer.alloc(length);
    val.copy(newBuf);
    val = newBuf;
  }
  store.set(key, val);
  return val;
}

function setbit(store, key, offset, value) {
  const byteIndex = Math.floor(offset / 8);
  const bitIndex = 7 - (offset % 8);
  const buf = ensureBuffer(store, key, byteIndex + 1);

  const prevBit = (buf[byteIndex] >> bitIndex) & 1;

  if (value === 0) {
    buf[byteIndex] &= ~(1 << bitIndex);
  } else {
    buf[byteIndex] |= 1 << bitIndex;
  }

  return prevBit;
}

function getbit(store, key, offset) {
  const byteIndex = Math.floor(offset / 8);
  const bitIndex = 7 - (offset % 8);
  const buf = store.get(key);
  if (!buf || !(buf instanceof Buffer) || byteIndex >= buf.length) return 0;
  return (buf[byteIndex] >> bitIndex) & 1;
}

function bitcount(store, key) {
  const buf = store.get(key);
  if (!buf || !(buf instanceof Buffer)) return 0;

  let count = 0;
  for (let i = 0; i < buf.length; i++) {
    count += buf[i].toString(2).split("1").length - 1;
  }
  return count;
}

function bitop(store, op, destkey, ...srckeys) {
  if (op === "NOT") {
    if (srckeys.length !== 1) {
      throw new Error("ERR BITOP NOT must be called with a single source key");
    }

    const src = store.get(srckeys[0]);
    const buf = src && src instanceof Buffer ? src : Buffer.alloc(0);

    const result = Buffer.alloc(buf.length);
    for (let i = 0; i < buf.length; i++) {
      result[i] = ~buf[i];
    }

    store.set(destkey, result);
    return result.length;
  }

  // Handle AND, OR, XOR as before
  const srcBuffers = srckeys.map((key) => {
    const val = store.get(key);
    return val && val instanceof Buffer ? val : Buffer.alloc(0);
  });

  const maxLength = Math.max(...srcBuffers.map((b) => b.length));
  const result = Buffer.alloc(maxLength);

  for (let i = 0; i < maxLength; i++) {
    const bytes = srcBuffers.map((b) => b[i] || 0);

    switch (op) {
      case "AND":
        result[i] = bytes.reduce((a, b) => a & b, 0xff);
        break;
      case "OR":
        result[i] = bytes.reduce((a, b) => a | b, 0x00);
        break;
      case "XOR":
        result[i] = bytes.reduce((a, b) => a ^ b, 0x00);
        break;
      default:
        throw new Error(`ERR unknown BITOP operation '${op}'`);
    }
  }

  store.set(destkey, result);
  return result.length;
}

module.exports = {
  setbit,
  getbit,
  bitcount,
  bitop,
};
