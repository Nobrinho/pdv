/**
 * Perfis de acesso reutilizáveis (modo local SQLite).
 * Espelha a migration online (apps/pdv-back/migrations/20260816_0011_access_profiles.js),
 * sem loja_id (single-tenant local).
 *
 *   perfis_acesso      : { id, nome, permissoes_json (array de capabilities) }
 *   usuarios.perfil_id : perfil atribuído (nullable). Nulo → cai no preset do cargo.
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  const hasTable = await knex.schema.hasTable("perfis_acesso");
  if (!hasTable) {
    await knex.schema.createTable("perfis_acesso", (table) => {
      table.increments("id").primary();
      table.string("nome").notNullable().unique();
      table.text("permissoes_json").notNullable().defaultTo("[]");
    });
  }

  const hasCol = await knex.schema.hasColumn("usuarios", "perfil_id");
  if (!hasCol) {
    await knex.schema.alterTable("usuarios", (table) => {
      table.integer("perfil_id").nullable();
    });
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  const hasCol = await knex.schema.hasColumn("usuarios", "perfil_id");
  if (hasCol) {
    await knex.schema.alterTable("usuarios", (table) => {
      table.dropColumn("perfil_id");
    });
  }
  await knex.schema.dropTableIfExists("perfis_acesso");
};
