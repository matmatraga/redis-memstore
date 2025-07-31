const stream = require("../server/core/types/streams");
const store = require("../server/core/datastore");

beforeEach(() => {
  store.flush();
});

test("XADD returns incrementing ID if * is used", () => {
  const id1 = stream.xadd(store, "mystream", "*", "foo", "bar");
  const id2 = stream.xadd(store, "mystream", "*", "baz", "qux");
  expect(id1).not.toBe(id2);
});

test("XREAD returns new entries", () => {
  const id1 = stream.xadd(store, "logs", "*", "m", "hello");
  const res = stream.xread(store, null, null, { streams: [["logs", "0-0"]] });

  expect(res).toEqual([["logs", [[id1, { m: "hello" }]]]]);
});

test("XRANGE returns entries between IDs", () => {
  const id1 = stream.xadd(store, "mylog", "*", "a", "1");
  const id2 = stream.xadd(store, "mylog", "*", "a", "2");

  const range = stream.xrange(store, "mylog", "0-0", id2);
  expect(range).toEqual([
    [id1, { a: "1" }],
    [id2, { a: "2" }],
  ]);
});

test("XLEN returns correct stream length", () => {
  stream.xadd(store, "l", "*", "x", "1");
  stream.xadd(store, "l", "*", "x", "2");
  expect(stream.xlen(store, "l")).toBe(2);
});

test("XGROUP CREATE initializes group", () => {
  const res = stream.xgroupCreate(store, "groupstream", "mygroup", "0-0");
  expect(res).toBe("OK");
});

test("XREADGROUP delivers new entries", () => {
  stream.xadd(store, "gs", "*", "v", "1");
  stream.xgroupCreate(store, "gs", "g1", "0-0");

  const res = stream.xreadgroup(store, "g1", "c1", null, {
    streams: [["gs", ">"]],
  });

  expect(res.length).toBe(1);
  expect(res[0][0]).toBe("gs");
  expect(res[0][1][0][1]).toEqual({ v: "1" });
});

test("XACK acknowledges messages", () => {
  const id = stream.xadd(store, "gstream", "*", "x", "1");
  stream.xgroupCreate(store, "gstream", "grp", "0-0");
  stream.xreadgroup(store, "grp", "cons1", null, {
    streams: [["gstream", ">"]],
  });

  const ack = stream.xack(store, "gstream", "grp", id);
  expect(ack).toBe(1);
});
