import { BaseRepository } from "./BaseRepository";
import { Sale, SaleItem, SalePayment } from "../../../src/types";


export class VendasRepository extends BaseRepository {
  constructor() {
    super("vendas");
  }

  async createFullSale(saleData: any) {
    const trx = await this.db.transaction();
    const now = Date.now();

    try {
      const formaPagamentoResumo =
        saleData.pagamentos.length > 1
          ? "Múltiplos"
          : saleData.pagamentos[0].metodo;

      const [saleId] = await trx("vendas").insert({
        vendedor_id: saleData.vendedor_id,
        trocador_id: null,
        cliente_id: saleData.cliente_id || null,
        subtotal: saleData.subtotal,
        mao_de_obra: 0,
        acrescimo: saleData.acrescimo_valor || 0,
        desconto_valor: saleData.desconto_valor || 0,
        desconto_tipo: saleData.desconto_tipo || "percent",
        total_final: saleData.total_final,
        forma_pagamento: formaPagamentoResumo,
        data_venda: now,
        empresa_id: this.companyId,
        updated_at: now,
        synced: false
      });

      const items = saleData.itens.map((item: any) => ({
        venda_id: saleId,
        produto_id: item.id,
        quantidade: item.qty,
        preco_unitario: item.preco_venda,
        custo_unitario: item.custo,
        empresa_id: this.companyId,
        updated_at: now,
        synced: false
      }));

      if (items.length > 0) {
        await trx("venda_itens").insert(items);
        for (const item of items) {
          await trx("produtos")
            .where("id", item.produto_id)
            .where("empresa_id", this.companyId)
            .decrement("estoque_atual", item.quantidade)
            .update({ updated_at: now, synced: false });
        }
      }

      const pagamentos = saleData.pagamentos.map((p: SalePayment) => ({
        venda_id: saleId,
        metodo: p.metodo,
        valor: p.valor,
        detalhes: p.detalhes || "",
        empresa_id: this.companyId,
        updated_at: now,
        synced: false
      }));

      if (pagamentos.length > 0) {
        await trx("venda_pagamentos").insert(pagamentos);

        for (const pg of pagamentos) {
          if (pg.metodo === "Fiado") {
            if (!saleData.cliente_id)
              throw new Error("Venda Fiado exige um cliente selecionado.");

            await trx("contas_receber").insert({
              cliente_id: saleData.cliente_id,
              venda_id: saleId,
              descricao: `Venda #${saleId}`,
              valor_total: pg.valor,
              valor_pago: 0,
              status: "PENDENTE",
              data_lancamento: now,
              empresa_id: this.companyId,
              updated_at: now,
              synced: false
            });
          }
        }
      }

      // Registrar vendas na fila de sync
      await this.addToSyncQueueTrx(trx, saleId, "INSERT", saleData, "vendas");

      await trx.commit();
      return { success: true, id: saleId };
    } catch (error: any) {
      await trx.rollback();
      throw error;
    }
  }

  async getAllDetailed(): Promise<any[]> {
    const vendas = await this.db("vendas")
      .leftJoin("pessoas as vendedor", "vendas.vendedor_id", "vendedor.id")
      .leftJoin("pessoas as trocador", "vendas.trocador_id", "trocador.id")
      .where("vendas.empresa_id", this.companyId)
      .whereNull("vendas.deleted_at")
      .select(
        "vendas.*",
        "vendedor.nome as vendedor_nome",
        "trocador.nome as trocador_nome",
        "vendedor.comissao_fixa"
      )
      .orderBy("data_venda", "desc");

    if (vendas.length === 0) return [];

    const vendaIds = vendas.map((v) => v.id);

    const allItems = await this.db("venda_itens")
      .leftJoin("produtos", "venda_itens.produto_id", "produtos.id")
      .whereIn("venda_id", vendaIds)
      .select("venda_itens.*", "produtos.tipo");

    const allPayments = await this.db("venda_pagamentos")
      .whereIn("venda_id", vendaIds)
      .select("*");

    const configPadrao = await this.db("configuracoes")
      .where("chave", "comissao_padrao")
      .where("empresa_id", this.companyId)
      .first();
    const configUsados = await this.db("configuracoes")
      .where("chave", "comissao_usados")
      .where("empresa_id", this.companyId)
      .first();

    const comissaoPadrao = configPadrao ? parseFloat(configPadrao.valor) : 0.04; // Ajustado para 4% real
    const comissaoUsados = configUsados ? parseFloat(configUsados.valor) : 0.25;

    return vendas.map((venda: any) => {
      const itensVenda = allItems.filter((i) => i.venda_id === venda.id);
      const pagamentosVenda = allPayments.filter(
        (p) => p.venda_id === venda.id
      );
      const custoTotal = itensVenda.reduce(
        (acc, item) => acc + item.custo_unitario * item.quantidade,
        0
      );

      let comissaoTotal = 0;
      const taxaVendedorNovos = venda.comissao_fixa
        ? venda.comissao_fixa / 100
        : comissaoPadrao;

      itensVenda.forEach((item) => {
        const totalItem = item.preco_unitario * item.quantidade;
        let descontoItem = 0;
        if (venda.desconto_tipo === "fixed") {
          const ratio = venda.subtotal > 0 ? totalItem / venda.subtotal : 0;
          descontoItem = venda.desconto_valor * ratio;
        } else {
          descontoItem = (totalItem * venda.desconto_valor) / 100;
        }

        const receitaLiqItem = totalItem - descontoItem;

        if (item.tipo === "usado") {
          const custoItem = item.custo_unitario * item.quantidade;
          const lucroItem = receitaLiqItem - custoItem;
          if (lucroItem > 0) comissaoTotal += lucroItem * comissaoUsados;
        } else {
          if (receitaLiqItem > 0) comissaoTotal += receitaLiqItem * taxaVendedorNovos;
        }
      });

      return {
        ...venda,
        custo_total_real: custoTotal,
        comissao_real: comissaoTotal,
        lista_pagamentos: pagamentosVenda,
      };
    });
  }

  async getSaleItems(vendaId: number): Promise<SaleItem[]> {
    return await this.db("venda_itens")
      .leftJoin("produtos", "venda_itens.produto_id", "produtos.id")
      .where("venda_id", vendaId)
      .where("venda_itens.empresa_id", this.companyId)
      .select("venda_itens.*", "produtos.descricao", "produtos.codigo");
  }

  async cancelSale(vendaId: number, motivo: string) {
    const trx = await this.db.transaction();
    const now = Date.now();
    try {
      const itens = await trx("venda_itens").where("venda_id", vendaId).where("empresa_id", this.companyId);
      for (const item of itens) {
        await trx("produtos")
          .where("id", item.produto_id)
          .where("empresa_id", this.companyId)
          .increment("estoque_atual", item.quantidade)
          .update({ updated_at: now, synced: false });
      }

      await trx("vendas")
        .where("id", vendaId)
        .where("empresa_id", this.companyId)
        .update({
          cancelada: true,
          motivo_cancelamento: motivo,
          data_cancelamento: now,
          updated_at: now,
          synced: false
        });

      await this.addToSyncQueueTrx(trx, vendaId, "UPDATE", { cancelada: true, motivo_cancelamento: motivo }, "vendas");

      await trx.commit();
      return { success: true };
    } catch (error: any) {
      await trx.rollback();
      throw error;
    }
  }
}
