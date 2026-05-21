const { carregarTaxas, calcularComissaoVenda } = require("./commissionService");
const { logStoreEvent } = require("./eventLogService");

const toCents = (value) => Math.round((Number(value) || 0) * 100);
const fromCents = (cents) => Number((cents / 100).toFixed(2));

function normalizeDateFilter(value, boundary) {
  if (value === undefined || value === null || value === "") return null;

  const raw = String(value);
  const numeric = Number(raw);
  let date;

  if (Number.isFinite(numeric)) {
    date = new Date(numeric);
  } else if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    date = new Date(`${raw}T${boundary === "end" ? "23:59:59.999" : "00:00:00.000"}`);
  } else {
    date = new Date(raw);
  }

  if (Number.isNaN(date.getTime())) return null;

  if (boundary === "start") date.setHours(0, 0, 0, 0);
  if (boundary === "end") date.setHours(23, 59, 59, 999);
  return date;
}

function normalizeSaleTotals(saleData) {
  const subtotalCents = toCents(saleData.subtotal);
  const laborCents = toCents(saleData.mao_de_obra);
  const surchargeCents = toCents(saleData.acrescimo_valor ?? saleData.acrescimo);
  const discountCents = toCents(saleData.desconto_valor);
  const totalCents = Math.max(0, subtotalCents + laborCents + surchargeCents - discountCents);

  return { subtotalCents, laborCents, surchargeCents, discountCents, totalCents };
}

