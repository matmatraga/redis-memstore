// tests/json.test.js
const store = require("../core/datastore");
const json = require("../core/types/json");

beforeEach(() => {
  store.flush(); // Clear the store before each test to isolate state
});

describe("JSON commands", () => {
  describe("set", () => {
    test("sets JSON at root path", () => {
      const res = json.set(store, "mykey", "$", '{"name":"Matt"}');
      expect(res).toBe("OK");
      expect(store.get("mykey")).toEqual({ name: "Matt" });
    });

    test("fails on invalid JSON", () => {
      const res = json.set(store, "mykey", "$", "name:Matt");
      expect(res).toBe("ERR invalid JSON");
    });

    test("sets nested path with $.", () => {
      store.set("doc", { user: { name: "Old" } });
      const res = json.set(store, "doc", "$.user.name", '"New"');
      expect(res).toBe("OK");
      expect(store.get("doc").user.name).toBe("New");
    });

    test("sets recursively with $..", () => {
      store.set("doc", { a: { name: "A" }, b: { name: "B" } });
      const res = json.set(store, "doc", "$..name", '"Zed"');
      expect(res).toBe("OK");
      expect(store.get("doc")).toEqual({
        a: { name: "Zed" },
        b: { name: "Zed" },
      });
    });

    test("fails if path is not valid or traversable", () => {
      store.set("doc", { a: 123 });
      const res = json.set(store, "doc", "$.a.b", '"fail"');
      expect(res).toBeNull();
    });

    test("fails to set non-root on new key", () => {
      const res = json.set(store, "newkey", "$.name", '"fail"');
      expect(res).toBe("ERR new objects must be created at the root");
    });
  });

  describe("get", () => {
    test("gets entire JSON object", () => {
      store.set("mykey", { name: "Matt" });
      const res = json.get(store, "mykey");
      expect(res).toBe(JSON.stringify({ name: "Matt" }));
    });

    test("gets nested value via path", () => {
      store.set("doc", { user: { age: 30 } });
      const res = json.get(store, "doc", "$.user.age");
      expect(res).toBe("30");
    });

    test("returns null if key does not exist", () => {
      const res = json.get(store, "nokey");
      expect(res).toBeNull();
    });

    test("returns error on invalid path", () => {
      store.set("doc", { user: "Matt" });
      const res = json.get(store, "doc", "$.user[");
      expect(res).toBe("ERR invalid path");
    });
  });

  describe("del", () => {
    test("deletes key with root path", () => {
      store.set("delkey", { x: 1 });
      const res = json.del(store, "delkey");
      expect(res).toBe(1);
      expect(store.get("delkey")).toBeNull();
    });

    test("errors on non-root path", () => {
      const res = json.del(store, "delkey", "$.x");
      expect(res).toBe('ERR only root path "$" is supported for JSON.DEL');
    });
  });

  describe("arrappend", () => {
    test("appends to JSON array", () => {
      store.set("arr", { items: [1, 2] });
      const res = json.arrappend(store, "arr", "$.items", "3", "4");
      expect(res).toBe(4);
      expect(store.get("arr").items).toEqual([1, 2, 3, 4]);
    });

    test("returns error if target is not array", () => {
      store.set("arr", { items: 123 });
      const res = json.arrappend(store, "arr", "$.items", "4");
      expect(res).toBe("ERR path must point to an array");
    });

    test("returns null if key does not exist", () => {
      const res = json.arrappend(store, "arr", "$.items", "4");
      expect(res).toBeNull();
    });

    test("returns error on invalid path", () => {
      store.set("arr", { items: [1] });
      const res = json.arrappend(store, "arr", "$.items[", "4");
      expect(res).toBe("ERR invalid path");
    });
  });
});
