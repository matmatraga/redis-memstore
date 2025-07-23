// tests/bitfields.test.js
const store = require("../core/datastore");
const bitfields = require("../core/types/bitfields");

describe("Bitfields", () => {
  beforeEach(() => {
    store.flush();
  });

  test("BITFIELD SET and GET", () => {
    expect(bitfields.set(store, "bf", "u8", "0", 42)).toBe(42);
    expect(bitfields.get(store, "bf", "u8", "0")).toBe(42);
  });

  test("BITFIELD GET default to 0 when unset", () => {
    expect(bitfields.get(store, "bf", "u8", "0")).toBe(0);
  });

  test("BITFIELD INCRBY", () => {
    bitfields.set(store, "bf", "u8", "0", 10);
    expect(bitfields.incrby(store, "bf", "u8", "0", 5)).toBe(15);
    expect(bitfields.get(store, "bf", "u8", "0")).toBe(15);
  });

  test("Negative offset and signed types", () => {
    bitfields.set(store, "bf", "i8", "-8", -10);
    expect(bitfields.get(store, "bf", "i8", "-8")).toBe(-10);
  });
});
