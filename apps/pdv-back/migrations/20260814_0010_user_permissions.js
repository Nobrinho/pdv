/**
 * Controle de acesso granular por usuário.
 *
 *   usuarios.permissoes_json : overrides do usuário { grants:[], denies:[] }
 *
 * O template base vem do preset do cargo (admin/gerente/caixa/vendedor) em
 * código (packages/shared/domain/permissions). Com overrides vazios, as
 * permissões efetivas caem exatamente no preset do cargo — comportamento
 * atual 100% preservado, ninguém é bloqueado no backfill.
 *
 * (A tabela `cargos` é dos vendedores/técnicos — pessoas —, não dos usuários de
 * login, por isso não recebe coluna de permissões aqui.)
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  const has = await knex.schema.hasColumn("usuarios", "permissoes_json");
  if (!has) {
    await knex.schema.alterTable("usuarios", (table) => {
      table.jsonb("permissoes_json").notNullable().defaultTo("{}");
    });
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  const has = await knex.schema.hasColumn("usuarios", "permissoes_json");
  if (has) {
    await knex.schema.alterTable("usuarios", (table) => {
      table.dropColumn("permissoes_json");
    });
  }
};
