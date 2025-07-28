const RedisClient = require("./redisClient");

if (require.main === module) {
  (async () => {
    const client = new RedisClient();

    try {
      await client.connect();

      console.log(await client.send("SET", ["monitor:test", "123"]));
      console.log(await client.send("INFO", []));
      console.log(await client.send("SLOWLOG", []));
    } catch (err) {
      console.error("❌ Error:", err);
    }
  })();
}
