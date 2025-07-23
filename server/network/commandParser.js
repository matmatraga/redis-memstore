function commandParser(input) {
  const regex = /"([^"]*)"|'([^']*)'|[^\s]+/g;
  const args = [];
  let match;

  while ((match = regex.exec(input))) {
    args.push(match[1] || match[2] || match[0]);
  }

  const command = args.shift().toUpperCase();
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
