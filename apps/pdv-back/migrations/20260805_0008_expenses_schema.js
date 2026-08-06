/**
 * Despesas da loja (aluguel, fornecedores, contas, salarios, etc.).
 * Usadas para calcular o lucro liquido real e o resultado consolidado no painel.
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  await knex.schema.createTable("despesas", (table) => {
    table.increments("id").primary();
    table.integer("loja_id").notNullable().references("id").inTable("lojas").onDelete("CASCADE");
    table.string("descricao").notNullable();
    table.string("categoria").notNullable().defaultTo("Outros");
    table.decimal("valor", 10, 2).notNullable();
    table.timestamp("data_despesa").defaultTo(knex.fn.now());
    table.string("forma_pagamento");
    table.boolean("recorrente").defaultTo(false);
    table.text("observacoes");
    table.integer("criado_por");
    table.timestamps(true, true);
  });

  await knex.schema.raw("CREATE INDEX idx_despesas_loja_data ON despesas(loja_id, data_despesa DESC)");
  await knex.schema.raw("CREATE INDEX idx_despesas_loja_categoria ON despesas(loja_id, categoria)");
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  await knex.schema.dropTableIfExists("despesas");
};
