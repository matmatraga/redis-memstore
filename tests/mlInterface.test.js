// tests/mlInterface.test.js

const fs = require("fs");
const path = require("path");
const assert = require("assert");
const {
  exportVectorsToJSON,
  importVectorsFromJSON,
} = require("../server/utils/mlInterface");

describe("ML Interface", () => {
  const testFile = path.join(__dirname, "temp_vectors_test.json");

  // Sample vector map for testing
  const sampleMap = new Map([
    ["vec1", [1, 2, 3]],
    ["vec2", [4.5, 5.5, 6.5]],
  ]);

  afterEach(() => {
    // Clean up the test file
    if (fs.existsSync(testFile)) fs.unlinkSync(testFile);
  });

  it("should export vectors to a JSON file correctly", () => {
    exportVectorsToJSON(testFile, sampleMap);
    const raw = fs.readFileSync(testFile, "utf-8");
    const data = JSON.parse(raw);

    assert.strictEqual(Array.isArray(data), true);
    assert.strictEqual(data.length, 2);

    const vec1 = data.find((d) => d.key === "vec1");
    const vec2 = data.find((d) => d.key === "vec2");

    assert.deepStrictEqual(vec1.vector, [1, 2, 3]);
    assert.deepStrictEqual(vec2.vector, [4.5, 5.5, 6.5]);
  });

  it("should import vectors from a JSON file correctly", () => {
    // Export first, then import
    exportVectorsToJSON(testFile, sampleMap);
    const imported = importVectorsFromJSON(testFile);

    assert.ok(imported instanceof Map);
    assert.deepStrictEqual(imported.get("vec1"), [1, 2, 3]);
    assert.deepStrictEqual(imported.get("vec2"), [4.5, 5.5, 6.5]);
  });

  it("should throw an error on invalid vector format during import", () => {
    const invalidJSON = '[{ "key": "vec1", "vector": "not-an-array" }]';
    fs.writeFileSync(testFile, invalidJSON);

    assert.throws(() => {
      importVectorsFromJSON(testFile);
    }, /Invalid vector data format/);
  });
});
