/**
 * Vínculo login → vendedor (visibilidade de dados / escopo "próprios dados").
 *
 *   usuarios.pessoa_id : a pessoa (vendedor/técnico) que este login representa.
 *
 * Necessário para resolver "os próprios dados": as vendas/serviços são atribuídos
 * a `pessoas` (vendas.vendedor_id), não ao usuário de login. Quando o usuário não
 * tem `data.view_all`, o backend filtra por este pessoa_id.
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  const has = await knex.schema.hasColumn("usuarios", "pessoa_id");
  if (!has) {
    await knex.schema.alterTable("usuarios", (table) => {
      table.integer("pessoa_id").nullable().references("id").inTable("pessoas").onDelete("SET NULL");
    });
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  const has = await knex.schema.hasColumn("usuarios", "pessoa_id");
  if (has) {
    await knex.schema.alterTable("usuarios", (table) => {
      table.dropColumn("pessoa_id");
    });
  }
};
