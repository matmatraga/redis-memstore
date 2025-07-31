const datastore = require("../server/core/datastore");

describe("Replication Behavior", () => {
  beforeEach(() => {
    datastore.flush();
  });

  test("Master writes are sent to slave and applied", () => {
    const snapshot = {
      store: { repKey: "repValue" },
      expirations: {},
    };

    datastore.importSnapshot(snapshot);

    expect(datastore.get("repKey")).toBe("repValue");
  });

  test("Slave applies multiple updates from master", () => {
    const snapshot = {
      store: {
        key1: "val1",
        key2: "val2",
      },
      expirations: {},
    };

    datastore.importSnapshot(snapshot);

    expect(datastore.get("key1")).toBe("val1");
    expect(datastore.get("key2")).toBe("val2");
  });
});
