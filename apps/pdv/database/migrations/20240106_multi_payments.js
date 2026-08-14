/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.createTable("venda_pagamentos", (table) => {
    table.increments("id").primary();
    table
      .integer("venda_id")
      .references("id")
      .inTable("vendas")
      .onDelete("CASCADE");
    table.string("metodo").notNullable(); // Dinheiro, Pix, Fiado, etc.
    table.decimal("valor", 10, 2).notNullable();
    table.string("detalhes").nullable(); // Ex: "3x", "Entrada"
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.dropTableIfExists("venda_pagamentos");
};
