// A regra de cálculo (pura) vem do contrato compartilhado; aqui fica só o
// carregamento das taxas do banco local (SQLite).
const {
  calcularComissaoItem,
  calcularComissaoVenda,
} = require("../../../../packages/shared/domain/commission");

/**
 * Carrega as taxas de comissão globais do banco de dados.
 * @param {import("knex").Knex} knex
 * @returns {Promise<{ comissaoPadrao: number, comissaoUsados: number }>}
 */
async function carregarTaxas(knex) {
  const configPadrao = await knex("configuracoes")
    .where("chave", "comissao_padrao")
    .first();
  const configUsados = await knex("configuracoes")
    .where("chave", "comissao_usados")
    .first();

  return {
    comissaoPadrao: configPadrao ? parseFloat(configPadrao.valor) : 0.3,
    comissaoUsados: configUsados ? parseFloat(configUsados.valor) : 0.25,
  };
}

module.exports = { carregarTaxas, calcularComissaoItem, calcularComissaoVenda };
