const net = require("net");
const assert = require("assert");

jest.setTimeout(15000);

const HOST = "127.0.0.1";
const PORT = 6379;

function sendCommands(socket, commands, onComplete) {
  let buffer = "";
  let lines = [];

  const handleData = (chunk) => {
    buffer += chunk.toString();

    const split = buffer.split("\n");
    for (let rawLine of split) {
      const cleaned = rawLine.replace(/^redis-like>\s*/, "").trim();
      if (cleaned.length && !cleaned.startsWith("Welcome to")) {
        lines.push(cleaned);
      }
    }

    buffer = "";
  };

  socket.on("data", handleData);

  commands.forEach((cmd) => socket.write(cmd + "\n"));

  setTimeout(() => {
    socket.off("data", handleData);
    onComplete([...lines]);
  }, 100);
}

describe("Security - Authentication & ACL", () => {
  let socket;

  beforeAll((done) => {
    socket = net.createConnection({ host: HOST, port: PORT }, done);
  });

  afterAll(() => {
    if (socket) socket.end();
  });

  test("should accept commands after successful AUTH", (done) => {
    sendCommands(
      socket,
      ["AUTH admin admin123", "SET key1 val1", "GET key1"],
      (lines) => {
        try {
          assert(lines.length >= 3);
          assert.strictEqual(lines[0], "OK");
          assert.strictEqual(lines[1], "OK");
          assert(lines[2].includes("val1"));
          done();
        } catch (err) {
          done(err);
        }
      }
    );
  }, 15000);

  test("should fail AUTH with invalid password", (done) => {
    const tempSocket = net.createConnection({ host: HOST, port: PORT }, () => {
      sendCommands(tempSocket, ["AUTH wrongpass"], (lines) => {
        try {
          assert(lines.length > 0);
          assert(lines[0].includes("ERR invalid password"));
          tempSocket.end();
          done();
        } catch (err) {
          tempSocket.end();
          done(err);
        }
      });
    });
  }, 15000);

  test("should set and restrict ACL correctly", (done) => {
    const tempSocket = net.createConnection({ host: HOST, port: PORT }, () => {
      sendCommands(
        tempSocket,
        [
          "AUTH admin admin123",
          "ACL SETUSER demo on >demo123 +GET +SET +DEL +ACL +WHOAMI",
          "AUTH demo demo123",
          "SET keyX value",
          "GET keyX",
          "DEL keyX",
        ],
        (lines) => {
          try {
            assert.strictEqual(lines[0], "OK");
            assert.strictEqual(lines[1], "OK");
            assert.strictEqual(lines[2], "OK");
            assert.strictEqual(lines[3], "OK");
            assert(lines[4].includes("value"));
            assert.strictEqual(lines[5], "(integer) 1");
            tempSocket.end();
            done();
          } catch (err) {
            tempSocket.end();
            done(err);
          }
        }
      );
    });
  }, 15000);

  test("should show correct ACL WHOAMI and LIST", (done) => {
    const tempSocket = net.createConnection({ host: HOST, port: PORT }, () => {
      sendCommands(
        tempSocket,
        [
          "AUTH admin admin123",
          "ACL SETUSER demo on >demo123 +GET +SET +DEL +ACL, +WHOAMI",
          "AUTH demo demo123",
          "ACL WHOAMI",
          "ACL LIST",
        ],
        (lines) => {
          try {
            assert.strictEqual(lines[0], "OK");
            assert.strictEqual(lines[1], "OK");
            assert.strictEqual(lines[2], "OK");
            assert.strictEqual(lines[3], "demo");
            assert(lines.some((l) => l.includes("user demo")));
            tempSocket.end();
            done();
          } catch (err) {
            tempSocket.end();
            done(err);
          }
        }
      );
    });
  }, 15000);
});
