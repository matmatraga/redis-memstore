const strings = require("../server/core/types/strings");
const dataStore = require("../server/core/datastore");

describe("String Commands", () => {
  beforeEach(() => {
    dataStore.store.clear();
    dataStore.expirations.clear();
  });

  test("append: creates new key or appends to existing string", () => {
    expect(strings.append(dataStore, "key1", "Hello")).toBe(5);
    expect(strings.append(dataStore, "key1", " World")).toBe(11);
    expect(dataStore.get("key1")).toBe("Hello World");
  });

  test("strlen: returns correct length", () => {
    dataStore.set("key2", "OpenAI");
    expect(strings.strlen(dataStore, "key2")).toBe(6);
    expect(strings.strlen(dataStore, "missing")).toBe(0);
  });

  test("getrange: returns correct substring (inclusive)", () => {
    dataStore.set("key3", "Hello World");
    expect(strings.getrange(dataStore, "key3", 0, 4)).toBe('"Hello"');
    expect(strings.getrange(dataStore, "key3", 6, 10)).toBe('"World"');
  });

  test("getrange: handles negative indices and out of range", () => {
    dataStore.set("key4", "abcdef");
    expect(strings.getrange(dataStore, "key4", -3, -1)).toBe('"def"');
    expect(strings.getrange(dataStore, "key4", 10, 15)).toBe('""');
  });

  test("setrange: modifies existing string and returns new length", () => {
    dataStore.set("key5", "Hello World");
    expect(strings.setrange(dataStore, "key5", 6, "Redis")).toBe(11);
    expect(dataStore.get("key5")).toBe("Hello Redis");
  });

  test("setrange: creates padded string if key does not exist or offset exceeds length", () => {
    expect(strings.setrange(dataStore, "key6", 4, "Test")).toBe(8);
    expect(dataStore.get("key6")).toBe("    Test");
  });

  test("incr/incrby/decr: work with integers and update correctly", () => {
    dataStore.set("counter", "5");
    expect(strings.incr(dataStore, "counter")).toBe(6);
    expect(strings.decr(dataStore, "counter")).toBe(5);
    expect(strings.incrby(dataStore, "counter", 10)).toBe(15);
    expect(dataStore.get("counter")).toBe("15");
  });

  test("incrby: throws error for non-integer values", () => {
    dataStore.set("bad", "hello");
    expect(() => strings.incrby(dataStore, "bad", 5)).toThrow(
      "ERR value is not an integer or out of range"
    );
  });
});
