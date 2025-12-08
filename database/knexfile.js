const path = require("path");

module.exports = {
  development: {
    client: "sqlite3",
    connection: {
      filename: path.join(__dirname, "..", "syscontrol.sqlite3"),
    },
    useNullAsDefault: true,
    migrations: {
      directory: path.join(__dirname, "migrations"),
    },
  },
  production: {
    client: "sqlite3",
    connection: {
      filename: path.join(process.resourcesPath, "syscontrol.sqlite3"),
    },
    useNullAsDefault: true,
  },
};
