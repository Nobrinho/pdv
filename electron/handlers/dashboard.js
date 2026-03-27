/**
 * Handlers de Dashboard, Estatísticas e Estoque
 */
const { carregarTaxas, calcularComissaoItem } = require("../services/commission");

function register(safeHandle, knex) {
  safeHandle("get-dashboard-stats", async () => {
    const now = new Date();
    const startOfDay = new Date(
      now.getFullYear(), now.getMonth(), now.getDate(),
    ).getTime();
    const endOfDay = new Date(
      now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999,
    ).getTime();

    const vendas = await knex("vendas")
      .whereBetween("data_venda", [startOfDay, endOfDay])
      .where("cancelada", 0);

    const servicos = await knex("servicos_avulsos").whereBetween(
      "data_servico", [startOfDay, endOfDay],
    );

    const { comissaoPadrao, comissaoUsados } = await carregarTaxas(knex);

    const vendaIds = vendas.map((v) => v.id);

    // MELHORIA: buscar vendedores apenas dos IDs relevantes
    const vendedorIds = [...new Set(vendas.map((v) => v.vendedor_id).filter(Boolean))];
    const pessoas = vendedorIds.length > 0
      ? await knex("pessoas").whereIn("id", vendedorIds).select("id", "comissao_fixa")
      : [];

    const itens =
      vendaIds.length > 0
        ? await knex("venda_itens")
            .leftJoin("produtos", "venda_itens.produto_id", "produtos.id")
            .whereIn("venda_id", vendaIds)
            .select("venda_itens.*", "produtos.tipo")
        : [];

    let totalFaturamento = 0;
    let totalMaoDeObra = 0;
    let totalComissoes = 0;
    let totalCustoProdutos = 0;

    vendas.forEach((venda) => {
      totalFaturamento += venda.total_final - (venda.mao_de_obra || 0);
      if (venda.mao_de_obra) totalMaoDeObra += venda.mao_de_obra;

      const vendedor = pessoas.find((p) => p.id === venda.vendedor_id);
      const taxaVendedorNovos =
        vendedor && vendedor.comissao_fixa
          ? vendedor.comissao_fixa / 100
          : comissaoPadrao;

      const itensVenda = itens.filter((i) => i.venda_id === venda.id);

      itensVenda.forEach((item) => {
        totalCustoProdutos += item.custo_unitario * item.quantidade;
        totalComissoes += calcularComissaoItem(item, venda, taxaVendedorNovos, comissaoUsados);
      });
    });

    servicos.forEach((s) => {
      totalMaoDeObra += s.valor;
    });

    const lucro =
      totalFaturamento - totalCustoProdutos - totalComissoes - totalMaoDeObra;

    return {
      faturamento: totalFaturamento,
      lucro: lucro,
      vendasCount: vendas.length,
      maoDeObra: totalMaoDeObra,
      comissoes: totalComissoes,
    };
  });

  safeHandle("get-weekly-sales", async () => {
    const today = new Date();
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);
    const endOfToday = new Date(today);
    endOfToday.setHours(23, 59, 59, 999);

    const rows = await knex("vendas")
      .whereBetween("data_venda", [sevenDaysAgo.getTime(), endOfToday.getTime()])
      .where("cancelada", 0)
      .select(
        knex.raw("CAST((data_venda / 86400000) AS INTEGER) as day_key"),
        knex.raw("SUM(total_final - mao_de_obra) as total"),
      )
      .groupByRaw("CAST((data_venda / 86400000) AS INTEGER)");

    const dayMap = {};
    rows.forEach((r) => { dayMap[r.day_key] = r.total || 0; });

    const labels = [];
    const data = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      const dayKey = Math.floor(d.getTime() / 86400000);
      labels.push(d.toLocaleDateString("pt-BR", { weekday: "short" }));
      data.push(dayMap[dayKey] || 0);
    }
    return { labels, data };
  });

  safeHandle("get-low-stock", async () => {
    return await knex("produtos")
      .where("estoque_atual", "<=", 5)
      .where("ativo", true)
      .limit(10);
  });

  // MELHORIA: Cálculo 100% SQL em vez de loop JS
  safeHandle("get-inventory-stats", async () => {
    const stats = await knex("produtos")
      .where("ativo", true)
      .select(
        knex.raw("COALESCE(SUM(custo * estoque_atual), 0) as custoTotal"),
        knex.raw("COALESCE(SUM(preco_venda * estoque_atual), 0) as vendaPotencial"),
        knex.raw("SUM(CASE WHEN estoque_atual <= 0 THEN 1 ELSE 0 END) as qtdZerados"),
        knex.raw("SUM(CASE WHEN estoque_atual > 0 AND estoque_atual <= 5 THEN 1 ELSE 0 END) as qtdBaixoEstoque"),
        knex.raw("COALESCE(SUM(estoque_atual), 0) as totalItensFisicos"),
      )
      .first();

    return {
      custoTotal: stats.custoTotal || 0,
      vendaPotencial: stats.vendaPotencial || 0,
      lucroProjetado: (stats.vendaPotencial || 0) - (stats.custoTotal || 0),
      qtdZerados: stats.qtdZerados || 0,
      qtdBaixoEstoque: stats.qtdBaixoEstoque || 0,
      totalItensFisicos: stats.totalItensFisicos || 0,
    };
  });
}

module.exports = { register };
