// server/network/server.js
const readline = require('readline');
const commandParser = require('./commandParser');
const commandRouter = require('./commandRouter');

function startServer() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: 'redis> ',
  });

  rl.prompt();

  rl.on('line', (line) => {
    const command = commandParser(line.trim());
    const response = commandRouter(command);
    console.log(response);
    rl.prompt();
  }).on('close', () => {
    console.log('Bye!');
    process.exit(0);
  });
}

module.exports = startServer;