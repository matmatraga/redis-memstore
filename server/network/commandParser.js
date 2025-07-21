// server/network/commandParser.js
module.exports = function parseCommand(input) {
  const tokens = input.trim().match(/"[^"]+"|\S+/g) || [];
  const command = tokens.shift()?.toUpperCase();
  const args = tokens.map((token) =>
    token.startsWith('"') && token.endsWith('"') ? token.slice(1, -1) : token
  );

  return { command, args };
};
