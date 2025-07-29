function isObject(val) {
  return val && typeof val === "object" && !Array.isArray(val);
}

function parseFilter(expr) {
  const match = expr.match(/@\.([a-zA-Z0-9_]+)\s*==\s*['"]?(.+?)['"]?$/);
  if (!match) return null;
  return { key: match[1], value: match[2] };
}

function matchFilter(obj, filter) {
  return obj[filter.key] == filter.value;
}

function extractRecursive(obj, key, results = []) {
  if (Array.isArray(obj)) {
    for (const item of obj) extractRecursive(item, key, results);
  } else if (isObject(obj)) {
    for (const k in obj) {
      if (k === key || key === "*") {
        results.push(obj[k]);
      }
      extractRecursive(obj[k], key, results);
    }
  }
  return results;
}

function evaluatePath(obj, path) {
  if (path === "$") return obj;

  if (!path.startsWith("$")) throw new Error("Path must start with '$'");

  const segments = path.match(/(\$|\.\.|\.|\[.*?\])/g);
  const tokens = [];
  let cursor = 0;

  while (cursor < path.length) {
    if (path[cursor] === "$") {
      tokens.push({ type: "root" });
      cursor++;
    } else if (path.slice(cursor, cursor + 2) === "..") {
      cursor += 2;
      const keyMatch = path.slice(cursor).match(/^([a-zA-Z0-9_*]+)/);
      if (!keyMatch) throw new Error("Invalid recursive path");
      tokens.push({ type: "recursive", key: keyMatch[1] });
      cursor += keyMatch[1].length;
    } else if (path[cursor] === ".") {
      cursor++;
      const keyMatch = path.slice(cursor).match(/^([a-zA-Z0-9_*]+)/);
      if (!keyMatch) throw new Error("Invalid dotted path");
      tokens.push({ type: "dot", key: keyMatch[1] });
      cursor += keyMatch[1].length;
    } else if (path[cursor] === "[") {
      const end = path.indexOf("]", cursor);
      if (end === -1) throw new Error("Missing closing bracket");
      const inside = path.slice(cursor + 1, end);
      if (inside.startsWith("?(")) {
        const filter = parseFilter(inside.slice(2, -1));
        if (!filter) throw new Error("Invalid filter");
        tokens.push({ type: "filter", filter });
      } else if (inside.includes(",")) {
        const keys = inside
          .split(",")
          .map((k) => k.replace(/^['"]|['"]$/g, ""));
        tokens.push({ type: "union", keys });
      } else {
        const key = inside.replace(/^['"]|['"]$/g, "");
        tokens.push({ type: "bracket", key });
      }
      cursor = end + 1;
    } else {
      throw new Error("Invalid path");
    }
  }

  let current = [obj];

  for (const token of tokens) {
    const next = [];
    for (const item of current) {
      if (token.type === "root") {
        next.push(item);
      } else if (token.type === "dot" || token.type === "bracket") {
        const val = item?.[token.key];
        if (typeof val !== "undefined") next.push(val);
      } else if (token.type === "recursive") {
        const matches = extractRecursive(item, token.key);
        next.push(...matches);
      } else if (token.type === "union") {
        for (const key of token.keys) {
          if (item?.hasOwnProperty(key)) next.push(item[key]);
        }
      } else if (token.type === "filter") {
        if (Array.isArray(item)) {
          for (const el of item) {
            if (matchFilter(el, token.filter)) next.push(el);
          }
        }
      }
    }
    current = next;
  }

  return current.length === 1 ? current[0] : current;
}

function updatePath(obj, path, newValue) {
  if (path.startsWith("$.") && typeof obj === "object") {
    const segments = path.slice(2).split(".");
    let current = obj;
    for (let i = 0; i < segments.length - 1; i++) {
      const seg = segments[i];
      if (!(seg in current)) return false;
      current = current[seg];
    }
    current[segments.at(-1)] = newValue;
    return true;
  }
  return false;
}

module.exports = {
  evaluatePath,
  updatePath,
};
