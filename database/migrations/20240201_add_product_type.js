/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  // Verifica se a coluna já existe para evitar erro
  return knex.schema.hasColumn("produtos", "tipo").then((exists) => {
    if (!exists) {
      return knex.schema.table("produtos", (table) => {
        // Cria a coluna 'tipo' com valor padrão 'novo'
        table.string("tipo").defaultTo("novo");
      });
    }
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema.table("produtos", (table) => {
    table.dropColumn("tipo");
  });
};