async function createSale(knex, lojaId, userId, saleData = {}) {
  return await knex.transaction(async (trx) => {
    const vendedorId = Number(saleData.vendedor_id);
    if (!Number.isInteger(vendedorId) || vendedorId <= 0) {
      return { success: false, error: "Venda invalida: vendedor nao informado." };
    }
    if (!Array.isArray(saleData.itens) || saleData.itens.length === 0) {
      return { success: false, error: "Venda invalida: nenhum item informado." };
    }
    if (!Array.isArray(saleData.pagamentos) || saleData.pagamentos.length === 0) {
      return { success: false, error: "Venda invalida: nenhum pagamento informado." };
    }

    const totals = normalizeSaleTotals(saleData);
    if (totals.discountCents > totals.subtotalCents) {
      return { success: false, error: "Desconto invalido: maior que o subtotal das pecas." };
    }
    if (totals.laborCents > 0 && !saleData.trocador_id) {
      return { success: false, error: "Venda invalida: responsavel pela mao de obra nao informado." };
    }

    const vendedor = await trx("pessoas").where({ id: vendedorId, loja_id: lojaId, ativo: true }).first();
    if (!vendedor) {
      return { success: false, error: "Venda invalida: vendedor nao encontrado ou inativo." };
    }

    const trocadorId = saleData.trocador_id ? Number(saleData.trocador_id) : null;
    if (trocadorId !== null) {
      if (!Number.isInteger(trocadorId) || trocadorId <= 0) {
        return { success: false, error: "Venda invalida: responsavel pela mao de obra invalido." };
      }
      const trocador = await trx("pessoas").where({ id: trocadorId, loja_id: lojaId, ativo: true }).first();
      if (!trocador) {
        return { success: false, error: "Venda invalida: responsavel pela mao de obra nao encontrado ou inativo." };
      }
    }

    if (saleData.cliente_id) {
      const cliente = await trx("clientes").where({ id: saleData.cliente_id, loja_id: lojaId, ativo: true }).first();
      if (!cliente) return { success: false, error: "Cliente nao encontrado ou inativo." };
    }

    const paymentRows = saleData.pagamentos.map((payment) => ({
      metodo: payment?.metodo,
      valorCents: toCents(payment?.valor),
      detalhes: payment?.detalhes || "",
    }));

    if (paymentRows.some((payment) => !payment.metodo || payment.valorCents <= 0)) {
      return { success: false, error: "Pagamento invalido: metodo ausente ou valor nao positivo." };
    }

    const totalPaidCents = paymentRows.reduce((acc, payment) => acc + payment.valorCents, 0);
    if (totalPaidCents < totals.totalCents) {
      return { success: false, error: "Pagamento invalido: valor pago menor que o total da venda." };
    }
    if (totalPaidCents > totals.totalCents && !paymentRows.some((payment) => payment.metodo === "Dinheiro")) {
      return { success: false, error: "Pagamento invalido: troco permitido apenas com Dinheiro." };
    }

    const normalizedItems = [];
    for (const item of saleData.itens) {
      const produtoId = Number(item?.id ?? item?.produto_id);
      const quantidade = Number(item?.qty ?? item?.quantidade);
      const precoUnitario = Number(item?.preco_venda ?? item?.preco_unitario);
      const custoUnitario = Number(item?.custo ?? item?.custo_unitario);

      if (!Number.isInteger(produtoId) || produtoId <= 0) {
        return { success: false, error: "Item invalido: produto nao informado." };
      }
      if (!Number.isInteger(quantidade) || quantidade <= 0) {
        return { success: false, error: "Item invalido: quantidade deve ser maior que zero." };
      }
      if (!Number.isFinite(precoUnitario) || precoUnitario < 0) {
        return { success: false, error: "Item invalido: preco de venda invalido." };
      }
      if (!Number.isFinite(custoUnitario) || custoUnitario < 0) {
        return { success: false, error: "Item invalido: custo invalido." };
      }

      const produto = await trx("produtos")
        .where({ id: produtoId, loja_id: lojaId })
        .forUpdate()
        .first();

      if (!produto) return { success: false, error: `Produto #${produtoId} nao encontrado.` };
      if (!produto.ativo) return { success: false, error: `Produto #${produtoId} esta inativo.` };
      if (Number(produto.estoque_atual) < quantidade) {
        return {
          success: false,
          error: `Estoque insuficiente: "${produto.descricao}" tem ${produto.estoque_atual} unidades, pedido: ${quantidade}`,
        };
      }

      normalizedItems.push({
        produto_id: produtoId,
        quantidade,
        preco_unitario: precoUnitario,
        custo_unitario: custoUnitario,
      });
    }

    const formaPagamentoResumo = paymentRows.length > 1 ? "Multiplos" : paymentRows[0].metodo;
    const [sale] = await trx("vendas")
      .insert({
        loja_id: lojaId,
        vendedor_id: vendedorId,
        trocador_id: trocadorId,
        cliente_id: saleData.cliente_id || null,
        subtotal: fromCents(totals.subtotalCents),
        mao_de_obra: fromCents(totals.laborCents),
        acrescimo: fromCents(totals.surchargeCents),
        desconto_valor: fromCents(totals.discountCents),
        desconto_tipo: saleData.desconto_tipo || "fixed",
        total_final: fromCents(totals.totalCents),
        forma_pagamento: formaPagamentoResumo,
        data_venda: trx.fn.now(),
      })
      .returning(["id"]);

    const saleId = sale.id;
    await trx("venda_itens").insert(
      normalizedItems.map((item) => ({
        loja_id: lojaId,
        venda_id: saleId,
        ...item,
      })),
    );

    for (const item of normalizedItems) {
      await trx("produtos")
        .where({ id: item.produto_id, loja_id: lojaId })
        .decrement("estoque_atual", item.quantidade);
    }

    const pagamentos = paymentRows.map((payment) => ({
      loja_id: lojaId,
      venda_id: saleId,
      metodo: payment.metodo,
      valor: fromCents(payment.valorCents),
      detalhes: payment.detalhes,
    }));
    await trx("venda_pagamentos").insert(pagamentos);

    for (const payment of pagamentos) {
      if (payment.metodo === "Fiado") {
        if (!saleData.cliente_id) {
          throw new Error("Venda Fiado exige um cliente selecionado.");
        }
        await trx("contas_receber").insert({
          loja_id: lojaId,
          cliente_id: saleData.cliente_id,
          venda_id: saleId,
          descricao: `Venda #${saleId}`,
          valor_total: payment.valor,
          valor_pago: 0,
          status: "PENDENTE",
          data_lancamento: trx.fn.now(),
        });
      }
    }

    await logStoreEvent(trx, lojaId, {
      event_type: "sale.created",
      entity_type: "venda",
      entity_id: saleId,
      user_id: userId,
      message: `Venda #${saleId} criada`,
      payload: {
        total_final: fromCents(totals.totalCents),
        itens: normalizedItems.length,
        total_pago: fromCents(totalPaidCents),
      },
    });

    return { success: true, id: saleId };
  });
}

