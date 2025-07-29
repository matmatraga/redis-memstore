// server/core/types/documents.js
const datastore = require("../datastore");
const { evaluatePath, updatePath } = require("../../utils/jsonPath");

const documentIndex = {};

function docSet([key, jsonStr]) {
  try {
    const parsed = JSON.parse(jsonStr);
    datastore.set(key, parsed);
    return "OK";
  } catch (err) {
    return `ERR invalid JSON`;
  }
}

function docGet([key, path]) {
  const doc = datastore.get(key);
  if (!doc) return null;
  if (!path) return JSON.stringify(doc);

  try {
    const result = evaluatePath(doc, path);
    return result !== undefined ? JSON.stringify(result) : null;
  } catch {
    return "ERR invalid path";
  }
}

function docDel([key]) {
  return datastore.del(key) ? 1 : 0;
}

function docUpdate([key, path, value]) {
  const doc = datastore.get(key);
  if (!doc) return `ERR no such document`;

  let parsedValue;
  try {
    parsedValue = JSON.parse(value);
  } catch {
    parsedValue = value;
  }
  const updated = updatePath(doc, path, parsedValue);

  if (updated) {
    datastore.set(key, doc);
    return "OK";
  } else {
    return `ERR path not found`;
  }
}

function docArrAppend([key, path, value]) {
  const doc = datastore.get(key);
  if (!doc) return `ERR no such document`;

  const arr = evaluatePath(doc, path);
  if (!Array.isArray(arr)) return `ERR path is not an array`;

  arr.push(value);
  datastore.set(key, doc);
  return arr.length;
}

function docIndex([field]) {
  const allData =
    typeof datastore.getAll === "function"
      ? datastore.getAll()
      : datastore.store ?? datastore.data;

  if (!allData || typeof allData !== "object") {
    return "ERR no data found to index";
  }

  documentIndex[field] = {};
  for (const [key, doc] of Object.entries(allData)) {
    const val = doc?.[field];
    if (val !== undefined) {
      const indexKey = String(val);
      if (!documentIndex[field][indexKey])
        documentIndex[field][indexKey] = new Set();
      documentIndex[field][indexKey].add(key);
    }
  }
  return "OK";
}

function docFind([field, value]) {
  const keys = documentIndex[field]?.[String(value)];
  return keys ? JSON.stringify([...keys]) : JSON.stringify([]);
}

function docAggregate([aggType, field]) {
  const values = [];

  const allData =
    typeof datastore.getAll === "function"
      ? datastore.getAll()
      : datastore.store ?? datastore.data;

  for (const doc of Object.values(allData)) {
    const raw = doc?.[field];
    const num = Number(raw);
    if (!isNaN(num)) values.push(num);
  }

  switch (aggType) {
    case "COUNT":
      return values.length;
    case "SUM":
      return values.reduce((a, b) => a + b, 0);
    case "AVG":
      return values.length
        ? (values.reduce((a, b) => a + b, 0) / values.length).toFixed(2)
        : "0";
    default:
      return `ERR unknown aggregation`;
  }
}

function docQuery([field, operator, value]) {
  const result = [];
  const numericValue = Number(value);

  const allData =
    typeof datastore.getAll === "function"
      ? datastore.getAll()
      : datastore.store ?? datastore.data;

  for (const [key, doc] of Object.entries(allData)) {
    const docVal = doc?.[field];
    if (docVal === undefined) continue;

    switch (operator) {
      case "=":
        if (docVal == value) result.push(key);
        break;
      case "!=":
        if (docVal != value) result.push(key);
        break;
      case ">":
        if (docVal > numericValue) result.push(key);
        break;
      case ">=":
        if (docVal >= numericValue) result.push(key);
        break;
      case "<":
        if (docVal < numericValue) result.push(key);
        break;
      case "<=":
        if (docVal <= numericValue) result.push(key);
        break;
      default:
        return `ERR unknown operator`;
    }
  }
  return JSON.stringify(result);
}

module.exports = {
  "DOC.SET": docSet,
  "DOC.GET": docGet,
  "DOC.DEL": docDel,
  "DOC.UPDATE": docUpdate,
  "DOC.ARRAPPEND": docArrAppend,
  "DOC.INDEX": docIndex,
  "DOC.FIND": docFind,
  "DOC.AGGREGATE": docAggregate,
  "DOC.QUERY": docQuery,
};
