const os = require("os");

const monitoringState = {
  startTime: Date.now(),
  totalCommandsProcessed: 0,
  connectedClients: new Set(),
  slowlog: [],
};

let SLOWLOG_THRESHOLD_MS = 50;

function setSlowlogThreshold(value) {
  SLOWLOG_THRESHOLD_MS = value;
}

function logIfSlow(command, durationMs) {
  if (durationMs >= SLOWLOG_THRESHOLD_MS) {
    monitoringState.slowlog.push({
      command,
      duration: durationMs,
      timestamp: Date.now(),
    });

    if (monitoringState.slowlog.length > 128) {
      monitoringState.slowlog.shift();
    }
  }
}

function getSlowlog() {
  return monitoringState.slowlog
    .map((entry, index) => {
      return `ID: ${index}, Timestamp: ${entry.timestamp}, Duration: ${entry.duration}ms, Command: ${entry.command}`;
    })
    .join("\n");
}

function incrementCommandCount() {
  monitoringState.totalCommandsProcessed += 1;
}

function registerClient(clientId) {
  monitoringState.connectedClients.add(clientId);
}

function unregisterClient(clientId) {
  monitoringState.connectedClients.delete(clientId);
}

function getInfo(store) {
  const uptimeSeconds = Math.floor(
    (Date.now() - monitoringState.startTime) / 1000
  );
  const memoryUsage = process.memoryUsage();
  const keysByType = store.getKeyspaceStats?.() || {}; // Add this if needed

  return `
# Server
uptime_in_seconds:${uptimeSeconds}
total_commands_processed:${monitoringState.totalCommandsProcessed}
connected_clients:${monitoringState.connectedClients.size}

# Memory
rss:${memoryUsage.rss}
heapTotal:${memoryUsage.heapTotal}
heapUsed:${memoryUsage.heapUsed}

# Keyspace
${Object.entries(keysByType)
  .map(([type, count]) => `db0:${type}=${count}`)
  .join("\n")}
`.trim();
}

module.exports = {
  monitoringState,
  incrementCommandCount,
  registerClient,
  unregisterClient,
  getInfo,
  getSlowlog,
  logIfSlow,
  setSlowlogThreshold,
};
