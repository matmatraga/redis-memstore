const store = require("../server/core/datastore");
const lists = require("../server/core/types/lists");

describe("List Commands", () => {
  beforeEach(() => {
    store.store.clear();
    store.expirations.clear();
  });

  test("LPUSH: adds values to the head of the list", () => {
    expect(lists.lpush(store, "mylist", "world")).toBe(1);
    expect(lists.lpush(store, "mylist", "hello")).toBe(2);
    expect(store.get("mylist")).toEqual(["hello", "world"]);
  });

  test("RPUSH: adds values to the tail of the list", () => {
    expect(lists.rpush(store, "mylist", "hello")).toBe(1);
    expect(lists.rpush(store, "mylist", "world")).toBe(2);
    expect(store.get("mylist")).toEqual(["hello", "world"]);
  });

  test("LPOP: removes and returns the first element", () => {
    lists.rpush(store, "mylist", "one", "two", "three");
    expect(lists.lpop(store, "mylist")).toBe("one");
    expect(store.get("mylist")).toEqual(["two", "three"]);
  });

  test("RPOP: removes and returns the last element", () => {
    lists.rpush(store, "mylist", "one", "two", "three");
    expect(lists.rpop(store, "mylist")).toBe("three");
    expect(store.get("mylist")).toEqual(["one", "two"]);
  });

  test("LRANGE: returns elements between start and stop (inclusive)", () => {
    lists.rpush(store, "mylist", "a", "b", "c", "d", "e");
    expect(lists.lrange(store, "mylist", 0, 2)).toEqual(["a", "b", "c"]);
    expect(lists.lrange(store, "mylist", 1, 3)).toEqual(["b", "c", "d"]);
  });

  test("LRANGE with negative indexes", () => {
    lists.rpush(store, "mylist", "a", "b", "c", "d", "e");
    expect(lists.lrange(store, "mylist", -3, -1)).toEqual(["c", "d", "e"]);
    expect(lists.lrange(store, "mylist", -2, -2)).toEqual(["d"]);
  });

  test("LRANGE out-of-bounds or invalid returns []", () => {
    expect(lists.lrange(store, "noList", 0, 1)).toEqual([]);
    lists.rpush(store, "short", "only");
    expect(lists.lrange(store, "short", 5, 10)).toEqual([]);
  });

  test("LINDEX: gets element by index", () => {
    lists.rpush(store, "mylist", "one", "two", "three");
    expect(lists.lindex(store, "mylist", 0)).toBe("one");
    expect(lists.lindex(store, "mylist", 2)).toBe("three");
    expect(lists.lindex(store, "mylist", 3)).toBe(null);
  });

  test("LSET: sets the list element at index", () => {
    lists.rpush(store, "mylist", "one", "two", "three");
    expect(lists.lset(store, "mylist", 1, "TWO")).toBe("OK");
    expect(store.get("mylist")).toEqual(["one", "TWO", "three"]);
  });

  test("LSET: index out of range", () => {
    lists.rpush(store, "mylist", "one");
    expect(lists.lset(store, "mylist", 5, "fail")).toBe(
      "ERR index out of range"
    );
  });

  test("Wrong type error on list operations", () => {
    store.set("notalist", "hello");
    expect(lists.lpush(store, "notalist", "x")).toBe("ERR wrong type");
    expect(lists.rpush(store, "notalist", "x")).toBe("ERR wrong type");
    expect(lists.lset(store, "notalist", 0, "x")).toBe("ERR wrong type");
    expect(lists.lindex(store, "notalist", 0)).toBe(null);
    expect(lists.lrange(store, "notalist", 0, 1)).toEqual([]);
    expect(lists.lpop(store, "notalist")).toBe(null);
    expect(lists.rpop(store, "notalist")).toBe(null);
  });
});
