# Redis-like In-Memory Key-Value Store

A full-featured, high-performance Redis-compatible in-memory key-value store built from scratch using Node.js, supporting advanced data structures, persistence, replication, and machine learning integration.

---

## ✅ Project Highlights

- ⚙️ Core Key-Value Store: SET, GET, DEL, EXISTS
- 🧵 Strings, Lists, Sets, Hashes, Sorted Sets
- 🧾 JSON (RedisJSON-style) with JSONPath support
- 🧬 Vector Search (KNN, Euclidean, Cosine) + ML Export
- 📺 Streams (XADD, XREAD, Consumer Groups)
- 📍 Geospatial Commands (GEOADD, GEOSEARCH, GEODIST)
- 🧠 Bitmaps, Bitfields, HyperLogLog, Bloom & Cuckoo Filters
- 📈 Time Series with Aggregations & Downsampling
- 🔐 Authentication, ACLs, TLS Encryption
- 🔁 Replication (Master/Slave), AOF, Snapshots
- 🧪 Fully tested (25+ unit tests), Benchmarked (5+ scripts)
- 🖥️ CLI Tools: REPL Clients, Vector CLI, Monitoring
- 🧰 Built-in Lua Scripting Engine
- ⚡ Performance Optimization (Caching, Pipelining)
- 🔎 Key Expiration, Notifications, Cluster Mode
- 📊 Monitoring: INFO, SLOWLOG, Real-time logs
- 🧱 Redis Patterns: Locks, Rate Limiting, Queues

---

## 📁 Project Structure

```
redis-like-master/
├── client/           # TCP, TLS, REPL clients
├── cli/              # Vector CLI tools (vectorIO.js)
├── server/
│   ├── core/         # Datastore and cluster manager
│   ├── network/      # Server socket logic
│   ├── services/     # Persistence, pipeline, pubsub, etc.
│   ├── utils/        # JSONPath, vector tools, ML I/O
│   ├── data/         # AOF + Snapshot storage
│   └── index.js      # Server entry point
├── benchmark/        # Benchmark scripts for performance
├── tests/            # Full Jest unit test suite
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js v20 or higher
- npm (Node Package Manager)

### Installation

```bash
git clone https://github.com/yourusername/redis-like.git
cd redis-like
npm install
```

```bash
# Start the server
node server/index.js

# Run the REPL client
node client/replClient.js

# Test Vector CLI
node cli/vectorIO.js
```

---

## 🧪 Run Tests

```bash
npm test
# or run specific tests:
npm test tests/json.test.js
```

---

## 📊 Run Benchmarks

```bash
node benchmark/benchmark.js                 # General performance
node benchmark/mlInterface.benchmark.js     # Vector IO benchmark
```

---

## 🤖 Machine Learning Integration

- Export in-memory vectors via `mlInterface.js`
- Interoperable with Python (scikit-learn), TensorFlow.js, etc.
- CLI tool: `cli/vectorIO.js` for adding/searching/loading/saving vectors

---

## ✅ Status

This project completes all 22 phases as outlined:

- [x] Key-Value Engine + Data Structures
- [x] Persistence & Replication
- [x] Streams, Time Series, Geo
- [x] Security, Performance, Testing
- [x] Vector + Document DB + ML interface
- [x] Keyspace, Notifications, Redis Patterns

---

## 👨‍💻 Author

Matthew Ramon Raga  
Full Stack MERN Developer

---

## 🤝 Contribution

Contributions are welcome! Feel free to fork the repository, submit issues, or create pull requests.

---