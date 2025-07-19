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

module.exports = commandParser;
