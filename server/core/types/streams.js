const generateStreamID = (lastID) => {
  const [ms, seq] = lastID ? lastID.split("-").map(Number) : [Date.now(), 0];
  const now = Date.now();
  if (now > ms) return `${now}-0`;
  return `${ms}-${seq + 1}`;
};

const xadd = (store, key, id, ...fieldValues) => {
  if (!store.has(key)) store.set(key, []);
  const stream = store.get(key);
  if (!Array.isArray(stream)) return "ERR wrong type";

  if (id === "*") id = generateStreamID(stream.at(-1)?.[0]);

  const entry = [id, Object.fromEntries(chunkPairs(fieldValues))];
  stream.push(entry);
  store.set(key, stream);
  return id;
};

const xread = (store, _count, _block, options) => {
  const { streams } = options;
  const results = [];

  for (const [key, id] of streams) {
    const stream = store.get(key);
    if (!stream || !Array.isArray(stream)) continue;

    const entries = stream.filter(
      ([entryID]) => compareStreamIDs(entryID, id) > 0
    );
    if (entries.length > 0) results.push([key, entries]);
  }

  return results.length > 0 ? results : null;
};

const xrange = (store, key, start, end) => {
  const stream = store.get(key);
  if (!stream || !Array.isArray(stream)) return [];

  return stream.filter(
    ([id]) => compareStreamIDs(id, start) >= 0 && compareStreamIDs(id, end) <= 0
  );
};

const xlen = (store, key) => {
  const stream = store.get(key);
  return Array.isArray(stream) ? stream.length : 0;
};

// --- Consumer Groups ---

const groupMeta = {};

const xgroupCreate = (store, key, group, id) => {
  if (!store.has(key)) store.set(key, []);
  if (!groupMeta[key]) groupMeta[key] = {};
  if (groupMeta[key][group])
    return "BUSYGROUP Consumer Group name already exists";

  groupMeta[key][group] = {
    consumers: {},
    lastDeliveredID: id,
    pending: {},
  };
  return "OK";
};

const xreadgroup = (store, group, consumer, _block, options) => {
  const { streams } = options;
  const results = [];

  for (const [key, id] of streams) {
    const stream = store.get(key);
    if (!stream || !Array.isArray(stream)) continue;
    const meta = groupMeta[key]?.[group];
    if (!meta) continue;

    if (!meta.consumers[consumer]) meta.consumers[consumer] = [];

    let entries = [];
    if (id === ">") {
      entries = stream.filter(
        ([entryID]) => compareStreamIDs(entryID, meta.lastDeliveredID) > 0
      );
    } else {
      entries = stream.filter(([entryID]) => compareStreamIDs(entryID, id) > 0);
    }

    if (entries.length > 0) {
      for (const [entryID] of entries) {
        meta.pending[entryID] = consumer;
        meta.consumers[consumer].push(entryID);
        meta.lastDeliveredID = entryID;
      }
      results.push([key, entries]);
    }
  }

  return results.length > 0 ? results : null;
};

const xack = (store, key, group, ...ids) => {
  const meta = groupMeta[key]?.[group];
  if (!meta) return 0;

  let count = 0;
  for (const id of ids) {
    if (meta.pending[id]) {
      delete meta.pending[id];
      count++;
    }
  }

  return count;
};

// --- Helpers ---
const chunkPairs = (arr) => {
  const res = [];
  for (let i = 0; i < arr.length; i += 2) {
    res.push([arr[i], arr[i + 1]]);
  }
  return res;
};

const compareStreamIDs = (a, b) => {
  const [ams, asq] = a.split("-").map(Number);
  const [bms, bsq] = b.split("-").map(Number);
  return ams !== bms ? ams - bms : asq - bsq;
};

module.exports = {
  xadd,
  xread,
  xrange,
  xlen,
  xgroupCreate,
  xreadgroup,
  xack,
};
