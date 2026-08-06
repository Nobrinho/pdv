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
  // Devolve as chaves em snake_case exatamente como o frontend (TenantContext)
  // espera ler (loja_nome, cor_primaria, dev_nome, ...), mantendo paridade com
  // o modo Electron. Antes retornava camelCase e omitia cores/créditos, por
  // isso a identidade "sumia" no modo web.
  return {
    ...config,
    loja_nome: config.loja_nome || "Minha Loja",
    loja_subtitulo: config.loja_subtitulo || "Terminal de Vendas",
    loja_endereco: config.loja_endereco || "",
    loja_cidade: config.loja_cidade || "",
    loja_telefone: config.loja_telefone || "",
    loja_documento: config.loja_documento || "",
    loja_logo_base64: config.loja_logo_base64 || "",
    loja_bg_base64: config.loja_bg_base64 || "",
    cor_primaria: config.cor_primaria || "",
    cor_secundaria: config.cor_secundaria || "",
    dev_nome: config.dev_nome || "",
    dev_link: config.dev_link || "",
  };
}

module.exports = { getConfigMap, getConfig, saveConfig, getTenantConfig };
