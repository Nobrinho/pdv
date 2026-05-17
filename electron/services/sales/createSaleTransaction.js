const toCents = (value) => Math.round((Number(value) || 0) * 100);
const fromCents = (cents) => Number((cents / 100).toFixed(2));

const normalizeSaleTotals = (saleData) => {
  const subtotalCents = toCents(saleData.subtotal);
  const laborCents = toCents(saleData.mao_de_obra);
  const surchargeCents = toCents(saleData.acrescimo_valor);
  const discountCents = toCents(saleData.desconto_valor);

  const totalCents = Math.max(0, subtotalCents + laborCents + surchargeCents - discountCents);

  return {
    subtotalCents,
    laborCents,
    surchargeCents,
    discountCents,
    totalCents,
  };
};

async function createSaleTransaction(trx, saleData) {
  const vendedorId = Number(saleData?.vendedor_id);
  if (!Number.isInteger(vendedorId) || vendedorId <= 0) {
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
  if (laborCents > 0 && !saleData.trocador_id) {
    throw new Error("Venda invalida: responsavel pela mao de obra nao informado.");
  }

  const vendedor = await trx("pessoas").where({ id: vendedorId, ativo: true }).first();
  if (!vendedor) {
    throw new Error("Venda invalida: vendedor nao encontrado ou inativo.");
  }

  const trocadorId = saleData.trocador_id ? Number(saleData.trocador_id) : null;
  if (trocadorId !== null) {
    if (!Number.isInteger(trocadorId) || trocadorId <= 0) {
      throw new Error("Venda invalida: responsavel pela mao de obra invalido.");
    }
    const trocador = await trx("pessoas").where({ id: trocadorId, ativo: true }).first();
    if (!trocador) {
      throw new Error("Venda invalida: responsavel pela mao de obra nao encontrado ou inativo.");
    }
  }

  const paymentRows = saleData.pagamentos.map((payment) => ({
    metodo: payment?.metodo,
    valorCents: toCents(payment?.valor),
    detalhes: payment?.detalhes || "",
  }));

  if (paymentRows.some((payment) => !payment.metodo || payment.valorCents <= 0)) {
    throw new Error("Pagamento invalido: metodo ausente ou valor nao positivo.");
  }

  const totalPaidCents = paymentRows.reduce((acc, payment) => acc + payment.valorCents, 0);
  if (totalPaidCents < totalCents) {
    throw new Error("Pagamento invalido: valor pago menor que o total da venda.");
  }
  if (totalPaidCents > totalCents && !paymentRows.some((payment) => payment.metodo === "Dinheiro")) {
    throw new Error("Pagamento invalido: troco permitido apenas com Dinheiro.");
  }

  const formaPagamentoResumo = paymentRows.length > 1 ? "Multiplos" : paymentRows[0].metodo;

  const normalizedItems = [];
  for (const item of saleData.itens) {
    const produtoId = Number(item?.id);
    const quantidade = Number(item?.qty);
    const precoUnitario = Number(item?.preco_venda);
    const custoUnitario = Number(item?.custo);

    if (!Number.isInteger(produtoId) || produtoId <= 0) {
      throw new Error("Item invalido: produto nao informado.");
    }
    if (!Number.isInteger(quantidade) || quantidade <= 0) {
      throw new Error("Item invalido: quantidade deve ser maior que zero.");
    }
    if (!Number.isFinite(precoUnitario) || precoUnitario < 0) {
      throw new Error("Item invalido: preco de venda invalido.");
    }
    if (!Number.isFinite(custoUnitario) || custoUnitario < 0) {
      throw new Error("Item invalido: custo invalido.");
    }

    const produto = await trx("produtos").where("id", produtoId).first();
    if (!produto) throw new Error(`Produto #${produtoId} nao encontrado.`);
    if (produto.ativo === false || produto.ativo === 0) {
      throw new Error(`Produto #${produtoId} esta inativo.`);
    }
    if (produto.estoque_atual < quantidade) {
      throw new Error(
        `Estoque insuficiente: "${produto.descricao}" tem ${produto.estoque_atual} unidades, pedido: ${quantidade}`,
      );
    }

    normalizedItems.push({
      id: produtoId,
      qty: quantidade,
      preco_venda: precoUnitario,
      custo: custoUnitario,
    });
  }

  const [saleId] = await trx("vendas").insert({
    vendedor_id: vendedorId,
    trocador_id: trocadorId,
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

  const items = normalizedItems.map((item) => ({
    venda_id: saleId,
    produto_id: item.id,
    quantidade: item.qty,
    preco_unitario: item.preco_venda,
    custo_unitario: item.custo,
  }));

  await trx("venda_itens").insert(items);
  for (const item of items) {
    await trx("produtos").where("id", item.produto_id).decrement("estoque_atual", item.quantidade);
  }

  const pagamentos = paymentRows.map((payment) => ({
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
        cliente_id: saleData.cliente_id,
        venda_id: saleId,
        descricao: `Venda #${saleId}`,
        valor_total: payment.valor,
        valor_pago: 0,
        status: "PENDENTE",
        data_lancamento: Date.now(),
      });
    }
  }

  return {
    saleId,
    totalCents,
    totalPaidCents,
    itemCount: normalizedItems.length,
  };
}

module.exports = {
  createSaleTransaction,
  normalizeSaleTotals,
  toCents,
  fromCents,
};
