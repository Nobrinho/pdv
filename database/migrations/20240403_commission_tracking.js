/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema.alterTable("vendas", (table) => {
    table.boolean("comissao_paga").defaultTo(false);
    table.datetime("data_pagamento_comissao").nullable();
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.alterTable("vendas", (table) => {
    table.dropColumn("comissao_paga");
    table.dropColumn("data_pagamento_comissao");
  });
};
