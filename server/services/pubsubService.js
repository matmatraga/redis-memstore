// server/services/pubsubService.js

const channels = new Map(); // channel => Set<callback>

function subscribe(channel, callback) {
  if (!channels.has(channel)) {
    channels.set(channel, new Set());
  }
  channels.get(channel).add(callback);
}

function unsubscribe(channel, callback) {
  if (channels.has(channel)) {
    channels.get(channel).delete(callback);
    if (channels.get(channel).size === 0) {
      channels.delete(channel);
    }
  }
}

function publish(channel, message) {
  if (!channels.has(channel)) return 0;

  for (const callback of channels.get(channel)) {
    callback(message);
  }

  return channels.get(channel).size;
}

module.exports = {
  subscribe,
  unsubscribe,
  publish,
};
