// tests/bloomfilter.test.js
const bloom = require("../server/core/types/bloomfilter");
const store = require("../server/core/datastore");

describe("Bloom Filter", () => {
  beforeEach(() => {
    store.flush(); // clear the store before each test
  });

  test("BF.RESERVE initializes a filter", () => {
    expect(bloom.reserve(store, "bf", "0.01", "1000")).toBe("OK");
  });

  test("BF.ADD stores and detects value", () => {
    bloom.reserve(store, "bf", "0.01", "1000");
    expect(bloom.add(store, "bf", "apple")).toBe(1);
    expect(bloom.exists(store, "bf", "apple")).toBe(1);
    expect(bloom.exists(store, "bf", "banana")).toBe(0); // false positives are possible, but rare
  });

  test("BF.ADD returns error for missing key", () => {
    expect(bloom.add(store, "missingKey", "value")).toBe("ERR no such key");
  });

  test("BF.RESERVE returns error if key exists", () => {
    bloom.reserve(store, "bf", "0.01", "1000");
    expect(bloom.reserve(store, "bf", "0.01", "1000")).toBe(
      "ERR key already exists"
    );
  });

  test("BF.RESERVE returns error for invalid input", () => {
    expect(bloom.reserve(store, "bf", "0", "100")).toBe(
      "ERR invalid error rate or capacity"
    );
    expect(bloom.reserve(store, "bf", "-1", "100")).toBe(
      "ERR invalid error rate or capacity"
    );
    expect(bloom.reserve(store, "bf", "0.01", "-5")).toBe(
      "ERR invalid error rate or capacity"
    );
    expect(bloom.reserve(store, "bf", "not-a-number", "1000")).toBe(
      "ERR invalid error rate or capacity"
    );
  });
});
