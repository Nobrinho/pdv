const { buildTenantResponse } = require("../../../../packages/shared/domain/tenant");

async function getConfigMap(knex, lojaId) {
  const rows = await knex("configuracoes").where("loja_id", lojaId).select("chave", "valor");
  return rows.reduce((acc, row) => {
    acc[row.chave] = row.valor;
    return acc;
  }, {});
}

async function getConfig(knex, lojaId, key) {
  const row = await knex("configuracoes").where({ loja_id: lojaId, chave: key }).first();
  return row?.valor ?? null;
}

async function saveConfig(knex, lojaId, key, value) {
  const chave = String(key || "").trim();
  if (!chave) return { success: false, error: "Chave de configuracao obrigatoria." };

  await knex("configuracoes")
    .insert({
      loja_id: lojaId,
      chave,
      valor: value == null ? "" : String(value),
      updated_at: knex.fn.now(),
    })
    .onConflict(["loja_id", "chave"])
    .merge({
      valor: value == null ? "" : String(value),
      updated_at: knex.fn.now(),
    });

  return { success: true };
}

async function getTenantConfig(knex, lojaId) {
  const config = await getConfigMap(knex, lojaId);
  // Contrato único (packages/shared): devolve snake_case com defaults, igual
  // ao modo Electron. Evita o bug de identidade "sumindo" no web.
  return buildTenantResponse(config);
}

module.exports = { getConfigMap, getConfig, saveConfig, getTenantConfig };
