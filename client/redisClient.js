// client/redisClient.js
const net = require("net");

class RedisClient {
  constructor(host = "127.0.0.1", port = 6379) {
    this.host = host;
    this.port = port;
    this.socket = null;
    this.buffer = "";
    this.responseQueue = [];
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
  }

  async connect() {
    return new Promise((resolve, reject) => {
      const attemptConnection = () => {
        this.socket = net.createConnection(this.port, this.host, () => {
          console.log(
            "🤝 Connected to Redis-like server at",
            this.host + ":" + this.port
          );
          this.reconnectAttempts = 0;
          resolve();
        });

        this.socket.on("data", (chunk) => {
          this.buffer += chunk.toString();
          const responses = this.buffer.split("\n");
          this.buffer = responses.pop();
          for (const res of responses) {
            const resolveFn = this.responseQueue.shift();
            if (resolveFn) resolveFn(res.trim());
          }
        });

        this.socket.on("error", (err) => {
          console.error("❌ Socket error:", err.message);
          if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.warn(
              `🔄 Reconnecting attempt ${this.reconnectAttempts}...`
            );
            setTimeout(attemptConnection, 1000);
          } else {
            console.error("💥 Max reconnection attempts reached. Aborting.");
            reject(err);
          }
        });

        this.socket.on("close", () => {
          console.warn("⚠️ Connection closed. Attempting to reconnect...");
          if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            setTimeout(attemptConnection, 1000);
          } else {
            console.error("💥 Max reconnection attempts reached. Aborting.");
          }
        });
      };

      attemptConnection();
    });
  }

  sendCommand(command, args = []) {
    return new Promise((resolve, reject) => {
      if (!this.socket || this.socket.destroyed) {
        return reject(new Error("🔌 No active connection to server"));
      }
      this.responseQueue.push(resolve);
      const message = [command, ...args].join(" ") + "\n";
      this.socket.write(message);
    });
  }

  // Core
  set(key, value) {
    return this.sendCommand("SET", [key, value]);
  }
  get(key) {
    return this.sendCommand("GET", [key]);
  }
  del(key) {
    return this.sendCommand("DEL", [key]);
  }
  exists(key) {
    return this.sendCommand("EXISTS", [key]);
  }

  // Strings
  append(key, value) {
    return this.sendCommand("APPEND", [key, value]);
  }
  strlen(key) {
    return this.sendCommand("STRLEN", [key]);
  }
  incr(key) {
    return this.sendCommand("INCR", [key]);
  }
  decr(key) {
    return this.sendCommand("DECR", [key]);
  }
  incrby(key, num) {
    return this.sendCommand("INCRBY", [key, num]);
  }
  decrby(key, num) {
    return this.sendCommand("DECRBY", [key, num]);
  }
  getrange(key, start, end) {
    return this.sendCommand("GETRANGE", [key, start, end]);
  }
  setrange(key, offset, value) {
    return this.sendCommand("SETRANGE", [key, offset, value]);
  }

  // Lists
  lpush(key, value) {
    return this.sendCommand("LPUSH", [key, value]);
  }
  rpush(key, value) {
    return this.sendCommand("RPUSH", [key, value]);
  }
  lpop(key) {
    return this.sendCommand("LPOP", [key]);
  }
  rpop(key) {
    return this.sendCommand("RPOP", [key]);
  }
  lrange(key, start, stop) {
    return this.sendCommand("LRANGE", [key, start, stop]);
  }
  lindex(key, index) {
    return this.sendCommand("LINDEX", [key, index]);
  }
  lset(key, index, value) {
    return this.sendCommand("LSET", [key, index, value]);
  }

  // Sets
  sadd(key, value) {
    return this.sendCommand("SADD", [key, value]);
  }
  srem(key, value) {
    return this.sendCommand("SREM", [key, value]);
  }
  sismember(key, value) {
    return this.sendCommand("SISMEMBER", [key, value]);
  }
  smembers(key) {
    return this.sendCommand("SMEMBERS", [key]);
  }
  sinter(...keys) {
    return this.sendCommand("SINTER", keys);
  }
  sunion(...keys) {
    return this.sendCommand("SUNION", keys);
  }
  sdiff(...keys) {
    return this.sendCommand("SDIFF", keys);
  }

  // Hashes
  hset(key, field, value) {
    return this.sendCommand("HSET", [key, field, value]);
  }
  hget(key, field) {
    return this.sendCommand("HGET", [key, field]);
  }
  hmset(key, ...fieldVals) {
    return this.sendCommand("HMSET", [key, ...fieldVals]);
  }
  hgetall(key) {
    return this.sendCommand("HGETALL", [key]);
  }
  hdel(key, field) {
    return this.sendCommand("HDEL", [key, field]);
  }
  hexists(key, field) {
    return this.sendCommand("HEXISTS", [key, field]);
  }

  // Transactions
  multi() {
    return this.sendCommand("MULTI");
  }
  exec() {
    return this.sendCommand("EXEC");
  }
  discard() {
    return this.sendCommand("DISCARD");
  }

  // Expiration
  expire(key, seconds) {
    return this.sendCommand("EXPIRE", [key, seconds]);
  }
  ttl(key) {
    return this.sendCommand("TTL", [key]);
  }
  persist(key) {
    return this.sendCommand("PERSIST", [key]);
  }

  // JSON
  jsonSet(key, path, json) {
    return this.sendCommand("JSON.SET", [key, path, json]);
  }
  jsonGet(key, path) {
    return this.sendCommand("JSON.GET", [key, path]);
  }
  jsonDel(key, path) {
    return this.sendCommand("JSON.DEL", [key, path]);
  }
  jsonArrAppend(key, path, ...elements) {
    return this.sendCommand("JSON.ARRAPPEND", [key, path, ...elements]);
  }

  // Quit client
  quit() {
    if (this.socket) {
      this.socket.end();
      console.log("👋 Disconnected from Redis-like server");
    }
  }
}

module.exports = RedisClient;
