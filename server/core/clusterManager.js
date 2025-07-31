// core/clusterManager.js
const crc16 = require("../utils/crc16"); // utility to compute CRC16

// Default in-memory slot→node mapping
const clusterState = {
  nodes: {}, // { nodeId: [startSlot, endSlot] }
};

function assignSlots(nodeList) {
  const totalSlots = 16384;
  const slotsPerNode = Math.floor(totalSlots / nodeList.length);

  let start = 0;
  for (let i = 0; i < nodeList.length; i++) {
    const end =
      i === nodeList.length - 1 ? totalSlots - 1 : start + slotsPerNode - 1;
    clusterState.nodes[nodeList[i]] = [start, end];
    start = end + 1;
  }
}

function getSlotForKey(key) {
  return crc16(key) % 16384;
}

function getNodeForKey(key) {
  const slot = getSlotForKey(key);
  for (const [nodeId, [start, end]] of Object.entries(clusterState.nodes)) {
    if (slot >= start && slot <= end) return nodeId;
  }
  return null;
}

function getClusterSlots() {
  return Object.entries(clusterState.nodes).map(([nodeId, [start, end]]) => ({
    nodeId,
    slots: [start, end],
  }));
}

module.exports = {
  assignSlots,
  getSlotForKey,
  getNodeForKey,
  getClusterSlots,
};
