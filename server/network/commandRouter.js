// commandRouter.js (ACL-integrated wrapper)
const originalRouter = require("./commandRouter.core");
const {
  handleAuth,
  checkAccess,
  getClientUser,
  aclSetUser,
  aclDelUser,
  aclList,
  aclWhoami,
} = require("../services/aclService");

module.exports = async function routeCommandRaw({
  command,
  args,
  bypassTransaction = false,
  clientId = "default",
}) {
  const upperCmd = command.toUpperCase();

  // AUTH command
  if (upperCmd === "AUTH") {
    const [username, password] = args;
    return handleAuth(clientId, username, password);
  }

  // ACL commands
  if (upperCmd === "ACL") {
    const sub = args[0]?.toUpperCase();
    switch (sub) {
      case "SETUSER":
        return aclSetUser(args.slice(1));
      case "DELUSER":
        return aclDelUser(args.slice(1));
      case "LIST":
        return aclList();
      case "WHOAMI":
        return aclWhoami(clientId);
      default:
        return "ERR unknown ACL subcommand";
    }
  }

  // Enforce ACL
  const username = getClientUser(clientId);
  if (!checkAccess(username, upperCmd)) {
    return "ERR permission denied";
  }

  // Delegate to full command logic
  return originalRouter({
    command,
    args,
    bypassTransaction,
    clientId,
  });
};
