// network/socketRegistry.js
const socketMap = new Map();

function register(clientId, socket) {
  socketMap.set(clientId, socket);
}

function unregister(clientId) {
  socketMap.delete(clientId);
}

function getSocket(clientId) {
  return socketMap.get(clientId);
}

module.exports = {
  register,
  unregister,
  getSocket,
};
