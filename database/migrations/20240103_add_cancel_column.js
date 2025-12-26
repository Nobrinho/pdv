/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.table('vendas', table => {
      table.boolean('cancelada').defaultTo(false);
      table.string('motivo_cancelamento').nullable();
      table.datetime('data_cancelamento').nullable();
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.table('vendas', table => {
      table.dropColumn('cancelada');
      table.dropColumn('motivo_cancelamento');
      table.dropColumn('data_cancelamento');
  });
};