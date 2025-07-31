const { parse } = require("shell-quote");

function commandParser(input) {
  const parts = parse(input);
  const command = parts[0]?.toUpperCase();
  const args = parts.slice(1);
  return { command, args };
}

function parseBitfieldType(typeStr) {
  const match = /^([ui])(\d+)$/.exec(typeStr);
  if (!match) throw new Error("ERR invalid bitfield type format");

  const [, sign, sizeStr] = match;
  const bits = parseInt(sizeStr, 10);

  if (![1, 2, 4, 8, 16, 32, 64].includes(bits)) {
    throw new Error("ERR unsupported bitfield size");
  }

  return {
    signed: sign === "i",
    bits,
  };
}

module.exports = { commandParser, parseBitfieldType };
