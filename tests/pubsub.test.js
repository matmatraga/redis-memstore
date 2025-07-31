const pubsub = require("../server/services/pubsubService");

describe("Pub/Sub Feature", () => {
  test("subscribers receive published messages", () => {
    const messages = [];

    const callback = (msg) => messages.push(msg);
    pubsub.subscribe("test-channel", callback);

    const count = pubsub.publish("test-channel", "Hello!");
    expect(count).toBe(1);
    expect(messages).toContain("Hello!");

    pubsub.unsubscribe("test-channel", callback);
  });

  test("unsubscribed listeners do not receive messages", () => {
    const messages = [];

    const callback = (msg) => messages.push(msg);
    pubsub.subscribe("temp-channel", callback);
    pubsub.unsubscribe("temp-channel", callback);

    const count = pubsub.publish("temp-channel", "Silent?");
    expect(count).toBe(0);
    expect(messages).not.toContain("Silent?");
  });

  test("publishing to a channel with no subscribers returns 0", () => {
    const count = pubsub.publish("ghost-channel", "Echo?");
    expect(count).toBe(0);
  });
});
