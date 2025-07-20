const dataStore = require("../core/datastore");

describe("DataStore", () => {
  beforeEach(() => {
    dataStore.store.clear();
    dataStore.expirations.clear();
  });

  test("set and get", () => {
    expect(dataStore.set("key1", "value1")).toBe("OK");
    expect(dataStore.get("key1")).toBe("value1");
  });

  test("get returns null for missing key", () => {
    expect(dataStore.get("missing")).toBe(null);
  });

  test("exists returns 1 for existing key and 0 for missing", () => {
    dataStore.set("key1", "value1");
    expect(dataStore.exists("key1")).toBe(1);
    expect(dataStore.exists("key2")).toBe(0);
  });

  test("del removes key", () => {
    dataStore.set("key1", "value1");
    expect(dataStore.del("key1")).toBe(1);
    expect(dataStore.get("key1")).toBe(null);
  });

  test("expire sets expiration and ttl returns correct time", (done) => {
    dataStore.set("key1", "value1");
    expect(dataStore.expire("key1", 2)).toBe(1);
    expect(dataStore.ttl("key1")).toBeGreaterThanOrEqual(1);
    setTimeout(() => {
      expect(dataStore.ttl("key1")).toBeLessThanOrEqual(1);
      done();
    }, 1100);
  });

  test("ttl returns -2 if expired or not set, -1 if no expiration", () => {
    expect(dataStore.ttl("missing")).toBe(-2);
    dataStore.set("key1", "value1");
    expect(dataStore.ttl("key1")).toBe(-1);
  });

  test("persist removes expiration", () => {
    dataStore.set("key1", "value1");
    dataStore.expire("key1", 1);
    expect(dataStore.persist("key1")).toBe(1);
    expect(dataStore.ttl("key1")).toBe(-1);
  });

  test("has returns true if key exists and not expired", () => {
    dataStore.set("key1", "value1");
    expect(dataStore.has("key1")).toBe(true);
    dataStore.del("key1");
    expect(dataStore.has("key1")).toBe(false);
  });

  afterAll(() => {
    jest.useRealTimers(); // Restore real timers if you're using fake timers anywhere
  });
});
