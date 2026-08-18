const { carregarTaxas, calcularComissaoVenda } = require("./commissionService");

function startOfDay(date = new Date()) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function endOfDay(date = new Date()) {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
}

function toNumber(value, fallback = 0) {
  const normalized = Number(value);
  return Number.isFinite(normalized) ? normalized : fallback;
}

// `sellerId` opcional: escopa o painel aos dados de um vendedor (pessoa). Quando
// definido, filtra vendas por vendedor_id e serviços por trocador_id, e ignora
// as despesas da loja (que não são atribuídas a um vendedor).
async function getDashboardStats(knex, lojaId, sellerId = null) {
  const start = startOfDay();
  const end = endOfDay();
  const scoped = sellerId !== null && sellerId !== undefined;

  const vendas = await knex("vendas")
    .where({ loja_id: lojaId, cancelada: false })
    .whereBetween("data_venda", [start, end])
    .modify((q) => {
      if (scoped) q.where("vendedor_id", sellerId);
    })
    .select("*");

  const vendaIds = vendas.map((venda) => venda.id);
  const vendedorIds = [...new Set(vendas.map((venda) => venda.vendedor_id).filter(Boolean))];

  const [servicos, pessoas, itens, { comissaoPadrao, comissaoUsados }, despesaRow] = await Promise.all([
    knex("servicos_avulsos")
      .where({ loja_id: lojaId })
      .whereBetween("data_servico", [start, end])
      .modify((q) => {
        if (scoped) q.where("trocador_id", sellerId);
      })
      .select("*"),
    vendedorIds.length > 0
      ? knex("pessoas").where({ loja_id: lojaId }).whereIn("id", vendedorIds).select("id", "comissao_fixa")
      : [],
    vendaIds.length > 0
      ? knex("venda_itens")
          .leftJoin("produtos", function () {
            this.on("venda_itens.produto_id", "=", "produtos.id").andOn(
              "venda_itens.loja_id",
              "=",
              "produtos.loja_id",
            );
          })
          .where("venda_itens.loja_id", lojaId)
          .whereIn("venda_itens.venda_id", vendaIds)
          .select("venda_itens.*", "produtos.tipo")
      : [],
    carregarTaxas(knex, lojaId),
    knex("despesas")
      .where({ loja_id: lojaId })
      .whereBetween("data_despesa", [start, end])
      .sum("valor as total")
      .first(),
  ]);

  let faturamento = 0;
  let maoDeObra = 0;
  let comissoes = 0;
  let custoProdutos = 0;

  for (const venda of vendas) {
    faturamento += toNumber(venda.total_final) - toNumber(venda.mao_de_obra);
    maoDeObra += toNumber(venda.mao_de_obra);

    const itensVenda = itens.filter((item) => item.venda_id === venda.id);
    const vendedor = pessoas.find((pessoa) => pessoa.id === venda.vendedor_id);
    const taxaNovos = vendedor?.comissao_fixa ? toNumber(vendedor.comissao_fixa) / 100 : comissaoPadrao;

    custoProdutos += itensVenda.reduce(
      (total, item) => total + toNumber(item.custo_unitario) * toNumber(item.quantidade),
      0,
    );
    comissoes += calcularComissaoVenda(itensVenda, venda, taxaNovos, comissaoUsados);
  }

  maoDeObra += servicos.reduce((total, servico) => total + toNumber(servico.valor), 0);
  // Despesas são da loja (não atribuídas a vendedor); zeradas no painel escopado.
  const despesas = scoped ? 0 : toNumber(despesaRow?.total);
  // Lucro líquido: resultado operacional menos as despesas cadastradas no dia.
  const lucro = faturamento - custoProdutos - comissoes - despesas;

  return {
    faturamento,
    lucro,
    vendasCount: vendas.length,
    maoDeObra,
    comissoes,
    despesas,
  };
}

async function getWeeklySales(knex, lojaId, sellerId = null) {
  const today = new Date();
  const start = startOfDay(today);
  start.setDate(start.getDate() - 6);
  const end = endOfDay(today);

  const rows = await knex("vendas")
    .where({ loja_id: lojaId, cancelada: false })
    .whereBetween("data_venda", [start, end])
    .modify((q) => {
      if (sellerId !== null && sellerId !== undefined) q.where("vendedor_id", sellerId);
    })
    .select("data_venda", "total_final", "mao_de_obra");

  const dayMap = {};
  for (const row of rows) {
    const saleDate = startOfDay(new Date(row.data_venda));
    const dayKey = Math.floor(saleDate.getTime() / 86400000);
    const total = toNumber(row.total_final) - toNumber(row.mao_de_obra);
    dayMap[dayKey] = (dayMap[dayKey] || 0) + total;
  }

  const labels = [];
  const data = [];
  for (let i = 6; i >= 0; i -= 1) {
    const day = startOfDay(today);
    day.setDate(day.getDate() - i);
    const dayKey = Math.floor(day.getTime() / 86400000);
    labels.push(day.toLocaleDateString("pt-BR", { weekday: "short" }));
    data.push(dayMap[dayKey] || 0);
  }

  return { labels, data };
}

async function getLowStock(knex, lojaId, limit = 10) {
  return await knex("produtos")
    .where({ loja_id: lojaId, ativo: true })
    .where("estoque_atual", "<=", 5)
    .select("id", "codigo", "descricao", "estoque_atual", "preco_venda")
    .orderBy("estoque_atual", "asc")
    .limit(Math.min(Number(limit || 10), 50));
}

async function getInventoryStats(knex, lojaId) {
  const row = await knex("produtos")
    .where({ loja_id: lojaId, ativo: true })
    .select(
      knex.raw("COALESCE(SUM(custo * estoque_atual), 0) as \"custoTotal\""),
      knex.raw("COALESCE(SUM(preco_venda * estoque_atual), 0) as \"vendaPotencial\""),
      knex.raw("COALESCE(SUM(CASE WHEN estoque_atual <= 0 THEN 1 ELSE 0 END), 0) as \"qtdZerados\""),
      knex.raw("COALESCE(SUM(CASE WHEN estoque_atual > 0 AND estoque_atual <= 5 THEN 1 ELSE 0 END), 0) as \"qtdBaixoEstoque\""),
      knex.raw("COALESCE(SUM(estoque_atual), 0) as \"totalItensFisicos\""),
    )
    .first();

  const custoTotal = toNumber(row?.custoTotal);
  const vendaPotencial = toNumber(row?.vendaPotencial);

  return {
    custoTotal,
    vendaPotencial,
    lucroProjetado: vendaPotencial - custoTotal,
    qtdZerados: toNumber(row?.qtdZerados),
    qtdBaixoEstoque: toNumber(row?.qtdBaixoEstoque),
    totalItensFisicos: toNumber(row?.totalItensFisicos),
  };
}

module.exports = { getDashboardStats, getWeeklySales, getLowStock, getInventoryStats };
