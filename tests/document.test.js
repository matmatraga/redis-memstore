// tests/document.test.js
const assert = require("assert");
const store = require("../server/core/datastore");
const documentCommands = require("../server/core/types/documents");

describe("Document Commands", () => {
  beforeEach(() => {
    store.flush();
  });

  it("DOC.SET and DOC.GET", () => {
    assert.strictEqual(
      documentCommands["DOC.SET"](["u1", '{"name":"Ana","age":30}']),
      "OK"
    );
    assert.strictEqual(
      documentCommands["DOC.GET"](["u1"]),
      '{"name":"Ana","age":30}'
    );
  });

  it("DOC.GET with path", () => {
    documentCommands["DOC.SET"]([
      "u2",
      '{"name":"Ben","age":25,"skills":["JS","Node"]}',
    ]);
    assert.strictEqual(documentCommands["DOC.GET"](["u2", "$.name"]), '"Ben"');
    assert.strictEqual(
      documentCommands["DOC.GET"](["u2", "$.skills[0]"]),
      '"JS"'
    );
  });

  it("DOC.DEL", () => {
    documentCommands["DOC.SET"](["u3", '{"name":"Test"}']);
    assert.strictEqual(documentCommands["DOC.DEL"](["u3"]), 1);
    assert.strictEqual(documentCommands["DOC.DEL"](["uX"]), 0);
  });

  it("DOC.UPDATE", () => {
    documentCommands["DOC.SET"](["u4", '{"age":25}']);
    assert.strictEqual(
      documentCommands["DOC.UPDATE"](["u4", "$.age", "28"]),
      "OK"
    );
    assert.strictEqual(
      JSON.parse(documentCommands["DOC.GET"](["u4", "$.age"])),
      28
    );
  });

  it("DOC.ARRAPPEND", () => {
    documentCommands["DOC.SET"](["u5", '{"skills":["JS"]}']);
    assert.strictEqual(
      documentCommands["DOC.ARRAPPEND"](["u5", "$.skills", "Node"]),
      2
    );
    assert.strictEqual(
      documentCommands["DOC.GET"](["u5", "$.skills"]),
      '["JS","Node"]'
    );
  });

  it("DOC.INDEX and DOC.FIND", () => {
    documentCommands["DOC.SET"](["u6", '{"age":40}']);
    documentCommands["DOC.SET"](["u7", '{"age":40}']);
    assert.strictEqual(documentCommands["DOC.INDEX"](["age"]), "OK");
    assert.deepStrictEqual(
      JSON.parse(documentCommands["DOC.FIND"](["age", "40"])).sort(),
      ["u6", "u7"]
    );
  });

  it("DOC.AGGREGATE", () => {
    documentCommands["DOC.SET"](["u8", '{"age":20}']);
    documentCommands["DOC.SET"](["u9", '{"age":30}']);
    assert.strictEqual(documentCommands["DOC.AGGREGATE"](["COUNT", "age"]), 2);
    assert.strictEqual(documentCommands["DOC.AGGREGATE"](["SUM", "age"]), 50);
    assert.strictEqual(
      documentCommands["DOC.AGGREGATE"](["AVG", "age"]),
      "25.00"
    );
  });

  it("DOC.QUERY", () => {
    documentCommands["DOC.SET"](["u10", '{"age":35}']);
    documentCommands["DOC.SET"](["u11", '{"age":40}']);
    assert.deepStrictEqual(
      JSON.parse(documentCommands["DOC.QUERY"](["age", ">", "30"])).sort(),
      ["u10", "u11"]
    );
  });
});
