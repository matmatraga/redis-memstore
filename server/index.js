const startTCPServer = require("./network/server");
const { connectToMaster, setRole } = require("./services/replicationService");

const args = process.argv.slice(2);
const roleArg = args.find((arg) => arg.startsWith("--role="));

if (roleArg && roleArg.includes("slave")) {
  setRole("slave");
  connectToMaster("127.0.0.1", 6379);
}

startTCPServer();
