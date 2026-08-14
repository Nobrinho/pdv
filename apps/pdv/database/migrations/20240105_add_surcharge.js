/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  // Verifica se a coluna já existe para evitar erro
  return knex.schema.hasColumn('vendas', 'acrescimo').then(exists => {
    if (!exists) {
      return knex.schema.table('vendas', table => {
        table.decimal('acrescimo', 10, 2).defaultTo(0);
      });
    }
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.table('vendas', table => {
      table.dropColumn('acrescimo');
  });
};