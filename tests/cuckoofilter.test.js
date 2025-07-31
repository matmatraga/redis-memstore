// tests/cuckoofilter.test.js
const cuckoo = require("../server/core/types/cuckoofilter");

describe("Cuckoo Filter", () => {
  let store;

  beforeEach(() => {
    store = new Map();
  });

  test("CF.RESERVE initializes the filter", () => {
    const result = cuckoo.reserve(store, "cf", "100", "4", "500");
    expect(result).toBe("OK");

    const data = store.get("cf");
    expect(data).toBeDefined();
    expect(data.capacity).toBe(100);
    expect(data.bucketSize).toBe(4);
    expect(data.maxKicks).toBe(500);
  });

  test("CF.ADD inserts item into filter", () => {
    cuckoo.reserve(store, "cf", "50");
    const res = cuckoo.add(store, "cf", "apple");
    expect(res).toBe(1);
  });

  test("CF.EXISTS detects inserted item", () => {
    cuckoo.reserve(store, "cf", "50");
    cuckoo.add(store, "cf", "banana");

    expect(cuckoo.exists(store, "cf", "banana")).toBe(1);
    expect(cuckoo.exists(store, "cf", "orange")).toBe(0); // false positives possible, but rare
  });

  test("CF.DEL removes existing item", () => {
    cuckoo.reserve(store, "cf", "50");
    cuckoo.add(store, "cf", "cherry");
    expect(cuckoo.del(store, "cf", "cherry")).toBe(1);
    expect(cuckoo.exists(store, "cf", "cherry")).toBe(0);
  });

  test("CF.ADD fails if key does not exist", () => {
    expect(cuckoo.add(store, "missing", "x")).toBe("ERR no such key");
  });

  test("CF.RESERVE fails if key already exists", () => {
    cuckoo.reserve(store, "cf", "20");
    const res = cuckoo.reserve(store, "cf", "20");
    expect(res).toBe("ERR key already exists");
  });
});
