// Regra de cálculo (pura) vem do contrato compartilhado; aqui fica só o
// carregamento das taxas do banco (específico do backend multi-loja).
const {
  calcularComissaoItem,
  calcularComissaoVenda,
} = require("../../../../packages/shared/domain/commission");

async function carregarTaxas(knex, lojaId) {
  const rows = await knex("configuracoes")
    .where("loja_id", lojaId)
    .whereIn("chave", ["comissao_padrao", "comissao_usados"]);

  const map = new Map(rows.map((row) => [row.chave, row.valor]));
  return {
    comissaoPadrao: map.has("comissao_padrao") ? Number(map.get("comissao_padrao")) : 0.3,
    comissaoUsados: map.has("comissao_usados") ? Number(map.get("comissao_usados")) : 0.25,
  };
}

module.exports = { carregarTaxas, calcularComissaoItem, calcularComissaoVenda };
