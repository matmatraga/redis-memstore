// server/core/types/timeseries.js
function create(store, key, ...args) {
  if (store.has(key)) return "ERR key already exists";

  let retention = null;
  if (args.length === 2 && args[0].toUpperCase() === "RETENTION") {
    const retentionVal = parseInt(args[1], 10);
    if (isNaN(retentionVal) || retentionVal <= 0)
      return "ERR invalid retention value";
    retention = retentionVal;
  }

  store.set(key, { data: [], retention });
  return "OK";
}

function add(store, key, timestampStr, valueStr) {
  const timestamp = parseInt(timestampStr, 10);
  const value = parseFloat(valueStr);

  if (!store.has(key)) return "ERR no such key";
  if (isNaN(timestamp) || isNaN(value)) return "ERR invalid timestamp or value";

  const series = store.get(key);
  series.data.push([timestamp, value]);
  series.data.sort((a, b) => a[0] - b[0]); // keep ordered

  // Retention logic
  if (series.retention) {
    const cutoff = timestamp - series.retention;
    series.data = series.data.filter(([ts]) => ts >= cutoff);
  }

  return timestamp.toString();
}

function range(store, key, fromStr, toStr, ...args) {
  if (!store.has(key)) return [];

  const from = parseInt(fromStr, 10);
  const to = parseInt(toStr, 10);
  if (isNaN(from) || isNaN(to)) return [];

  const series = store.get(key).data;
  const points = series.filter(([ts]) => ts >= from && ts <= to);

  // No aggregation
  if (args.length === 0) return points;

  // Normalize: Accept both ["AGGREGATION", "AVG", "200"] or ["AVG", "200"]
  let aggType, bucketStr;

  if (args.length === 3 && args[0].toUpperCase() === "AGGREGATION") {
    [, aggType, bucketStr] = args;
  } else if (args.length === 2) {
    [aggType, bucketStr] = args;
  } else {
    return "ERR syntax error";
  }

  const bucketSize = parseInt(bucketStr, 10);
  if (isNaN(bucketSize) || bucketSize <= 0) return "ERR invalid bucket size";

  const reducers = {
    avg: (arr) => arr.reduce((a, b) => a + b, 0) / arr.length,
    sum: (arr) => arr.reduce((a, b) => a + b, 0),
    min: (arr) => Math.min(...arr),
    max: (arr) => Math.max(...arr),
    count: (arr) => arr.length,
  };

  const reducer = reducers[aggType.toLowerCase()];
  if (!reducer) return "ERR unknown aggregation type";

  const buckets = new Map();
  for (const [ts, val] of points) {
    const bucketKey = from + Math.floor((ts - from) / bucketSize) * bucketSize;
    if (!buckets.has(bucketKey)) buckets.set(bucketKey, []);
    buckets.get(bucketKey).push(val);
  }

  return Array.from(buckets.entries()).map(([ts, values]) => [
    ts,
    reducer(values),
  ]);
}

function get(store, key) {
  if (!store.has(key)) return null;
  const series = store.get(key);
  if (!series.data.length) return null;
  return series.data[series.data.length - 1];
}

module.exports = {
  create,
  add,
  range,
  get,
  __isTimeSeries: true,
};
