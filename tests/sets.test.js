const store = require("../server/core/datastore");
const sets = require("../server/core/types/sets");

afterEach(() => {
  for (const key of store.store.keys()) {
    store.del(key);
  }
});

test("SADD adds unique members", () => {
  expect(sets.sadd(store, "myset", "a", "b")).toBe(2);
  expect(sets.sadd(store, "myset", "a", "c")).toBe(1);
});

test("SCARD returns correct cardinality", () => {
  sets.sadd(store, "myset", "a", "b");
  expect(sets.scard(store, "myset")).toBe(2);
});

test("SMEMBERS returns all set members", () => {
  sets.sadd(store, "myset", "a", "b");
  const result = sets.smembers(store, "myset");
  const lines = result.split("\n");
  expect(lines.length).toBe(2);
  expect(lines[0]).toMatch(/^1\) [ab]$/);
  expect(lines[1]).toMatch(/^2\) [ab]$/);
});

test("SREM removes members", () => {
  sets.sadd(store, "myset", "a", "b", "c");
  expect(sets.srem(store, "myset", "a", "d")).toBe(1);
  expect(sets.sismember(store, "myset", "a")).toBe(0);
});

test("SISMEMBER checks membership", () => {
  sets.sadd(store, "myset", "a");
  expect(sets.sismember(store, "myset", "a")).toBe(1);
  expect(sets.sismember(store, "myset", "b")).toBe(0);
});

test("SPOP removes and returns a random element", () => {
  sets.sadd(store, "myset", "a", "b");
  const popped = sets.spop(store, "myset");
  expect(popped).toMatch(/^"([ab])"$/);
  expect(sets.scard(store, "myset")).toBe(1);
});

test("SRANDMEMBER returns random member without removing", () => {
  sets.sadd(store, "myset", "a", "b");
  const member = sets.srandmember(store, "myset");
  expect(member).toMatch(/^"([ab])"$/);
  expect(sets.scard(store, "myset")).toBe(2);
});

test("SUNION returns union of sets", () => {
  sets.sadd(store, "a", "x", "y");
  sets.sadd(store, "b", "y", "z");
  const result = sets.sunion(store, "a", "b");
  expect(result).toMatch(/1\) "x"|y|z/);
  expect(result).toMatch(/2\) "x"|y|z/);
  expect(result).toMatch(/3\) "x"|y|z/);
});

test("SINTER returns intersection of sets", () => {
  sets.sadd(store, "a", "x", "y");
  sets.sadd(store, "b", "y", "z");
  const result = sets.sinter(store, "a", "b");
  expect(result).toBe('1) "y"');
});

test("SDIFF returns difference of sets", () => {
  sets.sadd(store, "a", "x", "y", "z");
  sets.sadd(store, "b", "y");
  const result = sets.sdiff(store, "a", "b");
  const lines = result.split("\n");
  expect(lines).toContain('1) "x"');
  expect(lines).toContain('2) "z"');
});
