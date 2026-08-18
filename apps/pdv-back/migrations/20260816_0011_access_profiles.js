/**
 * Perfis de acesso reutilizáveis (custom roles).
 *
 *   perfis_acesso : perfis nomeados por loja, cada um com um conjunto-base de
 *                   capabilities (permissoes_json = array de strings).
 *   usuarios.perfil_id : perfil atribuído ao usuário (nullable).
 *
 * Os cargos internos (admin/gerente/caixa/vendedor) continuam vindo do preset em
 * código (packages/shared/domain/permissions) — perfis são custom, virtuais os de
 * sistema. Quando perfil_id é nulo, o efetivo cai no preset do cargo (comportamento
 * atual preservado). Com perfil_id, o efetivo usa as capabilities do perfil como base.
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  const hasTable = await knex.schema.hasTable("perfis_acesso");
  if (!hasTable) {
    await knex.schema.createTable("perfis_acesso", (table) => {
      table.increments("id").primary();
      table.integer("loja_id").notNullable().references("id").inTable("lojas").onDelete("CASCADE");
      table.string("nome").notNullable();
      table.jsonb("permissoes_json").notNullable().defaultTo("[]");
      table.timestamps(true, true);
      table.unique(["loja_id", "nome"]);
      table.index(["loja_id"], "idx_perfis_acesso_loja_id");
    });
  }

  const hasCol = await knex.schema.hasColumn("usuarios", "perfil_id");
  if (!hasCol) {
    await knex.schema.alterTable("usuarios", (table) => {
      table.integer("perfil_id").nullable().references("id").inTable("perfis_acesso").onDelete("SET NULL");
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
