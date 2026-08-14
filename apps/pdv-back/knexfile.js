require("./src/config");
const path = require("path");

const connection = process.env.DATABASE_URL;
const migrationsDirectory = path.join(__dirname, "migrations");

if (!connection) {
  console.warn("[server] DATABASE_URL nao definido. Configure antes de rodar migrations/API.");
}

module.exports = {
  development: {
    client: "pg",
    connection,
    pool: { min: 0, max: 10 },
    migrations: {
      directory: migrationsDirectory,
      tableName: "server_knex_migrations",
    },
  },
  production: {
    client: "pg",
    connection,
    pool: { min: 2, max: 20 },
    migrations: {
      directory: migrationsDirectory,
      tableName: "server_knex_migrations",
    },
  },
};
