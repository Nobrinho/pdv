/**
 * Controle de acesso granular por usuário (modo local SQLite).
 * Adiciona `usuarios.permissoes_json` guardando os overrides
 * { grants:[], denies:[] } de cada usuário. Espelha a migration
 * do backend online (apps/pdv-back/migrations/20260814_0010_user_permissions.js).
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  const hasColumn = await knex.schema.hasColumn("usuarios", "permissoes_json");
  if (hasColumn) return;

  await knex.schema.alterTable("usuarios", (table) => {
    table.text("permissoes_json").notNullable().defaultTo("{}");
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  const hasColumn = await knex.schema.hasColumn("usuarios", "permissoes_json");
  if (!hasColumn) return;

  await knex.schema.alterTable("usuarios", (table) => {
    table.dropColumn("permissoes_json");
  });
};
