// server/network/commandParser.js
module.exports = function parseCommand(input) {
  const tokens = input.trim().split(/\s+/);
  const command = tokens[0]?.toUpperCase();
  const args = tokens.slice(1);
  return { command, args };
};
