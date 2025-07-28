const {
  monitoringState,
  incrementCommandCount,
  registerClient,
  unregisterClient,
  getInfo,
  logIfSlow,
  setSlowlogThreshold,
} = require("../core/monitoring");
const store = {
  getKeyspaceStats: () => ({ strings: 5, sets: 2 }),
};

describe("Monitoring and Management", () => {
  beforeEach(() => {
    monitoringState.totalCommandsProcessed = 0;
    monitoringState.connectedClients.clear();
    monitoringState.slowlog.length = 0;
    monitoringState.slowlog = [];
    setSlowlogThreshold(50);
  });

  test("incrementCommandCount should increase command count", () => {
    incrementCommandCount();
    incrementCommandCount();
    expect(monitoringState.totalCommandsProcessed).toBe(2);
  });

  test("registerClient and unregisterClient should manage client set", () => {
    registerClient("client1");
    registerClient("client2");
    expect(monitoringState.connectedClients.has("client1")).toBe(true);
    expect(monitoringState.connectedClients.size).toBe(2);
    unregisterClient("client1");
    expect(monitoringState.connectedClients.has("client1")).toBe(false);
    expect(monitoringState.connectedClients.size).toBe(1);
  });

  test("getInfo should return formatted stats string", () => {
    const info = getInfo(store);
    expect(info).toMatch(/uptime_in_seconds:/);
    expect(info).toMatch(/total_commands_processed:/);
    expect(info).toMatch(/connected_clients:/);
    expect(info).toMatch(/rss:/);
    expect(info).toMatch(/db0:strings=5/);
  });

  test("logIfSlow should log slow commands exceeding threshold", () => {
    logIfSlow("SET key value", 100);
    logIfSlow("GET key", 10);
    const logs = monitoringState.slowlog.map((e) => e.command);
    expect(logs).toContain("SET key value");
    expect(logs).not.toContain("GET key");
    expect(monitoringState.slowlog.length).toBe(1);
  });

  test("logIfSlow should cap logs at 128 entries", () => {
    for (let i = 0; i < 130; i++) {
      logIfSlow(`SLOWCMD ${i}`, 100);
    }
    expect(monitoringState.slowlog.length).toBeLessThanOrEqual(128);
  });
});
