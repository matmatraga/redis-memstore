const RedisClient = require("./redisClient");
const client = new RedisClient();

(async () => {
  await client.connect();
  console.log(await client.set("foo", "bar"));
  console.log(await client.get("foo"));
  await client.quit();
})();
