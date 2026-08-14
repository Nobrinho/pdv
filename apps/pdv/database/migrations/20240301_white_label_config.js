/**
 * Migration: White Label — Configurações de identidade da loja
 * Insere chaves padrão na tabela 'configuracoes' para permitir
 * personalização completa sem alteração de código.
 */
exports.up = async function (knex) {
  const keys = [
    { chave: "loja_nome", valor: "Minha Loja" },
    { chave: "loja_subtitulo", valor: "Terminal de Vendas" },
    { chave: "loja_endereco", valor: "" },
    { chave: "loja_cidade", valor: "" },
    { chave: "loja_telefone", valor: "" },
    { chave: "loja_documento", valor: "" },
    { chave: "loja_logo_base64", valor: "" },
    { chave: "loja_bg_base64", valor: "" },
    { chave: "cor_primaria", valor: "#2563EB" },
    { chave: "cor_secundaria", valor: "#4F46E5" },
    { chave: "dev_nome", valor: "" },
    { chave: "dev_link", valor: "" },
  ];

  for (const item of keys) {
    const exists = await knex("configuracoes").where("chave", item.chave).first();
    if (!exists) {
      await knex("configuracoes").insert(item);
    }
  }
};

exports.down = async function (knex) {
  await knex("configuracoes")
    .whereIn("chave", [
      "loja_nome", "loja_subtitulo", "loja_endereco", "loja_cidade",
      "loja_telefone", "loja_documento", "loja_logo_base64", "loja_bg_base64",
      "cor_primaria", "cor_secundaria", "dev_nome", "dev_link",
    ])
    .del();
};
