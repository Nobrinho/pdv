import { app } from "electron";
import path from "path";
import Knex from "knex";

const isDev = !app.isPackaged;

const rootPath = isDev ? app.getAppPath() : process.resourcesPath;

let dbPath: string;

if (isDev) {
  dbPath = path.join(rootPath, "syscontrol.sqlite3");
} else {
  const userDataPath = app.getPath("userData");
  dbPath = path.join(userDataPath, "syscontrol.sqlite3");
}

const knex = Knex({
  client: "better-sqlite3",
  connection: {
    filename: dbPath,
  },
  useNullAsDefault: true,
  migrations: {
    directory: isDev
      ? path.join(rootPath, "database", "migrations")
      : path.join(rootPath, "database", "migrations"),
  },
});

export { knex, dbPath };
