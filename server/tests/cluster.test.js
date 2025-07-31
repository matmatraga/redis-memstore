const cluster = require("../core/clusterManager");

describe("Cluster Mode", () => {
  beforeAll(() => {
    cluster.assignSlots(["node-1", "node-2"]);
  });

  test("assigns slot ranges across nodes", () => {
    const slots = cluster.getClusterSlots();
    expect(slots.length).toBe(2);
    expect(slots[0].nodeId).toBe("node-1");
    expect(slots[1].nodeId).toBe("node-2");
    expect(slots[0].slots[0]).toBe(0);
    expect(slots[1].slots[1]).toBe(16383);
  });

  test("computes slot for a key using CRC16", () => {
    const slot = cluster.getSlotForKey("mykey");
    expect(typeof slot).toBe("number");
    expect(slot).toBeGreaterThanOrEqual(0);
    expect(slot).toBeLessThanOrEqual(16383);
  });

  test("finds node for a given key", () => {
    const node = cluster.getNodeForKey("mykey");
    expect(typeof node).toBe("string");
    expect(["node-1", "node-2"]).toContain(node);
  });
});
