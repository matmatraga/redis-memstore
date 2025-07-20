const sortedSets = require("../core/types/sortedSets");

describe("Sorted Sets", () => {
  let store;

  beforeEach(() => {
    store = new Map();
  });

  test("ZADD basic insertion returns number of new elements", () => {
    const result = sortedSets.zadd(store, "myzset", "1", "one", "2", "two");
    expect(result).toBe(2);
  });

  test("ZADD with NX only inserts new members", () => {
    sortedSets.zadd(store, "myzset", "1", "one");
    const result = sortedSets.zadd(
      store,
      "myzset",
      "NX",
      "2",
      "one",
      "3",
      "two"
    );
    expect(result).toBe(1); // only "two" is new
  });

  test("ZADD with XX only updates existing members", () => {
    const zsetKey = "myzset_xx";
    sortedSets.zadd(store, zsetKey, "1", "one");
    const result = sortedSets.zadd(
      store,
      zsetKey,
      "XX",
      "CH",
      "2",
      "one",
      "1",
      "two"
    );
    expect(result).toBe(1); // "one" updated, "two" ignored
  });

  test("ZADD with GT updates only if new score is greater", () => {
    sortedSets.zadd(store, "myzset", "2", "one");
    const result = sortedSets.zadd(
      store,
      "myzset",
      "GT",
      "1",
      "one",
      "3",
      "two"
    );
    expect(result).toBe(1); // only "two" added; "one" not updated
  });

  test("ZADD with LT updates only if new score is lower", () => {
    sortedSets.zadd(store, "myzset", "2", "one");
    const result = sortedSets.zadd(
      store,
      "myzset",
      "LT",
      "3",
      "one",
      "1",
      "two"
    );
    expect(result).toBe(1); // only "two" added; "one" not updated
  });

  test("ZADD with INCR returns new score as string", () => {
    sortedSets.zadd(store, "myzset", "1", "one");
    const result = sortedSets.zadd(store, "myzset", "INCR", "2", "one");
    expect(result).toBe("3");
  });

  test("ZADD with CH returns number of elements added or updated", () => {
    sortedSets.zadd(store, "myzset", "1", "one");
    const result = sortedSets.zadd(
      store,
      "myzset",
      "CH",
      "2",
      "one",
      "3",
      "two"
    );
    expect(result).toBe(2); // "one" updated, "two" added
  });

  test("ZRANGE returns sorted members by score", () => {
    sortedSets.zadd(store, "myzset", "1", "one", "2", "two", "3", "three");
    const result = sortedSets.zrange(store, "myzset", 0, -1);
    expect(result).toEqual(["one", "two", "three"]);
  });

  test("ZREM removes members", () => {
    sortedSets.zadd(store, "myzset", "1", "one", "2", "two");
    const result = sortedSets.zrem(store, "myzset", "one", "three");
    expect(result).toBe(1);
    expect(sortedSets.zrange(store, "myzset", 0, -1)).toEqual(["two"]);
  });

  test("ZRANK returns index based on score sort order", () => {
    sortedSets.zadd(store, "myzset", "1", "one", "2", "two", "3", "three");
    expect(sortedSets.zrank(store, "myzset", "two")).toBe(1);
  });

  test("ZRANGEBYSCORE returns members within score range", () => {
    sortedSets.zadd(store, "myzset", "1", "one", "2", "two", "3", "three");
    const result = sortedSets.zrangebyscore(store, "myzset", "2", "3");
    expect(result).toEqual(["two", "three"]);
  });

  test("ZRANGEBYSCORE handles exclusive bounds", () => {
    sortedSets.zadd(store, "myzset", "1", "one", "2", "two", "3", "three");
    const result = sortedSets.zrangebyscore(store, "myzset", "(1", "3");
    expect(result).toEqual(["two", "three"]);
  });
});
