/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('historico_produtos', table => {
    table.increments('id').primary();
    table.integer('produto_id').references('id').inTable('produtos').onDelete('CASCADE');
    table.decimal('preco_antigo', 10, 2).nullable();
    table.decimal('preco_novo', 10, 2).nullable();
    table.integer('estoque_antigo').nullable();
    table.integer('estoque_novo').nullable();
    table.string('tipo_alteracao').defaultTo('atualizacao'); // 'atualizacao', 'reposicao', etc
    table.datetime('data_alteracao').defaultTo(knex.fn.now());
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTableIfExists('historico_produtos');
};