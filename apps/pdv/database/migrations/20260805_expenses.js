/**
 * Despesas da loja (modo local SQLite).
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  const hasTable = await knex.schema.hasTable("despesas");
  if (hasTable) return;

  await knex.schema.createTable("despesas", (table) => {
    table.increments("id").primary();
    table.string("descricao").notNullable();
    table.string("categoria").notNullable().defaultTo("Outros");
    table.decimal("valor", 10, 2).notNullable();
    table.bigInteger("data_despesa").notNullable().index();
    table.string("forma_pagamento");
    table.boolean("recorrente").defaultTo(false);
    table.text("observacoes");
    table.integer("criado_por");
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  await knex.schema.dropTableIfExists("despesas");
};
