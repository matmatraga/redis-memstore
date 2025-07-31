const { parse } = require("shell-quote");

function commandParser(input) {
  const parts = parse(input);
  const mergedParts = [];

  for (let i = 0; i < parts.length; i++) {
    const token = parts[i];

    if (typeof token === "object" && token.op === ">") {
      // Merge '>' operator with the next token
      if (i + 1 < parts.length && typeof parts[i + 1] === "string") {
        mergedParts.push(">" + parts[i + 1]);
        i++; // skip next token because merged
      } else {
        mergedParts.push(">"); // fallback if no next token
      }
    } else if (typeof token === "string") {
      mergedParts.push(token);
    } else {
      // convert other objects to string safely
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
