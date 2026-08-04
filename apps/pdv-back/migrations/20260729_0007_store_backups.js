/**
 * Snapshots de backup por loja (backup manual, automatico e o
 * "pre_restore" gerado automaticamente antes de um restore destrutivo).
 * @param { import("knex").Knex } knex
 */
exports.up = async function (knex) {
  await knex.schema.createTable("store_backups", (table) => {
    table.increments("id").primary();
    table.integer("loja_id").notNullable().references("id").inTable("lojas").onDelete("CASCADE");
    table.string("tipo").notNullable().defaultTo("manual"); // manual | pre_restore | auto
    table.string("descricao");
    table.integer("total_registros").defaultTo(0);
    table.jsonb("payload_json").notNullable();
    table.timestamp("criado_em").defaultTo(knex.fn.now());
  });

  await knex.schema.raw(
    "CREATE INDEX idx_store_backups_loja_data ON store_backups(loja_id, criado_em DESC)",
  );
};

/**
 * @param { import("knex").Knex } knex
 */
exports.down = async function (knex) {
  await knex.schema.dropTableIfExists("store_backups");
};
