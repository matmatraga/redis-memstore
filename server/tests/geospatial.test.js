const geo = require("../core/types/geospatial");

describe("Geospatial Commands", () => {
  let store;

  beforeEach(() => {
    store = {};
  });

  test("GEOADD stores member location", () => {
    const res = geo.geoadd(store, "places", 103.85, 1.29, "Singapore");
    expect(res).toBe(1);
    expect(store.places.Singapore).toEqual([103.85, 1.29]);
  });

  test("GEODIST computes correct distance in km", () => {
    geo.geoadd(store, "cities", 103.851959, 1.29027, "Singapore");
    geo.geoadd(store, "cities", 101.686855, 3.139003, "KualaLumpur");
    const dist = geo.geodist(store, "cities", "Singapore", "KualaLumpur", "km");
    expect(dist).toBeCloseTo(316.4288, 3);
  });

  test("GEOSEARCH returns nearby members within radius", () => {
    geo.geoadd(store, "cities", 103.851959, 1.29027, "Singapore");
    geo.geoadd(store, "cities", 100.501765, 13.756331, "Bangkok");
    geo.geoadd(store, "cities", 101.686855, 3.139003, "KualaLumpur");
    const res = geo.geosearch(store, "cities", "Singapore", 400, "km");
    expect(res).toContain("KualaLumpur");
    expect(res).not.toContain("Bangkok");
  });
});