async function listSales(knex, lojaId, filters = {}) {
  const page = filters.page ? Number(filters.page) : null;
  const limit = filters.limit ? Number(filters.limit) : null;
  const hasPagination = Number.isInteger(page) && Number.isInteger(limit) && page > 0 && limit > 0;
  const startDate = normalizeDateFilter(filters.startDate, "start");
  const endDate = normalizeDateFilter(filters.endDate, "end");

  const query = knex("vendas")
    .leftJoin("pessoas as vendedor", function () {
      this.on("vendas.vendedor_id", "=", "vendedor.id").andOn("vendas.loja_id", "=", "vendedor.loja_id");
    })
    .leftJoin("pessoas as trocador", function () {
      this.on("vendas.trocador_id", "=", "trocador.id").andOn("vendas.loja_id", "=", "trocador.loja_id");
    })
    .leftJoin("clientes", function () {
      this.on("vendas.cliente_id", "=", "clientes.id").andOn("vendas.loja_id", "=", "clientes.loja_id");
    })
    .where("vendas.loja_id", lojaId)
    .select(
      "vendas.*",
      "vendedor.nome as vendedor_nome",
      "trocador.nome as trocador_nome",
      "vendedor.comissao_fixa",
      "clientes.documento as cliente_documento",
      "clientes.telefone as cliente_telefone",
      "clientes.nome as cliente_nome",
    )
    .orderBy("vendas.data_venda", "desc");

  const countQuery = knex("vendas").where("loja_id", lojaId);

  if (startDate) {
    query.where("vendas.data_venda", ">=", startDate);
    countQuery.where("data_venda", ">=", startDate);
  }
  if (endDate) {
    query.where("vendas.data_venda", "<=", endDate);
    countQuery.where("data_venda", "<=", endDate);
  }
  if (filters.sellerId) {
    query.where("vendas.vendedor_id", filters.sellerId);
    countQuery.where("vendedor_id", filters.sellerId);
  }
  if (filters.clientId) {
    query.where("vendas.cliente_id", filters.clientId);
    countQuery.where("cliente_id", filters.clientId);
  }

  if (hasPagination) query.limit(limit).offset((page - 1) * limit);
  else if (filters.limit) query.limit(Number(filters.limit));

  const vendas = await query;
  const vendaIds = vendas.map((venda) => venda.id);

  const allItems = vendaIds.length
    ? await knex("venda_itens")
        .leftJoin("produtos", function () {
          this.on("venda_itens.produto_id", "=", "produtos.id").andOn(
            "venda_itens.loja_id",
            "=",
            "produtos.loja_id",
          );
        })
        .where("venda_itens.loja_id", lojaId)
        .whereIn("venda_id", vendaIds)
        .select("venda_itens.*", "produtos.tipo", "produtos.descricao")
    : [];

  const allPayments = vendaIds.length
    ? await knex("venda_pagamentos").where("loja_id", lojaId).whereIn("venda_id", vendaIds).select("*")
    : [];

  const { comissaoPadrao, comissaoUsados } = await carregarTaxas(knex, lojaId);
  const data = vendas.map((venda) => {
    const itens = allItems.filter((item) => item.venda_id === venda.id);
    const pagamentos = allPayments.filter((payment) => payment.venda_id === venda.id);
    const custoTotal = itens.reduce(
      (acc, item) => acc + Number(item.custo_unitario) * Number(item.quantidade),
      0,
    );
    const taxaNovos = venda.comissao_fixa ? Number(venda.comissao_fixa) / 100 : comissaoPadrao;
    return {
      ...venda,
      custo_total_real: custoTotal,
      comissao_real: calcularComissaoVenda(itens, venda, taxaNovos, comissaoUsados),
      lista_pagamentos: pagamentos,
      itens,
    };
  });

  if (!hasPagination) return data;

  const countResult = await countQuery.count("id as total").first();
  const total = Number(countResult?.total || 0);
  return { data, total, page, totalPages: Math.ceil(total / limit) };
}

async function getSaleItems(knex, lojaId, id) {
  return await knex("venda_itens")
    .leftJoin("produtos", function () {
      this.on("venda_itens.produto_id", "=", "produtos.id").andOn(
        "venda_itens.loja_id",
        "=",
        "produtos.loja_id",
      );
    })
    .where({ "venda_itens.loja_id": lojaId, venda_id: id })
    .select("venda_itens.*", "produtos.descricao", "produtos.codigo");
}

async function cancelSale(knex, lojaId, userId, data = {}) {
  const vendaId = Number(data.vendaId ?? data.venda_id);
  return await knex.transaction(async (trx) => {
    const venda = await trx("vendas").where({ id: vendaId, loja_id: lojaId }).forUpdate().first();
    if (!venda) return { success: false, error: "Venda nao encontrada." };
    if (venda.cancelada) return { success: false, error: "Venda ja cancelada." };

    const itens = await trx("venda_itens").where({ loja_id: lojaId, venda_id: vendaId });
    for (const item of itens) {
      await trx("produtos")
        .where({ id: item.produto_id, loja_id: lojaId })
        .increment("estoque_atual", item.quantidade);
    }

    await trx("vendas").where({ id: vendaId, loja_id: lojaId }).update({
      cancelada: true,
      motivo_cancelamento: data.motivo || null,
      data_cancelamento: Date.now(),
      updated_at: trx.fn.now(),
    });

    await trx("contas_receber")
      .where({ loja_id: lojaId, venda_id: vendaId })
      .update({ status: "CANCELADO", updated_at: trx.fn.now() });

    await logStoreEvent(trx, lojaId, {
      event_type: "sale.canceled",
      entity_type: "venda",
      entity_id: vendaId,
      user_id: userId,
      severity: "warning",
      message: `Venda #${vendaId} cancelada`,
      payload: { motivo: data.motivo || null },
    });

    return { success: true };
  });
}

async function payCommissions(knex, lojaId, vendaIds = []) {
  if (!Array.isArray(vendaIds) || vendaIds.length === 0) return { success: true };
  await knex("vendas").where("loja_id", lojaId).whereIn("id", vendaIds).update({
    comissao_paga: true,
    data_pagamento_comissao: Date.now(),
    updated_at: knex.fn.now(),
  });
  return { success: true };
}

module.exports = { createSale, listSales, getSaleItems, cancelSale, payCommissions };
