// server/core/datastore.js

class DataStore {
  constructor() {
    this.store = new Map(); // core in-memory key-value store
  }

  set(key, value) {
    this.store.set(key, value);
    return 'OK';
  }

  get(key) {
    if (!this.store.has(key)) return null;
    return this.store.get(key);
  }

  exists(key) {
    return this.store.has(key) ? 1 : 0;
  }

  del(key) {
    return this.store.delete(key) ? 1 : 0;
  }
}

module.exports = new DataStore();