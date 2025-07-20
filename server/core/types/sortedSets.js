function getZSet(store, key) {
  if (!store.has(key)) {
    store.set(key, new Map());
  }
  const zset = store.get(key);
  if (!(zset instanceof Map)) {
    throw new Error(
      "WRONGTYPE Operation against a key holding the wrong kind of value"
    );
  }
  return zset;
}

function zadd(store, key, ...args) {
  const options = {
    NX: false,
    XX: false,
    GT: false,
    LT: false,
    CH: false,
    INCR: false,
  };

  // Parse options
  let i = 0;
  while (
    ["NX", "XX", "GT", "LT", "CH", "INCR"].includes(args[i]?.toUpperCase())
  ) {
    options[args[i].toUpperCase()] = true;
    i++;
  }

  const remainingArgs = args.slice(i);
  if (remainingArgs.length === 0 || remainingArgs.length % 2 !== 0) {
    throw new Error("wrong number of arguments for 'ZADD' command");
  }

  const zset = getZSet(store, key);
  let changes = 0;
  let incrResult = null;

  for (let j = 0; j < remainingArgs.length; j += 2) {
    const score = parseFloat(remainingArgs[j]);
    const member = remainingArgs[j + 1];

    const hasExisting = zset.has(member);
    const existingScore = hasExisting ? zset.get(member) : null;

    // Handle INCR
    if (options.INCR) {
      if (options.NX && hasExisting) continue;
      if (options.XX && !hasExisting) continue;

      const newScore = (existingScore ?? 0) + score;
      zset.set(member, newScore);
      incrResult = newScore.toString();
      continue; // skip to next pair
    }

    // Skip if NX and member exists
    if (options.NX && hasExisting) continue;

    // Skip if XX and member does not exist
    if (options.XX && !hasExisting) continue;

    // Skip if GT condition not met
    if (options.GT && hasExisting && score <= existingScore) continue;

    // Skip if LT condition not met
    if (options.LT && hasExisting && score >= existingScore) continue;

    const isNew = !hasExisting;
    const changed = !isNew && existingScore !== score;

    zset.set(member, score);

    if (options.CH) {
      if (isNew || changed) changes++;
    } else {
      if (isNew) changes++;
    }
  }

  return options.INCR ? incrResult : changes;
}

function zrange(store, key, start, stop) {
  const zset = store.get(key);
  if (!(zset instanceof Map)) return [];

  const sorted = [...zset.entries()]
    .map(([member, score]) => ({ member, score }))
    .sort((a, b) => a.score - b.score);

  const s = parseInt(start);
  const e =
    parseInt(stop) < 0 ? sorted.length + parseInt(stop) : parseInt(stop);

  return sorted.slice(s, e + 1).map((item) => item.member);
}

function zrem(store, key, ...members) {
  const zset = store.get(key);
  if (!(zset instanceof Map)) return 0;

  let removed = 0;
  for (const member of members) {
    if (zset.delete(member)) removed++;
  }
  return removed;
}

function zrank(store, key, member) {
  const zset = store.get(key);
  if (!(zset instanceof Map)) return null;

  const sorted = [...zset.entries()]
    .map(([m, score]) => ({ member: m, score }))
    .sort((a, b) => a.score - b.score);

  for (let i = 0; i < sorted.length; i++) {
    if (sorted[i].member === member) return i;
  }
  return null;
}

function zrangebyscore(store, key, min, max) {
  const zset = store.get(key);
  if (!(zset instanceof Map)) return [];

  const isExclusive = (val) => typeof val === "string" && val.startsWith("(");
  const parseScore = (val) =>
    isExclusive(val) ? parseFloat(val.slice(1)) : parseFloat(val);

  const minScore = parseScore(min);
  const maxScore = parseScore(max);

  return [...zset.entries()]
    .map(([member, score]) => ({ member, score }))
    .filter((item) => {
      const aboveMin = isExclusive(min)
        ? item.score > minScore
        : item.score >= minScore;
      const belowMax = isExclusive(max)
        ? item.score < maxScore
        : item.score <= maxScore;
      return aboveMin && belowMax;
    })
    .sort((a, b) => a.score - b.score)
    .map((item) => item.member);
}

module.exports = {
  zadd,
  zrange,
  zrem,
  zrank,
  zrangebyscore,
};
