const store = require("../core/datastore");
const bitmap = require("../core/types/bitmaps");

beforeEach(() => store.flush());

describe("Bitmap Commands", () => {
  test("SETBIT and GETBIT work correctly", () => {
    expect(bitmap.setbit(store, "mykey", 7, 1)).toBe(0);
    expect(bitmap.getbit(store, "mykey", 7)).toBe(1);
    expect(bitmap.getbit(store, "mykey", 6)).toBe(0);
  });

  test("SETBIT updates bit and returns previous bit", () => {
    bitmap.setbit(store, "mykey", 7, 1);
    expect(bitmap.setbit(store, "mykey", 7, 0)).toBe(1);
    expect(bitmap.getbit(store, "mykey", 7)).toBe(0);
  });

  test("BITCOUNT counts bits correctly", () => {
    bitmap.setbit(store, "key", 0, 1);
    bitmap.setbit(store, "key", 1, 1);
    bitmap.setbit(store, "key", 2, 0);
    bitmap.setbit(store, "key", 8, 1);
    expect(bitmap.bitcount(store, "key")).toBe(3);
  });

  test("BITOP AND, OR, XOR", () => {
    bitmap.setbit(store, "a", 0, 1);
    bitmap.setbit(store, "a", 1, 1);
    bitmap.setbit(store, "b", 1, 1);
    bitmap.setbit(store, "b", 2, 1);

    expect(bitmap.bitop(store, "AND", "res1", "a", "b")).toBeGreaterThan(0);
    expect(bitmap.bitcount(store, "res1")).toBe(1);

    expect(bitmap.bitop(store, "OR", "res2", "a", "b")).toBeGreaterThan(0);
    expect(bitmap.bitcount(store, "res2")).toBe(3);

    expect(bitmap.bitop(store, "XOR", "res3", "a", "b")).toBeGreaterThan(0);
    expect(bitmap.bitcount(store, "res3")).toBe(2);
  });

  test("BITOP NOT works on a single key", () => {
    bitmap.setbit(store, "one", 0, 1);
    const len = bitmap.bitop(store, "NOT", "notres", "one");
    expect(len).toBeGreaterThan(0);
    expect(bitmap.getbit(store, "notres", 0)).toBe(0);
  });
});
