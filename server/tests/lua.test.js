const { runLuaScript } = require("../core/luaEngine");

describe("Lua Scripting (EVAL)", () => {
  let store;

  beforeEach(() => {
    store = new Map();
    store.set("foo", "bar");
  });

  test("should return value using redis.get", () => {
    const result = runLuaScript(
      "return redis.get(KEYS[0])",
      ["foo"],
      [],
      store
    );
    expect(result).toBe("bar");
  });

  test("should store and retrieve value using redis.set and redis.get", () => {
    runLuaScript("redis.set(KEYS[0], ARGV[0])", ["x"], ["123"], store);
    const result = runLuaScript("return redis.get(KEYS[0])", ["x"], [], store);
    expect(result).toBe("123");
  });

  test("should support redis.incr", () => {
    store.set("counter", "5");
    const result = runLuaScript(
      "return redis.incr(KEYS[0])",
      ["counter"],
      [],
      store
    );
    expect(result).toBe(6);
  });

  test("should support redis.decr", () => {
    store.set("counter", "3");
    const result = runLuaScript(
      "return redis.decr(KEYS[0])",
      ["counter"],
      [],
      store
    );
    expect(result).toBe(2);
  });

  test("should handle invalid Lua script", () => {
    const result = runLuaScript(
      "return redis.notAFunction()",
      ["foo"],
      [],
      store
    );
    expect(result).toMatch(/^ERR/);
  });
});
