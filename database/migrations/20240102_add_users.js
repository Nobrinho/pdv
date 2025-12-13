/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema
    .createTable('usuarios', table => {
      table.increments('id').primary();
      table.string('nome').notNullable();
      table.string('username').unique().notNullable(); // Login
      table.string('password_hash').notNullable(); // Senha criptografada
      table.string('salt').notNullable(); // Tempero da criptografia
      table.string('cargo').defaultTo('admin'); // 'admin' ou 'vendedor'
      table.boolean('ativo').defaultTo(true);
      table.datetime('criado_em').defaultTo(knex.fn.now());
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTableIfExists('usuarios');
};