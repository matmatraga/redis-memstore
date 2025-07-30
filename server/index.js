const startTCPServer = require("./network/server");
const startTLSServer = require("./network/tlsServer");
const { connectToMaster, setRole } = require("./services/replicationService");

const args = process.argv.slice(2);
const roleArg = args.find((arg) => arg.startsWith("--role="));

if (roleArg && roleArg.includes("slave")) {
  setRole("slave");
  connectToMaster("127.0.0.1", 6379, true); // uses TLS if available
} else {
  startTCPServer(); // start TCP for CLI
  startTLSServer(); // start TLS for replication
}
