const { app } = require("electron");
const path = require("path");

const isDev = !app.isPackaged;

const dbPath = isDev
  ? path.join(__dirname, "../../syscontrol.sqlite3")
  : path.join(app.getPath("userData"), "syscontrol.sqlite3");

const knex = require("knex")({
  client: "better-sqlite3",
  connection: {
    filename: dbPath,
  },
  useNullAsDefault: true,
  migrations: {
    directory: isDev
      ? path.join(__dirname, "../../database/migrations")
      : path.join(process.resourcesPath, "database", "migrations"),
  },
});

module.exports = { knex, dbPath, isDev };
