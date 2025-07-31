// commandRouter.js (ACL-integrated wrapper)
const originalRouter = require("./commandRouter.core");
const {
  handleAuth,
  checkAccess,
  getClientUser,
  aclSetUser,
  aclDelUser,
  aclList,
  aclWhoami,
} = require("../services/aclService");
const pipelineService = require("../services/pipelineService");
const {
  trackKeyRead,
  getClientsWatchingKey,
  clearWatchersForKey,
} = require("../services/cacheTrackingService");
const socketRegistry = require("../network/socketRegistry");

module.exports = async function routeCommandRaw({
  command,
  args,
  bypassTransaction = false,
  clientId = "default",
}) {
  const upperCmd = command.toUpperCase();

  // AUTH command
  if (upperCmd === "AUTH") {
    const [username, password] = args;
    return handleAuth(clientId, username, password);
  }

  // ACL commands
  if (upperCmd === "ACL") {
    const sub = args[0]?.toUpperCase();
    switch (sub) {
      case "SETUSER":
        return aclSetUser(args.slice(1));
      case "DELUSER":
        return aclDelUser(args.slice(1));
      case "LIST":
        return aclList();
      case "WHOAMI":
        return aclWhoami(clientId);
      default:
        return "ERR unknown ACL subcommand";
    }
  }

  // PIPELINE commands
  if (upperCmd === "PIPELINE") {
    const sub = args[0]?.toUpperCase();
    switch (sub) {
      case "START":
        pipelineService.startPipeline(clientId);
        return "OK";
      case "DISCARD":
        pipelineService.discardPipeline(clientId);
        return "OK";
      case "EXEC": {
        const queue = pipelineService.execPipeline(clientId);
        const results = [];
        for (const cmd of queue) {
          const result = await module.exports({
            ...cmd,
            clientId,
            bypassTransaction: true,
          });
          results.push(result);
        }
        return results;
      }
      default:
        return "ERR unknown PIPELINE subcommand";
    }
  }

  if (
    ["GET", "JSON.GET", "HGET", "LRANGE", "ZRANGE", "TS.GET"].includes(upperCmd)
  ) {
    const key = args[0];
    if (key) trackKeyRead(clientId, key);
  }

  // Enforce ACL
  const username = getClientUser(clientId);
  if (!checkAccess(username, upperCmd)) {
    return "ERR permission denied";
  }

  // Queue command if pipelining
  if (pipelineService.isInPipeline(clientId)) {
    pipelineService.queueCommand(clientId, { command, args });
    return "QUEUED";
  }

  // Delegate to full command logic
  const result = await originalRouter({
    command,
    args,
    bypassTransaction,
    clientId,
  });

  // If this command modifies data, trigger cache invalidation
  if (
    [
      "SET",
      "DEL",
      "HSET",
      "LPUSH",
      "RPUSH",
      "SADD",
      "ZADD",
      "JSON.SET",
      "JSON.DEL",
    ].includes(upperCmd)
  ) {
    const key = args[0];
    const watchers = getClientsWatchingKey(key);
    for (const watcherId of watchers) {
      const targetSocket = socketRegistry.getSocket(watcherId);
      if (targetSocket) {
        targetSocket.write(`CACHEINVALIDATE ${key}\n`);
      }
    }
    clearWatchersForKey(key);
  }

  return result;
};
