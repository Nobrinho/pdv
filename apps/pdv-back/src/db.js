const knexFactory = require("knex");
const { config } = require("./config");

const knex = knexFactory({
  client: "pg",
  connection: config.databaseUrl,
  pool: {
    min: Number(process.env.DATABASE_POOL_MIN || 0),
    max: Number(process.env.DATABASE_POOL_MAX || 10),
  },
});

module.exports = { knex };
