const timeseries = require("../core/types/timeseries");
const store = require("../core/datastore");

describe("Time Series", () => {
  beforeEach(() => {
    store.flush();
  });

  test("TS.CREATE creates a new series", () => {
    expect(timeseries.create(store, "temp")).toBe("OK");
    expect(timeseries.create(store, "temp")).toBe("ERR key already exists");
  });

  test("TS.ADD adds a timestamp/value pair", () => {
    timeseries.create(store, "temp");
    const result = timeseries.add(store, "temp", "100", "25.5");
    expect(result).toBe("100");

    const data = timeseries.range(store, "temp", 0, 200);
    expect(data).toEqual([[100, 25.5]]);
  });

  test("TS.RANGE returns values in range", () => {
    timeseries.create(store, "temp");
    timeseries.add(store, "temp", "0", "25");
    timeseries.add(store, "temp", "100", "26");
    timeseries.add(store, "temp", "200", "27");
    const result = timeseries.range(store, "temp", 50, 200);
    expect(result).toEqual([
      [100, 26],
      [200, 27],
    ]);
  });

  test("TS.GET returns latest data point", () => {
    timeseries.create(store, "temp");
    expect(timeseries.get(store, "temp")).toBeNull();
    timeseries.add(store, "temp", "100", "26.5");
    timeseries.add(store, "temp", "200", "27.5");
    expect(timeseries.get(store, "temp")).toEqual([200, 27.5]);
  });

  test("TS.RANGE with AGGREGATION AVG", () => {
    timeseries.create(store, "ts");
    timeseries.add(store, "ts", "0", "10");
    timeseries.add(store, "ts", "100", "20");
    timeseries.add(store, "ts", "200", "30");
    timeseries.add(store, "ts", "300", "40");

    const result = timeseries.range(
      store,
      "ts",
      "0",
      "500",
      "AGGREGATION",
      "AVG",
      "200"
    );

    expect(result).toEqual([
      [0, 15],
      [200, 35],
    ]);
  });

  test("TS.ADD respects retention policy", () => {
    const now = Date.now();
    timeseries.create(store, "retained", "RETENTION", "10000");

    timeseries.add(store, "retained", (now - 20000).toString(), "20.0");
    timeseries.add(store, "retained", now.toString(), "25.0");

    const data = timeseries.range(store, "retained", now - 30000, now + 10000);
    expect(data.length).toBe(1);
    expect(data[0][1]).toBe(25.0);
  });
});
