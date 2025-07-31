// tests/hyperloglog.test.js
const hyperloglog = require("../server/core/types/hyperloglog");
const store = require("../server/core/datastore");

describe("HyperLogLog", () => {
  beforeEach(() => {
    store.flush();
  });

  test("PFADD returns 1 when new elements are added", () => {
    const result = hyperloglog.pfadd(store, "hll", ["a", "b", "c"]);
    expect(result).toBe(1);
  });

  test("PFADD returns 0 when no new unique elements are added", () => {
    hyperloglog.pfadd(store, "hll", ["a", "b", "c"]);
    const result = hyperloglog.pfadd(store, "hll", ["a", "b"]);
    expect(result).toBe(0);
  });

  test("PFCOUNT returns approximate count of unique elements", () => {
    hyperloglog.pfadd(store, "hll", ["a", "b", "c", "d", "e"]);
    const count = hyperloglog.pfcount(store, ["hll"]);
    expect(count).toBeGreaterThanOrEqual(5);
  });

  test("PFMERGE merges multiple HyperLogLogs", () => {
    hyperloglog.pfadd(store, "hll1", ["a", "b", "c"]);
    hyperloglog.pfadd(store, "hll2", ["d", "e", "f"]);
    hyperloglog.pfmerge(store, "merged", ["hll1", "hll2"]);

    const count = hyperloglog.pfcount(store, ["merged"]);
    expect(count).toBeGreaterThanOrEqual(6);
  });

  test("PFCOUNT throws error for missing keys", () => {
    expect(() => hyperloglog.pfcount(store, [])).toThrow();
  });

  test("PFMERGE throws for empty sources", () => {
    expect(() => hyperloglog.pfmerge(store, "merged")).toThrow();
  });
});
