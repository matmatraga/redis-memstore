const store = require("../core/datastore");
const hash = require("../core/types/hashes");

describe("Hash commands", () => {
  beforeEach(() => {
    store.flush();
  });

  describe("HSET", () => {
    test("sets a new field and returns 1", () => {
      const res = hash.hset(store, "myhash", "field1", "value1");
      expect(res).toBe(1);
    });

    test("overwrites existing field and returns 0", () => {
      hash.hset(store, "myhash", "field1", "value1");
      const res = hash.hset(store, "myhash", "field1", "newvalue");
      expect(res).toBe(0);
    });

    test("sets multiple fields and returns count of new fields", () => {
      const res = hash.hset(store, "myhash", "field1", "v1", "field2", "v2");
      expect(res).toBe(2);
    });

    test("returns error on wrong number of arguments", () => {
      const res = hash.hset(store, "myhash", "field1");
      expect(res).toBe("ERR wrong number of arguments for 'hset' command");
    });
  });

  describe("HGET", () => {
    test("gets an existing field value", () => {
      hash.hset(store, "myhash", "field1", "value1");
      const res = hash.hget(store, "myhash", "field1");
      expect(res).toBe("value1");
    });

    test("returns null for non-existing field", () => {
      hash.hset(store, "myhash", "field1", "value1");
      const res = hash.hget(store, "myhash", "field2");
      expect(res).toBeNull();
    });

    test("returns null for non-existing key", () => {
      const res = hash.hget(store, "nokey", "field1");
      expect(res).toBeNull();
    });
  });

  describe("HMSET", () => {
    test("sets multiple fields and returns OK", () => {
      const res = hash.hmset(store, "myhash", "f1", "v1", "f2", "v2");
      expect(res).toBe("OK");
    });

    test("overwrites existing field", () => {
      hash.hmset(store, "myhash", "f1", "v1");
      const res = hash.hmset(store, "myhash", "f1", "newv1", "f2", "v2");
      expect(res).toBe("OK");
      expect(hash.hget(store, "myhash", "f1")).toBe("newv1");
    });

    test("returns error on wrong number of arguments", () => {
      const res = hash.hmset(store, "myhash", "field1");
      expect(res).toBe("ERR wrong number of arguments for 'hmset' command");
    });
  });

  describe("HGETALL", () => {
    test("returns all fields and values as flat array", () => {
      hash.hset(store, "myhash", "f1", "v1", "f2", "v2");
      const res = hash.hgetall(store, "myhash");
      expect(res).toEqual(["f1", "v1", "f2", "v2"]);
    });

    test("returns empty array for non-existing key", () => {
      const res = hash.hgetall(store, "nokey");
      expect(res).toEqual([]);
    });
  });

  describe("HDEL", () => {
    test("deletes existing field and returns 1", () => {
      hash.hset(store, "myhash", "f1", "v1");
      const res = hash.hdel(store, "myhash", "f1");
      expect(res).toBe(1);
    });

    test("deletes multiple fields and returns correct count", () => {
      hash.hset(store, "myhash", "f1", "v1", "f2", "v2");
      const res = hash.hdel(store, "myhash", "f1", "f2", "f3");
      expect(res).toBe(2);
    });

    test("returns 0 if key or fields do not exist", () => {
      const res = hash.hdel(store, "nokey", "field");
      expect(res).toBe(0);
    });
  });

  describe("HEXISTS", () => {
    test("returns 1 if field exists", () => {
      hash.hset(store, "myhash", "f1", "v1");
      const res = hash.hexists(store, "myhash", "f1");
      expect(res).toBe(1);
    });

    test("returns 0 if field does not exist", () => {
      hash.hset(store, "myhash", "f1", "v1");
      const res = hash.hexists(store, "myhash", "f2");
      expect(res).toBe(0);
    });

    test("returns 0 if key does not exist", () => {
      const res = hash.hexists(store, "nokey", "f1");
      expect(res).toBe(0);
    });
  });
});
