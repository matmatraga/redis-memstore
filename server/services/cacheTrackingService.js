// services/cacheTrackingService.js
const keyWatchers = new Map();

function trackKeyRead(clientId, key) {
  if (!keyWatchers.has(key)) keyWatchers.set(key, new Set());
  keyWatchers.get(key).add(clientId);
}

function getClientsWatchingKey(key) {
  return [...(keyWatchers.get(key) || [])];
}

function clearWatchersForKey(key) {
  keyWatchers.delete(key);
}

module.exports = {
  trackKeyRead,
  getClientsWatchingKey,
  clearWatchersForKey,
};
