function startOfDay(date = new Date()) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

async function getDashboardStats(knex, lojaId) {
  const today = startOfDay();

  const [salesRow, todayRow, productsRow, clientsRow] = await Promise.all([
    knex("vendas")
      .where({ loja_id: lojaId, cancelada: false })
      .sum("total_final as faturamento")
      .count("id as totalVendas")
      .first(),
    knex("vendas")
      .where({ loja_id: lojaId, cancelada: false })
      .where("data_venda", ">=", today)
      .sum("total_final as faturamentoHoje")
      .count("id as vendasHoje")
      .first(),
    knex("produtos")
      .where({ loja_id: lojaId, ativo: true })
      .count("id as totalProdutos")
      .sum("estoque_atual as estoqueTotal")
      .first(),
    knex("clientes")
      .where({ loja_id: lojaId, ativo: true })
      .count("id as totalClientes")
      .first(),
  ]);

  const costRow = await knex("venda_itens")
    .join("vendas", function () {
      this.on("venda_itens.venda_id", "=", "vendas.id").andOn("venda_itens.loja_id", "=", "vendas.loja_id");
    })
    .where("venda_itens.loja_id", lojaId)
    .where("vendas.cancelada", false)
    .sum({ custo_total: knex.raw("venda_itens.custo_unitario * venda_itens.quantidade") })
    .first();

  const faturamento = Number(salesRow?.faturamento || 0);
  const custo = Number(costRow?.custo_total || 0);

  return {
    totalVendas: Number(salesRow?.totalVendas || 0),
    faturamento,
    lucro: faturamento - custo,
    vendasHoje: Number(todayRow?.vendasHoje || 0),
    faturamentoHoje: Number(todayRow?.faturamentoHoje || 0),
    totalProdutos: Number(productsRow?.totalProdutos || 0),
    estoqueTotal: Number(productsRow?.estoqueTotal || 0),
    totalClientes: Number(clientsRow?.totalClientes || 0),
  };
}

async function getWeeklySales(knex, lojaId) {
  const start = startOfDay();
  start.setDate(start.getDate() - 6);

  const rows = await knex("vendas")
    .where({ loja_id: lojaId, cancelada: false })
    .where("data_venda", ">=", start)
    .select(knex.raw("DATE(data_venda) as dia"))
    .sum("total_final as total")
    .count("id as quantidade")
    .groupByRaw("DATE(data_venda)")
    .orderBy("dia", "asc");

  return rows.map((row) => ({
    dia: row.dia,
    total: Number(row.total || 0),
    quantidade: Number(row.quantidade || 0),
  }));
}

async function getLowStock(knex, lojaId, limit = 10) {
  return await knex("produtos")
    .where({ loja_id: lojaId, ativo: true })
    .where("estoque_atual", "<=", 3)
    .select("id", "codigo", "descricao", "estoque_atual", "preco_venda")
    .orderBy("estoque_atual", "asc")
    .limit(Math.min(Number(limit || 10), 50));
}

async function getInventoryStats(knex, lojaId) {
  const row = await knex("produtos")
    .where({ loja_id: lojaId, ativo: true })
    .count("id as totalProdutos")
    .sum("estoque_atual as estoqueTotal")
    .sum({ custoEstoque: knex.raw("custo * estoque_atual") })
    .sum({ valorVendaEstoque: knex.raw("preco_venda * estoque_atual") })
    .first();

  return {
    totalProdutos: Number(row?.totalProdutos || 0),
    estoqueTotal: Number(row?.estoqueTotal || 0),
    custoEstoque: Number(row?.custoEstoque || 0),
    valorVendaEstoque: Number(row?.valorVendaEstoque || 0),
  };
}

module.exports = { getDashboardStats, getWeeklySales, getLowStock, getInventoryStats };
