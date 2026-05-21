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

function calcularComissaoItem(item, venda, taxaNovos, taxaUsados) {
  const totalItem = Number(item.preco_unitario) * Number(item.quantidade);
  const ratio = Number(venda.subtotal) > 0 ? totalItem / Number(venda.subtotal) : 0;
  const descontoItem = Number(venda.desconto_valor || 0) * ratio;
  const receitaLiqItem = totalItem - descontoItem;

  if (item.tipo === "usado") {
    const custoItem = Number(item.custo_unitario) * Number(item.quantidade);
    const lucroItem = receitaLiqItem - custoItem;
    return lucroItem > 0 ? lucroItem * taxaUsados : 0;
  }

  return receitaLiqItem > 0 ? receitaLiqItem * taxaNovos : 0;
}

function calcularComissaoVenda(itensVenda, venda, taxaNovos, taxaUsados) {
  return itensVenda.reduce(
    (total, item) => total + calcularComissaoItem(item, venda, taxaNovos, taxaUsados),
    0,
  );
}

module.exports = { carregarTaxas, calcularComissaoVenda };
