const routeCommand = require("../network/commandRouter");
const transactionManager = require("../services/transactionManager");

describe("Transaction Feature", () => {
  beforeEach(async () => {
    transactionManager.discard();
    await routeCommand({ command: "AUTH", args: ["admin", "admin123"] });
  });

  test("MULTI queues commands and EXEC runs them", async () => {
    expect(await routeCommand({ command: "MULTI", args: [] })).toBe("OK");

    expect(
      await routeCommand({ command: "SET", args: ["testkey", "123"] })
    ).toBe("QUEUED");
    expect(await routeCommand({ command: "INCR", args: ["testkey"] })).toBe(
      "QUEUED"
    );

    const execResult = await routeCommand({ command: "EXEC", args: [] });

    expect(execResult).toEqual(["OK", 124]); // assuming INCR returns number
  });

  test("DISCARD cancels queued transaction", async () => {
    expect(await routeCommand({ command: "MULTI", args: [] })).toBe("OK");
    expect(
      await routeCommand({ command: "SET", args: ["mykey", "value"] })
    ).toBe("QUEUED");
    expect(await routeCommand({ command: "DISCARD", args: [] })).toBe("OK");

    const result = await routeCommand({ command: "GET", args: ["mykey"] });
    expect(result).toBe("(nil)");
  });

  test("EXEC without MULTI returns error", async () => {
    const result = await routeCommand({ command: "EXEC", args: [] });
    expect(result).toBe("ERR no transaction");
  });
});
