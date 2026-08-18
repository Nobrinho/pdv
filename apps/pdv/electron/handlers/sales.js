/**
 * Handlers de Vendas (criacao, listagem, itens, cancelamento)
 */
const { carregarTaxas, calcularComissaoVenda } = require("../services/commission");
const { logEvent } = require("../lib/eventLogger");
const { requirePerm, getEffectivePermissions } = require("../lib/authSession");
const { hasCapability } = require("../../../../packages/shared/domain/permissions");
const { createSaleTransaction, fromCents } = require("../services/sales/createSaleTransaction");

function register(safeHandle, knex, authSession) {
  safeHandle("create-sale", async (event, saleData) => {
    const eff = await getEffectivePermissions(knex, event, authSession);
    if (!hasCapability(eff, "sales.create")) {
      return { success: false, error: "Voce nao tem permissao para esta acao." };
    }
    // Desconto e fiado são capabilities próprias dentro da venda.
    if (Number(saleData?.desconto_valor) > 0 && !hasCapability(eff, "sales.discount")) {
      return { success: false, error: "Voce nao tem permissao para aplicar desconto." };
    }
    if (
      Array.isArray(saleData?.pagamentos) &&
      saleData.pagamentos.some((p) => String(p?.metodo || "").toLowerCase() === "fiado") &&
      !hasCapability(eff, "sales.fiado")
    ) {
      return { success: false, error: "Voce nao tem permissao para vender no fiado." };
    }

    const trx = await knex.transaction();
    try {
      const { saleId, totalCents, totalPaidCents, itemCount } = await createSaleTransaction(
        trx,
        saleData,
      );
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
          itens: itemCount,
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
    const authError = await requirePerm(event, knex, authSession, "sales.cancel");
    if (authError) return authError;

    const trx = await knex.transaction();
    try {
      const venda = await trx("vendas").where("id", vendaId).first();
      if (!venda) {
        throw new Error("Venda nao encontrada.");
      }
      if (venda.cancelada === true || venda.cancelada === 1) {
        throw new Error("Venda ja cancelada.");
      }

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
    const authError = await requirePerm(event, knex, authSession, "commissions.pay");
    if (authError) return authError;

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
