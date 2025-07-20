// utils/jsonPath.js

function evaluatePath(obj, path) {
  if (path === "$") return obj;

  const keys = path
    .replace(/^\$\./, "") // remove starting "$."
    .replace(/\[['"]?([\w]+)['"]?\]/g, ".$1") // convert bracket to dot notation
    .split(".");

  return keys.reduce((acc, key) => {
    if (acc && typeof acc === "object") {
      return acc[key];
    }
    throw new Error("Path error");
  }, obj);
}

module.exports = {
  evaluatePath,
};
