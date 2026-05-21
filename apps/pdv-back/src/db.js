const knexFactory = require("knex");
const { config } = require("./config");

const knex = knexFactory({
  client: "pg",
  connection: config.databaseUrl,
  pool: { min: 0, max: 10 },
});

module.exports = { knex };
