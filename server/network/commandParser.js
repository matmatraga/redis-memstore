const { parse } = require("shell-quote");

function commandParser(input) {
  const parts = parse(input);
  const mergedParts = [];

  for (let i = 0; i < parts.length; i++) {
    const token = parts[i];

    if (typeof token === "object" && token.op === ">") {
      if (i + 1 < parts.length && typeof parts[i + 1] === "string") {
        mergedParts.push(">" + parts[i + 1]);
        i++;
      } else {
        mergedParts.push(">");
      }
    } else if (typeof token === "string") {
      mergedParts.push(token);
    } else {
      mergedParts.push(String(token));
    }
  }

  const command = mergedParts[0]?.toUpperCase();
  const args = mergedParts.slice(1);
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
