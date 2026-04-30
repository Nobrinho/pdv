/**
 * Handlers de Vendas (criacao, listagem, itens, cancelamento)
 */
const { carregarTaxas, calcularComissaoVenda } = require("../services/commission");
const { logEvent } = require("../lib/eventLogger");

const toCents = (value) => Math.round((Number(value) || 0) * 100);
const fromCents = (cents) => Number((cents / 100).toFixed(2));

const normalizeSaleTotals = (saleData) => {
  const subtotalCents = toCents(saleData.subtotal);
  const laborCents = toCents(saleData.mao_de_obra);
  const surchargeCents = toCents(saleData.acrescimo_valor);
  const discountCents = toCents(saleData.desconto_valor);

  const totalCents = Math.max(
    0,
    subtotalCents + laborCents + surchargeCents - discountCents,
  );

  return {
    subtotalCents,
    laborCents,
    surchargeCents,
    discountCents,
    totalCents,
  };
};

function register(safeHandle, knex) {
  safeHandle("create-sale", async (event, saleData) => {
    const trx = await knex.transaction();
    try {
      if (!saleData?.vendedor_id) {
        throw new Error("Venda invalida: vendedor nao informado.");
      }
      if (!Array.isArray(saleData.itens) || saleData.itens.length === 0) {
        throw new Error("Venda invalida: nenhum item informado.");
      }
      if (!Array.isArray(saleData.pagamentos) || saleData.pagamentos.length === 0) {
        throw new Error("Venda invalida: nenhum pagamento informado.");
      }

      const {
        subtotalCents,
        laborCents,
        surchargeCents,
        discountCents,
        totalCents,
      } = normalizeSaleTotals(saleData);

      if (discountCents > subtotalCents) {
        throw new Error("Desconto invalido: maior que o subtotal das pecas.");
      }

      const paymentRows = saleData.pagamentos.map((p) => ({
        metodo: p?.metodo,
        valorCents: toCents(p?.valor),
        detalhes: p?.detalhes || "",
      }));

      if (paymentRows.some((p) => !p.metodo || p.valorCents <= 0)) {
        throw new Error("Pagamento invalido: metodo ausente ou valor nao positivo.");
      }

      const totalPaidCents = paymentRows.reduce((acc, p) => acc + p.valorCents, 0);
      if (totalPaidCents < totalCents) {
        throw new Error("Pagamento invalido: valor pago menor que o total da venda.");
      }
      if (totalPaidCents > totalCents && !paymentRows.some((p) => p.metodo === "Dinheiro")) {
        throw new Error("Pagamento invalido: troco permitido apenas com Dinheiro.");
      }

      const formaPagamentoResumo =
        paymentRows.length > 1 ? "Multiplos" : paymentRows[0].metodo;

      // Verificar estoque antes de decrementar.
      for (const item of saleData.itens) {
        const produto = await trx("produtos").where("id", item.id).first();
        if (!produto) throw new Error(`Produto #${item.id} nao encontrado.`);
        if (produto.estoque_atual < item.qty) {
          throw new Error(
            `Estoque insuficiente: "${produto.descricao}" tem ${produto.estoque_atual} unidades, pedido: ${item.qty}`,
          );
        }
      }

      const [saleId] = await trx("vendas").insert({
        vendedor_id: saleData.vendedor_id,
        trocador_id: saleData.trocador_id || null,
        cliente_id: saleData.cliente_id || null,
        subtotal: fromCents(subtotalCents),
        mao_de_obra: fromCents(laborCents),
        acrescimo: fromCents(surchargeCents),
        desconto_valor: fromCents(discountCents),
        desconto_tipo: saleData.desconto_tipo || "fixed",
        total_final: fromCents(totalCents),
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

      await trx("venda_itens").insert(items);
      for (const item of items) {
        await trx("produtos")
          .where("id", item.produto_id)
          .decrement("estoque_atual", item.quantidade);
      }

      const pagamentos = paymentRows.map((p) => ({
        venda_id: saleId,
        metodo: p.metodo,
        valor: fromCents(p.valorCents),
        detalhes: p.detalhes,
      }));
      await trx("venda_pagamentos").insert(pagamentos);

      for (const pg of pagamentos) {
        if (pg.metodo === "Fiado") {
          if (!saleData.cliente_id) {
            throw new Error("Venda Fiado exige um cliente selecionado.");
          }

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

      await trx.commit();
      await logEvent(knex, {
        event_category: "domain_action",
        event_type: "sale.created",
        entity_type: "venda",
        entity_id: saleId,
        severity: "info",
        message: `Venda #${saleId} criada`,
        payload: {
          total_final: fromCents(totalCents),
          itens: saleData.itens?.length || 0,
          total_pago: fromCents(totalPaidCents),
        },
        source: "handler",
      });

      return { success: true, id: saleId };
    } catch (error) {
      await trx.rollback();
      await logEvent(knex, {
        event_category: "error",
        event_type: "sale.create_failed",
        entity_type: "venda",
        severity: "error",
        message: error.message,
        payload: { total_final: saleData?.total_final || null },
        source: "handler",
      });
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
        "clientes.nome as cliente_nome",
      )
      .orderBy("data_venda", "desc");

    if (filters.startDate) query.where("vendas.data_venda", ">=", filters.startDate);
    if (filters.endDate) query.where("vendas.data_venda", "<=", filters.endDate);
    if (filters.sellerId) query.where("vendas.vendedor_id", filters.sellerId);
    if (filters.clientId) query.where("vendas.cliente_id", filters.clientId);

    const countQuery = knex("vendas");
    if (filters.startDate) countQuery.where("vendas.data_venda", ">=", filters.startDate);
    if (filters.endDate) countQuery.where("vendas.data_venda", "<=", filters.endDate);
    if (filters.sellerId) countQuery.where("vendas.vendedor_id", filters.sellerId);
    if (filters.clientId) countQuery.where("vendas.cliente_id", filters.clientId);

    if (hasPagination) {
      query.limit(limit).offset(offset);
    } else if (filters.limit) {
      query.limit(filters.limit);
    }

    const vendas = await query;
    const vendaIds = vendas.map((v) => v.id);

    const allItems = vendaIds.length
      ? await knex("venda_itens")
          .leftJoin("produtos", "venda_itens.produto_id", "produtos.id")
          .whereIn("venda_id", vendaIds)
          .select("venda_itens.*", "produtos.tipo", "produtos.descricao")
      : [];

    const allPayments = vendaIds.length
      ? await knex("venda_pagamentos").whereIn("venda_id", vendaIds).select("*")
      : [];

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
        itensVenda, venda, taxaVendedorNovos, comissaoUsados,
      );

      return {
        ...venda,
        custo_total_real: custoTotal,
        comissao_real: comissaoTotal,
        lista_pagamentos: pagamentosVenda,
        itens: itensVenda,
      };
    });

    if (!hasPagination) return vendasProcessadas;

    const countResult = await countQuery.count("id as total").first();
    const total = Number(countResult?.total || 0);
    const totalPages = Math.ceil(total / limit);

    return { data: vendasProcessadas, total, page, totalPages };
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

      await trx("contas_receber")
        .where("venda_id", vendaId)
        .update({ status: "CANCELADO" });

      await trx.commit();
      await logEvent(knex, {
        event_category: "domain_action",
        event_type: "sale.canceled",
        entity_type: "venda",
        entity_id: vendaId,
        severity: "warning",
        message: `Venda #${vendaId} cancelada`,
        payload: { motivo },
        source: "handler",
      });
      return { success: true };
    } catch (error) {
      await trx.rollback();
      await logEvent(knex, {
        event_category: "error",
        event_type: "sale.cancel_failed",
        entity_type: "venda",
        entity_id: vendaId,
        severity: "error",
        message: error.message,
        source: "handler",
      });
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
    await logEvent(knex, {
      event_category: "domain_action",
      event_type: "commission.paid_batch",
      entity_type: "venda",
      severity: "info",
      message: `${vendaIds.length} comissao(oes) baixadas`,
      payload: { ids: vendaIds },
      source: "handler",
    });
    return { success: true };
  });
}

module.exports = { register };
