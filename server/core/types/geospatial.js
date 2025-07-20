const toRad = (deg) => (deg * Math.PI) / 180;

function haversine(lon1, lat1, lon2, lat2, unit = "m") {
  const R =
    { m: 6371000, km: 6371, mi: 3958.8, ft: 20925646.325 }[unit] || 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(a));
}

const geo = {
  geoadd(store, key, lon, lat, member) {
    if (!store[key]) store[key] = {};
    store[key][member] = [parseFloat(lon), parseFloat(lat)];
    return 1;
  },

  geodist(store, key, m1, m2, unit = "m") {
    if (!store[key] || !store[key][m1] || !store[key][m2]) return null;
    const [lon1, lat1] = store[key][m1];
    const [lon2, lat2] = store[key][m2];
    return parseFloat(haversine(lon1, lat1, lon2, lat2, unit).toFixed(4));
  },

  geosearch(store, key, fromMember, radius, unit = "m") {
    if (!store[key] || !store[key][fromMember]) return [];
    const [lon1, lat1] = store[key][fromMember];
    return Object.entries(store[key])
      .filter(
        ([member, [lon2, lat2]]) =>
          member !== fromMember &&
          haversine(lon1, lat1, lon2, lat2, unit) <= parseFloat(radius)
      )
      .map(([member]) => member);
  },
};

module.exports = geo;
