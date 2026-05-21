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
  return {
    lojaNome: config.loja_nome || "Minha Loja",
    subtitulo: config.loja_subtitulo || "Terminal de Vendas",
    telefone: config.loja_telefone || "",
    documento: config.loja_documento || "",
    endereco: config.loja_endereco || "",
    cidade: config.loja_cidade || "",
    logoBase64: config.loja_logo_base64 || "",
    bgBase64: config.loja_bg_base64 || "",
    comissaoPadrao: config.comissao_padrao || "0.3",
    comissaoUsados: config.comissao_usados || "0.25",
  };
}

module.exports = { getConfigMap, getConfig, saveConfig, getTenantConfig };
