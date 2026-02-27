import { BaseRepository } from "./BaseRepository";

export class DashboardRepository extends BaseRepository {
  constructor() {
    super("vendas");
  }

  async getDashboardStats() {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).getTime();

    const vendas = await this.db("vendas")
      .where("empresa_id", this.companyId)
      .whereNull("deleted_at")
      .where("data_venda", ">=", startOfDay)
      .where("data_venda", "<=", endOfDay)
      .where("cancelada", false);

    const servicos = await this.db("servicos_avulsos")
      .where("empresa_id", this.companyId)
      .whereNull("deleted_at")
      .where("data_servico", ">=", startOfDay)
      .where("data_servico", "<=", endOfDay);

    const configPadrao = await this.db("configuracoes")
      .where("chave", "comissao_padrao")
      .where("empresa_id", this.companyId)
      .first();
    const configUsados = await this.db("configuracoes")
      .where("chave", "comissao_usados")
      .where("empresa_id", this.companyId)
      .first();
    
    const comissaoPadrao = configPadrao ? parseFloat(configPadrao.valor) : 0.04; // 4% padrão
    const comissaoUsados = configUsados ? parseFloat(configUsados.valor) : 0.25;

    const pessoas = await this.db("pessoas")
      .where("empresa_id", this.companyId)
      .whereNull("deleted_at");

    const vendaIds = vendas.map((v) => v.id);
    const itens = vendaIds.length > 0
      ? await this.db("venda_itens")
          .leftJoin("produtos", "venda_itens.produto_id", "produtos.id")
          .whereIn("venda_id", vendaIds)
          .where("venda_itens.empresa_id", this.companyId)
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
      const taxaVendedorNovos = vendedor && vendedor.comissao_fixa
        ? vendedor.comissao_fixa / 100
        : comissaoPadrao;

      const itensVenda = itens.filter((i) => i.venda_id === venda.id);

      itensVenda.forEach((item) => {
        const totalItem = item.preco_unitario * item.quantidade;
        const custoItem = item.custo_unitario * item.quantidade;
        totalCustoProdutos += custoItem;

        let descontoItem = 0;
        if (venda.desconto_tipo === "fixed") {
          const ratio = venda.subtotal > 0 ? totalItem / venda.subtotal : 0;
          descontoItem = venda.desconto_valor * ratio;
        } else {
          descontoItem = (totalItem * venda.desconto_valor) / 100;
        }
        const receitaLiqItem = totalItem - descontoItem;

        if (item.tipo === "usado") {
          const lucroItem = receitaLiqItem - custoItem;
          if (lucroItem > 0) totalComissoes += lucroItem * comissaoUsados;
        } else {
          if (receitaLiqItem > 0) totalComissoes += receitaLiqItem * taxaVendedorNovos;
        }
      });
    });

    servicos.forEach((s) => {
      totalMaoDeObra += s.valor;
    });

    const lucro = totalFaturamento - totalCustoProdutos - totalComissoes - totalMaoDeObra;

    return {
      faturamento: totalFaturamento,
      lucro: lucro,
      vendasCount: vendas.length,
      maoDeObra: totalMaoDeObra,
      comissoes: totalComissoes,
    };
  }

  async getWeeklySales() {
    const labels = [];
    const data = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      const nextD = new Date(d);
      nextD.setDate(d.getDate() + 1);

      const res = await this.db("vendas")
        .where("empresa_id", this.companyId)
        .whereNull("deleted_at")
        .where("data_venda", ">=", d.getTime())
        .where("data_venda", "<", nextD.getTime())
        .where("cancelada", false)
        .sum({ total: this.db.raw("total_final - mao_de_obra") } as any)
        .first();

      labels.push(d.toLocaleDateString("pt-BR", { weekday: "short" }));
      data.push((res as any).total || 0);
    }
    return { labels, data };
  }

  // --- INVENTÁRIO ---
  async getLowStock() {
    return await this.db("produtos")
      .where("empresa_id", this.companyId)
      .whereNull("deleted_at")
      .where("ativo", true)
      .where("estoque_atual", "<=", 5)
      .limit(10);
  }

  async getInventoryStats() {
    const produtos = await this.db("produtos")
      .where("empresa_id", this.companyId)
      .whereNull("deleted_at")
      .where("ativo", true)
      .select("custo", "preco_venda", "estoque_atual");

    let custoTotal = 0;
    let vendaPotencial = 0;
    let qtdZerados = 0;
    let qtdBaixoEstoque = 0;
    let totalItensFisicos = 0;

    produtos.forEach((p) => {
      const qtd = p.estoque_atual || 0;
      const custo = p.custo || 0;
      const venda = p.preco_venda || 0;

      if (qtd <= 0) qtdZerados++;
      if (qtd > 0 && qtd <= 5) qtdBaixoEstoque++;

      totalItensFisicos += qtd;
      custoTotal += custo * qtd;
      vendaPotencial += venda * qtd;
    });

    return {
      custoTotal,
      vendaPotencial,
      lucroProjetado: vendaPotencial - custoTotal,
      qtdZerados,
      qtdBaixoEstoque,
      totalItensFisicos,
    };
  }
}
