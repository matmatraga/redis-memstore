const assert = require("assert");
const store = require("../core/datastore");
const vector = require("../core/types/vector");

describe("Vector Commands", () => {
  beforeEach(() => {
    store.flush();
  });

  describe("VSET and VGET", () => {
    it("should set and get a vector", () => {
      const result = vector.set(["vec1", "[1,2,3]"]);
      assert.strictEqual(result, "OK");

      const retrieved = vector.get(["vec1"]);
      assert.strictEqual(retrieved, "[1,2,3]");
    });

    it("should return error for invalid vector", () => {
      const result = vector.set(["vec1", "not-a-vector"]);
      assert.strictEqual(result, "ERR invalid vector format");
    });
  });

  describe("VDIST", () => {
    it("should compute euclidean distance", () => {
      vector.set(["vec1", "[1,2,3]"]);
      vector.set(["vec2", "[4,5,6]"]);
      const result = vector.dist(["vec1", "vec2", "DISTANCE", "euclidean"]);
      assert.strictEqual(result, "5.196152");
    });

    it("should compute cosine distance", () => {
      vector.set(["vec1", "[1,0,0]"]);
      vector.set(["vec2", "[0,1,0]"]);
      const result = vector.dist(["vec1", "vec2", "DISTANCE", "cosine"]);
      assert.strictEqual(result, "1.000000");
    });
  });

  describe("VSEARCH", () => {
    it("should find k nearest vectors", () => {
      vector.set(["vec1", "[1,2,3]"]);
      vector.set(["vec2", "[1,2,4]"]);
      vector.set(["vec3", "[10,10,10]"]);

      const results = vector.search(["vec1", "3", "DISTANCE", "euclidean"]);
      assert.ok(Array.isArray(results));
      assert.strictEqual(results.length, 3);

      const combined = results.join(" ");
      assert.ok(combined.includes("vec1"));
      assert.ok(combined.includes("vec2"));
      assert.ok(combined.includes("vec3"));
    });
  });
});
