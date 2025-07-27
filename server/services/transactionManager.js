// server/services/transactionManager.js

const transactionState = new Map(); // key = clientId or 'default'

module.exports = {
  begin(clientId = 'default') {
    transactionState.set(clientId, []);
    return "OK";
  },

  isActive(clientId = 'default') {
    return transactionState.has(clientId);
  },

  queueCommand(clientId, commandLine) {
    if (!transactionState.has(clientId)) return "ERR no transaction started";
    transactionState.get(clientId).push(commandLine);
    return "QUEUED";
  },

  discard(clientId = 'default') {
    if (transactionState.has(clientId)) {
      transactionState.delete(clientId);
      return "OK";
    }
    return "ERR no transaction to discard";
  },

  async exec(clientId = 'default', commandProcessor) {
    const queue = transactionState.get(clientId);
    if (!queue) return "ERR no transaction";

    const results = [];

    for (const cmd of queue) {
      try {
        const res = await commandProcessor(cmd);
        results.push(res);
      } catch (err) {
        results.push(`ERR ${err.message}`);
      }
    }

    transactionState.delete(clientId);
    return results;
  }
};
