// =============================================================
// Cálculo de comissão — função pura, compartilhada entre o backend
// (apps/pdv-back) e o Electron (apps/pdv). O carregamento das taxas
// do banco continua em cada lado (acesso a dados), mas a REGRA é única.
//
// Regra híbrida por item:
//   - NOVO:  % sobre o faturamento líquido (receita - desconto rateado)
//   - USADO: % sobre o lucro (receita líquida - custo)
// =============================================================

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Comissão de um único item de venda.
 * @param {object} item  - { preco_unitario, quantidade, custo_unitario, tipo }
 * @param {object} venda - { subtotal, desconto_valor }
 * @param {number} taxaNovos  - ex.: 0.30 = 30%
 * @param {number} taxaUsados - ex.: 0.25 = 25%
 * @returns {number}
 */
function calcularComissaoItem(item, venda, taxaNovos, taxaUsados) {
  const totalItem = toNumber(item.preco_unitario) * toNumber(item.quantidade);
  const subtotal = toNumber(venda.subtotal);

  // Rateio proporcional do desconto da venda para o item.
  const ratio = subtotal > 0 ? totalItem / subtotal : 0;
  const descontoItem = toNumber(venda.desconto_valor) * ratio;
  const receitaLiqItem = totalItem - descontoItem;

  if (item.tipo === "usado") {
    const custoItem = toNumber(item.custo_unitario) * toNumber(item.quantidade);
    const lucroItem = receitaLiqItem - custoItem;
    return lucroItem > 0 ? lucroItem * taxaUsados : 0;
  }

  return receitaLiqItem > 0 ? receitaLiqItem * taxaNovos : 0;
}

/**
 * Comissão total de uma venda (soma dos itens).
 */
function calcularComissaoVenda(itensVenda, venda, taxaNovos, taxaUsados) {
  return (itensVenda || []).reduce(
    (total, item) => total + calcularComissaoItem(item, venda, taxaNovos, taxaUsados),
    0,
  );
}

module.exports = { calcularComissaoItem, calcularComissaoVenda };
