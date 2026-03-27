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

/**
 * Calcula a comissão de um único item de venda.
 * Regra híbrida:
 *   - NOVO: % sobre faturamento líquido (receita - desconto)
 *   - USADO: % sobre lucro (receita - desconto - custo)
 *
 * @param {object} item - Item da venda com: preco_unitario, quantidade, custo_unitario, tipo
 * @param {object} venda - Venda com: subtotal, desconto_valor, desconto_tipo
 * @param {number} taxaNovos - Taxa de comissão para produtos novos (ex: 0.30 = 30%)
 * @param {number} taxaUsados - Taxa de comissão para produtos usados (ex: 0.25 = 25%)
 * @returns {number} Valor da comissão para este item
 */
function calcularComissaoItem(item, venda, taxaNovos, taxaUsados) {
  const totalItem = item.preco_unitario * item.quantidade;

  // Rateio proporcional do desconto da venda para o item
  let descontoItem = 0;
  if (venda.desconto_tipo === "fixed") {
    const ratio = venda.subtotal > 0 ? totalItem / venda.subtotal : 0;
    descontoItem = (venda.desconto_valor || 0) * ratio;
  } else {
    descontoItem = (totalItem * (venda.desconto_valor || 0)) / 100;
  }

  const receitaLiqItem = totalItem - descontoItem;

  if (item.tipo === "usado") {
    // USADO: comissão sobre LUCRO
    const custoItem = item.custo_unitario * item.quantidade;
    const lucroItem = receitaLiqItem - custoItem;
    return lucroItem > 0 ? lucroItem * taxaUsados : 0;
  }

  // NOVO: comissão sobre FATURAMENTO
  return receitaLiqItem > 0 ? receitaLiqItem * taxaNovos : 0;
}

/**
 * Calcula a comissão total de uma venda (soma de todos os itens).
 *
 * @param {Array} itensVenda - Lista de itens da venda
 * @param {object} venda - Dados da venda
 * @param {number} taxaNovos - Taxa para novos
 * @param {number} taxaUsados - Taxa para usados
 * @returns {number} Comissão total da venda
 */
function calcularComissaoVenda(itensVenda, venda, taxaNovos, taxaUsados) {
  let total = 0;
  for (const item of itensVenda) {
    total += calcularComissaoItem(item, venda, taxaNovos, taxaUsados);
  }
  return total;
}

module.exports = { carregarTaxas, calcularComissaoItem, calcularComissaoVenda };
