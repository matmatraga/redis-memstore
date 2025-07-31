// server/services/aclService.js
const config = require("../config");
const users = new Map();

// Default admin user for demo
users.set("admin", {
  password: "admin123",
  commands: new Set(["*"]),
  enabled: true,
});

let currentClientUsers = new Map();

function setClientUser(clientId, username) {
  currentClientUsers.set(clientId, username);
}

function getClientUser(clientId) {
  return currentClientUsers.get(clientId);
}

function removeClientUser(clientId) {
  currentClientUsers.delete(clientId);
}

function checkAccess(username, command) {
  const user = users.get(username);
  if (!user || !user.enabled) return false;
  if (user.commands.has("*")) return true;
  return user.commands.has(command.toUpperCase());
}

function handleAuth(clientId, ...args) {
  if (args.length === 1) {
    const [password] = args;
    if (password === config.authPassword) {
      currentClientUsers.set(clientId, "admin");
      return "OK";
    }
    return "ERR invalid password";
  }

  if (args.length === 2) {
    const [username, password] = args;
    const user = users.get(username);
    if (!user || !user.enabled || user.password !== password) {
      return "ERR invalid password";
    }

    currentClientUsers.set(clientId, username);
    return "OK";
  }

  return "ERR wrong number of arguments for AUTH";
}

function aclSetUser(args) {
  const [username, ...rest] = args;
  if (!username) return "ERR missing username";

  let user = users.get(username) || {
    password: null,
    commands: new Set(),
    enabled: false,
  };

  for (const rawToken of rest) {
    const token = String(rawToken);

    if (token === "on") user.enabled = true;
    else if (token === "off") user.enabled = false;
    else if (token.startsWith(">")) user.password = token.slice(1);
    else if (token === "all") user.commands = new Set(["*"]);
    else if (token.startsWith("+"))
      user.commands.add(token.slice(1).toUpperCase());
    else if (token.startsWith("-"))
      user.commands.delete(token.slice(1).toUpperCase());
    else return `ERR invalid token: ${token}`;
  }

  users.set(username, user);
  return "OK";
}

function aclDelUser([username]) {
  if (!users.has(username)) return "ERR no such user";
  users.delete(username);
  return "OK";
}

function aclList() {
  const out = [];
  for (const [name, user] of users.entries()) {
    out.push(
      `user ${name} ${user.enabled ? "on" : "off"} passwords=${
        user.password ? 1 : 0
      } commands=${[...user.commands].join(",")}`
    );
  }
  return out;
}

function aclWhoami(clientId) {
  return getClientUser(clientId) || "default";
}

module.exports = {
  handleAuth,
  checkAccess,
  setClientUser,
  getClientUser,
  removeClientUser,
  aclSetUser,
  aclDelUser,
  aclList,
  aclWhoami,
};
