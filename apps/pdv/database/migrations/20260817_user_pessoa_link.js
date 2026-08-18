/**
 * Vínculo login → vendedor (modo local SQLite).
 * Espelha a migration online (20260817_0012_user_pessoa_link.js).
 *
 *   usuarios.pessoa_id : a pessoa (vendedor) que este login representa. Usado
 *   para filtrar "os próprios dados" quando o usuário não tem `data.view_all`.
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  const has = await knex.schema.hasColumn("usuarios", "pessoa_id");
  if (!has) {
    await knex.schema.alterTable("usuarios", (table) => {
      table.integer("pessoa_id").nullable();
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
