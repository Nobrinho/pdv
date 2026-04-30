/**
 * Handlers de Vendas (criação, listagem, itens, cancelamento)
 */
const { carregarTaxas, calcularComissaoVenda } = require("../services/commission");

function register(safeHandle, knex) {
  safeHandle("create-sale", async (event, saleData) => {
    const trx = await knex.transaction();
    try {
      const formaPagamentoResumo =
        saleData.pagamentos.length > 1
          ? "Múltiplos"
          : saleData.pagamentos[0].metodo;

      // MELHORIA: Verificar estoque antes de decrementar
      for (const item of saleData.itens) {
        const produto = await trx("produtos").where("id", item.id).first();
        if (!produto) throw new Error(`Produto #${item.id} não encontrado.`);
        if (produto.estoque_atual < item.qty) {
          throw new Error(
            `Estoque insuficiente: "${produto.descricao}" tem ${produto.estoque_atual} unidades, pedido: ${item.qty}`
          );
        }
      }

      const [saleId] = await trx("vendas").insert({
        vendedor_id: saleData.vendedor_id,
        trocador_id: saleData.trocador_id || null,
        cliente_id: saleData.cliente_id || null,
        subtotal: saleData.subtotal,
        mao_de_obra: saleData.mao_de_obra || 0,
        acrescimo: saleData.acrescimo_valor || 0,
        desconto_valor: saleData.desconto_valor || 0,
        desconto_tipo: saleData.desconto_tipo || "fixed",
        total_final: saleData.total_final,
        forma_pagamento: formaPagamentoResumo,
        data_venda: Date.now(),
      });

      const items = saleData.itens.map((item) => ({
        venda_id: saleId,
        produto_id: item.id,
        quantidade: item.qty,
        preco_unitario: item.preco_venda,
        custo_unitario: item.custo,
      }));

      if (items.length > 0) {
        await trx("venda_itens").insert(items);
        for (const item of items) {
          await trx("produtos")
            .where("id", item.produto_id)
            .decrement("estoque_atual", item.quantidade);
        }
      }

      const pagamentos = saleData.pagamentos.map((p) => ({
        venda_id: saleId,
        metodo: p.metodo,
        valor: p.valor,
        detalhes: p.detalhes || "",
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
              data_lancamento: Date.now(),
            });
          }
        }
      }

      await trx.commit();
      
      // Sincroniza com a nuvem em background (sem travar a resposta para o usuário)
      const { syncData } = require("../lib/turso");
      syncData();

      return { success: true, id: saleId };
    } catch (error) {
      await trx.rollback();
      return { success: false, error: error.message };
    }
  });

  safeHandle("get-sales", async (event, filters = {}) => {
    const page = filters.page ? parseInt(filters.page, 10) : null;
    const limit = filters.limit ? parseInt(filters.limit, 10) : null;
    const hasPagination = Number.isInteger(page) && Number.isInteger(limit) && page > 0 && limit > 0;
    const offset = hasPagination ? (page - 1) * limit : 0;

    const query = knex("vendas")
      .leftJoin("pessoas as vendedor", "vendas.vendedor_id", "vendedor.id")
      .leftJoin("pessoas as trocador", "vendas.trocador_id", "trocador.id")
      .leftJoin("clientes", "vendas.cliente_id", "clientes.id")
      .select(
        "vendas.*",
        "vendedor.nome as vendedor_nome",
        "trocador.nome as trocador_nome",
        "vendedor.comissao_fixa",
        "clientes.documento as cliente_documento",
        "clientes.telefone as cliente_telefone",
        "clientes.nome as cliente_nome"
      )
      .orderBy("data_venda", "desc");

    if (filters.startDate) {
      query.where("vendas.data_venda", ">=", filters.startDate);
    }
    if (filters.endDate) {
      query.where("vendas.data_venda", "<=", filters.endDate);
    }
    if (filters.sellerId) {
      query.where("vendas.vendedor_id", filters.sellerId);
    }
    if (filters.clientId) {
      query.where("vendas.cliente_id", filters.clientId);
    }

    const countQuery = knex("vendas");
    if (filters.startDate) {
      countQuery.where("vendas.data_venda", ">=", filters.startDate);
    }
    if (filters.endDate) {
      countQuery.where("vendas.data_venda", "<=", filters.endDate);
    }
    if (filters.sellerId) {
      countQuery.where("vendas.vendedor_id", filters.sellerId);
    }
    if (filters.clientId) {
      countQuery.where("vendas.cliente_id", filters.clientId);
    }

    if (hasPagination) {
      query.limit(limit).offset(offset);
    } else if (filters.limit) {
      query.limit(filters.limit);
    }

    const vendas = await query;
    const vendaIds = vendas.map((v) => v.id);

    const allItems = await knex("venda_itens")
      .leftJoin("produtos", "venda_itens.produto_id", "produtos.id")
      .whereIn("venda_id", vendaIds)
      .select("venda_itens.*", "produtos.tipo", "produtos.descricao");

    const allPayments = await knex("venda_pagamentos")
      .whereIn("venda_id", vendaIds)
      .select("*");

    // Usa serviço de comissão centralizado
    const { comissaoPadrao, comissaoUsados } = await carregarTaxas(knex);

    const vendasProcessadas = vendas.map((venda) => {
      const itensVenda = allItems.filter((i) => i.venda_id === venda.id);
      const pagamentosVenda = allPayments.filter((p) => p.venda_id === venda.id);
      const custoTotal = itensVenda.reduce(
        (acc, item) => acc + item.custo_unitario * item.quantidade,
        0,
      );

      const taxaVendedorNovos = venda.comissao_fixa
        ? venda.comissao_fixa / 100
        : comissaoPadrao;

      const comissaoTotal = calcularComissaoVenda(
        itensVenda, venda, taxaVendedorNovos, comissaoUsados
      );

      return {
        ...venda,
        custo_total_real: custoTotal,
        comissao_real: comissaoTotal,
        lista_pagamentos: pagamentosVenda,
        itens: itensVenda,
      };
    });

    if (!hasPagination) {
      return vendasProcessadas;
    }

    const countResult = await countQuery.count("id as total").first();
    const total = Number(countResult?.total || 0);
    const totalPages = Math.ceil(total / limit);

    return {
      data: vendasProcessadas,
      total,
      page,
      totalPages,
    };
  });

  safeHandle("get-sale-items", async (event, id) => {
    return await knex("venda_itens")
      .leftJoin("produtos", "venda_itens.produto_id", "produtos.id")
      .where("venda_id", id)
      .select("venda_itens.*", "produtos.descricao", "produtos.codigo");
  });

  safeHandle("cancel-sale", async (event, { vendaId, motivo }) => {
    const trx = await knex.transaction();
    try {
      const itens = await trx("venda_itens").where("venda_id", vendaId);
      for (const item of itens) {
        await trx("produtos")
          .where("id", item.produto_id)
          .increment("estoque_atual", item.quantidade);
      }
      await trx("vendas").where("id", vendaId).update({
        cancelada: true,
        motivo_cancelamento: motivo,
        data_cancelamento: Date.now(),
      });

      // MELHORIA: Cancelar contas a receber associadas
      await trx("contas_receber")
        .where("venda_id", vendaId)
        .update({ status: "CANCELADO" });

      await trx.commit();
      return { success: true };
    } catch (error) {
      await trx.rollback();
      return { success: false, error: error.message };
    }
  });

  safeHandle("pay-commissions", async (event, vendaIds) => {
    if (!vendaIds || vendaIds.length === 0) return { success: true };
    await knex("vendas")
      .whereIn("id", vendaIds)
      .update({
        comissao_paga: true,
        data_pagamento_comissao: Date.now(),
      });
    return { success: true };
  });
}

module.exports = { register };
