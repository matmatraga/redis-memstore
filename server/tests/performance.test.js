const tls = require("tls");
const assert = require("assert");

jest.setTimeout(15000);

const HOST = "127.0.0.1";
const PORT = 6380;

function sendCommands(socket, commands, onComplete) {
  let buffer = "";
  let lines = [];

  const handleData = (chunk) => {
    buffer += chunk.toString();

    const split = buffer.split("\n");
    for (let rawLine of split) {
      const cleaned = rawLine.replace(/^redis-(tls|like)>\s*/, "").trim();
      if (cleaned.length && !cleaned.startsWith("🔒 Welcome to")) {
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
  }, 200);
}

describe("Performance Features", () => {
  test("should execute pipelined commands in order", (done) => {
    const socket = tls.connect(
      { host: HOST, port: PORT, rejectUnauthorized: false },
      () => {
        sendCommands(
          socket,
          [
            "AUTH admin admin123",
            "PIPELINE START",
            "SET foo bar",
            "GET foo",
            "PIPELINE EXEC",
          ],
          (lines) => {
            try {
              assert.strictEqual(lines[0], "OK"); // AUTH
              assert.strictEqual(lines[1], "OK"); // PIPELINE START
              assert.strictEqual(lines[2], "QUEUED");
              assert.strictEqual(lines[3], "QUEUED");
              assert(lines.some((line) => line.includes("bar"))); // Result from EXEC
              socket.end();
              done();
            } catch (err) {
              socket.end();
              done(err);
            }
          }
        );
      }
    );

    socket.on("error", (err) => {
      done(err);
    });
  });

  test("should receive CACHEINVALIDATE on SET after GET", (done) => {
    const reader = tls.connect(
      { host: HOST, port: PORT, rejectUnauthorized: false },
      () => {
        let gotInvalidate = false;

        reader.on("data", (chunk) => {
          const msg = chunk.toString();
          if (msg.includes("CACHEINVALIDATE user:test")) {
            gotInvalidate = true;
            reader.end();
            done();
          }
        });

        sendCommands(reader, ["AUTH admin admin123", "GET user:test"], () => {
          const writer = tls.connect(
            { host: HOST, port: PORT, rejectUnauthorized: false },
            () => {
              sendCommands(
                writer,
                ["AUTH admin admin123", "SET user:test 123"],
                () => {
                  setTimeout(() => {
                    if (!gotInvalidate) {
                      reader.end();
                      writer.end();
                      done(new Error("CACHEINVALIDATE message not received"));
                    } else {
                      writer.end();
                    }
                  }, 3000);
                }
              );
            }
          );

          writer.on("error", (err) => done(err));
        });
      }
    );

    reader.on("error", (err) => done(err));
  });
});
