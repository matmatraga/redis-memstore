// server/core/datastore.js
class DataStore {
  constructor() {
    this.store = new Map(); // Key-value store
    this.expirations = new Map(); // Key => timestamp in ms
    this._startExpirationCleanup();
  }

  _startExpirationCleanup() {
    setInterval(() => {
      const now = Date.now();
      for (const [key, expireAt] of this.expirations.entries()) {
        if (now >= expireAt) {
          this.store.delete(key);
          this.expirations.delete(key);
        }
      }
    }, 1000); // check every second
  }

  _isExpired(key) {
    if (!this.expirations.has(key)) return false;
    const expireAt = this.expirations.get(key);
    if (Date.now() >= expireAt) {
      this.store.delete(key);
      this.expirations.delete(key);
      return true;
    }
    return false;
  }

  set(key, value) {
    this._isExpired(key); // clean up if expired
    this.store.set(key, value);
    return "OK";
  }

  get(key) {
    if (this._isExpired(key)) return null;
    return this.store.get(key) ?? null;
  }

  exists(key) {
    if (this._isExpired(key)) return 0;
    return this.store.has(key) ? 1 : 0;
  }

  del(key) {
    this.expirations.delete(key);
    return this.store.delete(key) ? 1 : 0;
  }

  expire(key, seconds) {
    if (!this.store.has(key)) return 0;
    const expireAt = Date.now() + seconds * 1000;
    this.expirations.set(key, expireAt);
    return 1;
  }

  ttl(key) {
    if (!this.store.has(key)) return -2; // Key doesn't exist at all
    if (this._isExpired(key)) return -2; // Key exists but is expired
    if (!this.expirations.has(key)) return -1; // Key exists but no expiration
    if (this._isExpired(key)) return -2;
    if (!this.expirations.has(key)) return -1;

    const ttlMs = this.expirations.get(key) - Date.now();
    return ttlMs > 0 ? Math.floor(ttlMs / 1000) : -2;
  }

  persist(key) {
    if (!this.store.has(key)) return 0;
    const removed = this.expirations.delete(key);
    return removed ? 1 : 0;
  }

  has(key) {
    if (this._isExpired(key)) return false;
    return this.store.has(key);
  }

  flush() {
    this.store.clear();
    this.expirations.clear();
  }

  exportSnapshot() {
    const snapshot = {
      store: Object.fromEntries(this.store),
      expirations: Object.fromEntries(this.expirations),
    };
    return snapshot;
  }

  importSnapshot(snapshot) {
    this.store.clear();
    this.expirations.clear();

    for (const [key, value] of Object.entries(snapshot.store || {})) {
      this.store.set(key, value);
    }

    for (const [key, expireAt] of Object.entries(snapshot.expirations || {})) {
      this.expirations.set(key, expireAt);
    }
  }

  getKeyspaceStats() {
    const stats = {};
    for (const [key, value] of this.store.entries()) {
      if (this._isExpired(key)) continue;

      let type = typeof value;

      // Handle known data structures
      if (Array.isArray(value)) {
        type = "lists";
      } else if (value instanceof Set) {
        type = "sets";
      } else if (
        value &&
        typeof value === "object" &&
        value.__type === "sortedset"
      ) {
        type = "sortedsets";
      } else if (
        value &&
        typeof value === "object" &&
        value.__type === "stream"
      ) {
        type = "streams";
      } else if (
        value &&
        typeof value === "object" &&
        value.__type === "bitmap"
      ) {
        type = "bitmaps";
      } else if (
        value &&
        typeof value === "object" &&
        value.__type === "hash"
      ) {
        type = "hashes";
      } else if (
        value &&
        typeof value === "object" &&
        value.__type === "json"
      ) {
        type = "json";
      } else if (value && typeof value === "object" && value.__type === "geo") {
        type = "geospatial";
      } else if (
        value &&
        typeof value === "object" &&
        value.__type === "timeseries"
      ) {
        type = "timeseries";
      } else {
        type = "strings";
      }

      stats[type] = (stats[type] || 0) + 1;
    }
    return stats;
  }

  getAll() {
    const result = {};
    for (const [key, value] of this.store.entries()) {
      if (!this._isExpired(key)) {
        result[key] = value;
      }
    }
    return result;
  }
}

module.exports = new DataStore();
