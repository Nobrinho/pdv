const { createSale } = require("./salesService");

const OPEN_STATUS = "ABERTO";
const CONVERTED_STATUS = "CONVERTIDO";
const CANCELLED_STATUS = "CANCELADO";

function toCents(value) {
  return Math.round((Number(value) || 0) * 100);
}

function fromCents(value) {
  return Number((value / 100).toFixed(2));
}

function normalizeTotals(budget = {}) {
  const items = Array.isArray(budget.itens) ? budget.itens : [];
  const subtotalCents = items.reduce((sum, item) => {
    const qty = Number(item.qty ?? item.quantidade) || 0;
    const price = Number(item.preco_venda ?? item.preco_unitario) || 0;
    return sum + Math.round(qty * price * 100);
  }, 0);
  const laborCents = toCents(budget.mao_de_obra);
  const surchargeCents = toCents(budget.acrescimo_valor ?? budget.acrescimo);
  const discountCents = toCents(budget.desconto_valor);
  const totalCents = subtotalCents + laborCents + surchargeCents - discountCents;
  return { subtotalCents, laborCents, surchargeCents, discountCents, totalCents };
}

async function buildBudgetCode(knex, lojaId, now = Date.now()) {
  const date = new Date(now);
  const stamp = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("");
  const prefix = `ORC-${stamp}-`;
  const row = await knex("orcamentos")
    .where("loja_id", lojaId)
    .where("codigo", "like", `${prefix}%`)
    .count("id as total")
    .first();
  return `${prefix}${String(Number(row?.total || 0) + 1).padStart(3, "0")}`;
}

async function validateActors(trx, lojaId, budget = {}) {
  const vendedorId = Number(budget.vendedor_id);
  if (!Number.isInteger(vendedorId) || vendedorId <= 0) {
    throw new Error("Orcamento invalido: vendedor nao informado.");
  }
  const vendedor = await trx("pessoas").where({ id: vendedorId, loja_id: lojaId, ativo: true }).first();
  if (!vendedor) throw new Error("Orcamento invalido: vendedor nao encontrado ou inativo.");

  const clienteId = budget.cliente_id ? Number(budget.cliente_id) : null;
  if (clienteId) {
    const cliente = await trx("clientes").where({ id: clienteId, loja_id: lojaId, ativo: true }).first();
    if (!cliente) throw new Error("Orcamento invalido: cliente nao encontrado ou inativo.");
  }

  const trocadorId = budget.trocador_id ? Number(budget.trocador_id) : null;
  if (toCents(budget.mao_de_obra) > 0 && !trocadorId) {
    throw new Error("Orcamento invalido: responsavel pela mao de obra nao informado.");
  }
  if (trocadorId) {
    const trocador = await trx("pessoas").where({ id: trocadorId, loja_id: lojaId, ativo: true }).first();
    if (!trocador) throw new Error("Orcamento invalido: responsavel pela mao de obra nao encontrado ou inativo.");
  }

  return { vendedorId, clienteId, trocadorId };
}

async function validateItems(trx, lojaId, items = []) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("Orcamento invalido: nenhum item informado.");
  }

  const normalized = [];
  for (const item of items) {
    const produtoId = Number(item.id ?? item.produto_id);
    const quantidade = Number(item.qty ?? item.quantidade);
    const precoUnitario = Number(item.preco_venda ?? item.preco_unitario);
    const custoUnitario = Number(item.custo ?? item.custo_unitario);

    if (!Number.isInteger(produtoId) || produtoId <= 0) throw new Error("Item de orcamento invalido: produto nao informado.");
    if (!Number.isInteger(quantidade) || quantidade <= 0) throw new Error("Item de orcamento invalido: quantidade deve ser maior que zero.");
    if (!Number.isFinite(precoUnitario) || precoUnitario < 0) throw new Error("Item de orcamento invalido: preco unitario invalido.");
    if (!Number.isFinite(custoUnitario) || custoUnitario < 0) throw new Error("Item de orcamento invalido: custo unitario invalido.");

    const produto = await trx("produtos").where({ id: produtoId, loja_id: lojaId }).first();
    if (!produto) throw new Error(`Produto #${produtoId} nao encontrado.`);
    if (!produto.ativo) throw new Error(`Produto #${produtoId} esta inativo.`);

    normalized.push({
      loja_id: lojaId,
      produto_id: produtoId,
      codigo_snapshot: produto.codigo || null,
      descricao_snapshot: produto.descricao,
      tipo_snapshot: produto.tipo || null,
      quantidade,
      preco_unitario: precoUnitario,
      custo_unitario: custoUnitario,
    });
  }
  return normalized;
}

async function persistItems(trx, lojaId, budgetId, items) {
  await trx("orcamento_itens").where({ loja_id: lojaId, orcamento_id: budgetId }).del();
  await trx("orcamento_itens").insert(items.map((item) => ({ ...item, orcamento_id: budgetId })));
}

async function createBudget(knex, lojaId, budget = {}) {
  return await knex.transaction(async (trx) => {
    const { vendedorId, clienteId, trocadorId } = await validateActors(trx, lojaId, budget);
    const items = await validateItems(trx, lojaId, budget.itens);
    const { subtotalCents, laborCents, surchargeCents, discountCents, totalCents } = normalizeTotals(budget);
    if (discountCents > subtotalCents) throw new Error("Desconto invalido: maior que o subtotal das pecas.");

    const now = Date.now();
    const codigo = await buildBudgetCode(trx, lojaId, now);
    const [created] = await trx("orcamentos")
      .insert({
        loja_id: lojaId,
        cliente_id: clienteId,
        vendedor_id: vendedorId,
        trocador_id: trocadorId,
        codigo,
        subtotal: fromCents(subtotalCents),
        mao_de_obra: fromCents(laborCents),
        acrescimo_valor: fromCents(surchargeCents),
        desconto_valor: fromCents(discountCents),
        desconto_tipo: budget.desconto_tipo || "fixed",
        total_final: fromCents(totalCents),
        observacoes: budget.observacoes || null,
        status: OPEN_STATUS,
        validade_em: budget.validade_em || null,
        data_criacao: now,
        data_atualizacao: now,
      })
      .returning(["id"]);

    await persistItems(trx, lojaId, created.id, items);
    return { success: true, id: created.id, codigo };
  }).catch((error) => ({ success: false, error: error.message }));
}

async function updateBudget(knex, lojaId, budget = {}) {
  return await knex.transaction(async (trx) => {
    const budgetId = Number(budget.id);
    const current = await trx("orcamentos").where({ id: budgetId, loja_id: lojaId }).first();
    if (!current) throw new Error("Orcamento nao encontrado.");
    if (current.status !== OPEN_STATUS) throw new Error("Somente orcamentos em aberto podem ser editados.");

    const { vendedorId, clienteId, trocadorId } = await validateActors(trx, lojaId, budget);
    const items = await validateItems(trx, lojaId, budget.itens);
    const { subtotalCents, laborCents, surchargeCents, discountCents, totalCents } = normalizeTotals(budget);
    if (discountCents > subtotalCents) throw new Error("Desconto invalido: maior que o subtotal das pecas.");

    await trx("orcamentos").where({ id: budgetId, loja_id: lojaId }).update({
      cliente_id: clienteId,
      vendedor_id: vendedorId,
      trocador_id: trocadorId,
      subtotal: fromCents(subtotalCents),
      mao_de_obra: fromCents(laborCents),
      acrescimo_valor: fromCents(surchargeCents),
      desconto_valor: fromCents(discountCents),
      desconto_tipo: budget.desconto_tipo || "fixed",
      total_final: fromCents(totalCents),
      observacoes: budget.observacoes || null,
      validade_em: budget.validade_em || null,
      data_atualizacao: Date.now(),
      updated_at: trx.fn.now(),
    });
    await persistItems(trx, lojaId, budgetId, items);
    return { success: true, id: budgetId };
  }).catch((error) => ({ success: false, error: error.message }));
}

function applyBudgetFilters(query, filters = {}) {
  if (filters.startDate) query.where("orcamentos.data_criacao", ">=", Number(filters.startDate));
  if (filters.endDate) query.where("orcamentos.data_criacao", "<=", Number(filters.endDate));
  if (filters.status) query.where("orcamentos.status", filters.status);
  if (filters.clientId) query.where("orcamentos.cliente_id", Number(filters.clientId));
  if (filters.sellerId) query.where("orcamentos.vendedor_id", Number(filters.sellerId));
}

async function listBudgets(knex, lojaId, filters = {}) {
  const page = filters.page ? parseInt(filters.page, 10) : null;
  const limit = filters.limit ? Math.min(parseInt(filters.limit, 10), 500) : null;
  const hasPagination = Number.isInteger(page) && Number.isInteger(limit) && page > 0 && limit > 0;

  const query = knex("orcamentos")
    .leftJoin("clientes", function () {
      this.on("orcamentos.cliente_id", "=", "clientes.id").andOn("orcamentos.loja_id", "=", "clientes.loja_id");
    })
    .leftJoin("pessoas as vendedor", function () {
      this.on("orcamentos.vendedor_id", "=", "vendedor.id").andOn("orcamentos.loja_id", "=", "vendedor.loja_id");
    })
    .leftJoin("pessoas as trocador", function () {
      this.on("orcamentos.trocador_id", "=", "trocador.id").andOn("orcamentos.loja_id", "=", "trocador.loja_id");
    })
    .where("orcamentos.loja_id", lojaId)
    .select(
      "orcamentos.*",
      "clientes.nome as cliente_nome",
      "clientes.documento as cliente_documento",
      "clientes.telefone as cliente_telefone",
      "vendedor.nome as vendedor_nome",
      "trocador.nome as trocador_nome",
    )
    .orderBy("orcamentos.data_criacao", "desc");

  const countQuery = knex("orcamentos").where("loja_id", lojaId);
  applyBudgetFilters(query, filters);
  applyBudgetFilters(countQuery, filters);
  if (hasPagination) query.limit(limit).offset((page - 1) * limit);

  const budgets = await query;
  const budgetIds = budgets.map((budget) => budget.id);
  const allItems = budgetIds.length
    ? await knex("orcamento_itens").where("loja_id", lojaId).whereIn("orcamento_id", budgetIds).select("*")
    : [];
  const data = budgets.map((budget) => ({
    ...budget,
    itens: allItems.filter((item) => item.orcamento_id === budget.id),
  }));
  if (!hasPagination) return data;

  const countResult = await countQuery.count("id as total").first();
  const total = Number(countResult?.total || 0);
  return { data, total, page, totalPages: Math.ceil(total / limit) };
}

async function getBudgetById(knex, lojaId, id) {
  const result = await listBudgets(knex, lojaId, { id });
  return result.find((budget) => budget.id === Number(id)) || null;
}

async function getBudgetItems(knex, lojaId, id) {
  return await knex("orcamento_itens").where({ loja_id: lojaId, orcamento_id: Number(id) }).select("*");
}

async function cancelBudget(knex, lojaId, id) {
  const budget = await knex("orcamentos").where({ id: Number(id), loja_id: lojaId }).first();
  if (!budget) return { success: false, error: "Orcamento nao encontrado." };
  if (budget.status === CONVERTED_STATUS) return { success: false, error: "Orcamento convertido nao pode ser cancelado." };
  if (budget.status === CANCELLED_STATUS) return { success: false, error: "Orcamento ja cancelado." };
  await knex("orcamentos").where({ id: Number(id), loja_id: lojaId }).update({
    status: CANCELLED_STATUS,
    data_atualizacao: Date.now(),
    updated_at: knex.fn.now(),
  });
  return { success: true };
}

async function duplicateBudget(knex, lojaId, id) {
  return await knex.transaction(async (trx) => {
    const source = await trx("orcamentos").where({ id: Number(id), loja_id: lojaId }).first();
    if (!source) throw new Error("Orcamento nao encontrado.");
    const items = await trx("orcamento_itens").where({ loja_id: lojaId, orcamento_id: source.id }).select("*");
    const now = Date.now();
    const codigo = await buildBudgetCode(trx, lojaId, now);
    const [created] = await trx("orcamentos")
      .insert({
        loja_id: lojaId,
        cliente_id: source.cliente_id,
        vendedor_id: source.vendedor_id,
        trocador_id: source.trocador_id,
        codigo,
        subtotal: source.subtotal,
        mao_de_obra: source.mao_de_obra,
        acrescimo_valor: source.acrescimo_valor,
        desconto_valor: source.desconto_valor,
        desconto_tipo: source.desconto_tipo,
        total_final: source.total_final,
        observacoes: source.observacoes,
        status: OPEN_STATUS,
        validade_em: source.validade_em,
        data_criacao: now,
        data_atualizacao: now,
      })
      .returning(["id"]);
    if (items.length) {
      await trx("orcamento_itens").insert(
        items.map(({ id: _id, created_at, updated_at, ...item }) => ({
          ...item,
          orcamento_id: created.id,
        })),
      );
    }
    return { success: true, id: created.id, codigo };
  }).catch((error) => ({ success: false, error: error.message }));
}

async function convertBudget(knex, lojaId, userId, payload = {}) {
  const budgetId = Number(payload.budgetId ?? payload.id);
  const budget = await knex("orcamentos").where({ id: budgetId, loja_id: lojaId }).first();
  if (!budget) return { success: false, error: "Orcamento nao encontrado." };
  if (budget.status !== OPEN_STATUS) return { success: false, error: "Somente orcamentos em aberto podem ser convertidos." };
  const items = await getBudgetItems(knex, lojaId, budgetId);
  if (!items.length) return { success: false, error: "Orcamento invalido: nenhum item para converter." };

  const saleResult = await createSale(knex, lojaId, userId, {
    vendedor_id: budget.vendedor_id,
    trocador_id: budget.trocador_id,
    cliente_id: budget.cliente_id,
    subtotal: Number(budget.subtotal || 0),
    mao_de_obra: Number(budget.mao_de_obra || 0),
    acrescimo_valor: Number(budget.acrescimo_valor || 0),
    desconto_valor: Number(budget.desconto_valor || 0),
    desconto_tipo: budget.desconto_tipo || "fixed",
    total_final: Number(budget.total_final || 0),
    pagamentos: Array.isArray(payload.pagamentos) ? payload.pagamentos : [],
    itens: items.map((item) => ({
      id: item.produto_id,
      qty: Number(item.quantidade || 0),
      preco_venda: Number(item.preco_unitario || 0),
      custo: Number(item.custo_unitario || 0),
    })),
  });
  if (!saleResult.success) return saleResult;

  await knex("orcamentos").where({ id: budgetId, loja_id: lojaId }).update({
    status: CONVERTED_STATUS,
    data_conversao: Date.now(),
    data_atualizacao: Date.now(),
    venda_id_gerada: saleResult.id,
    updated_at: knex.fn.now(),
  });
  return { success: true, saleId: saleResult.id };
}

module.exports = {
  createBudget,
  updateBudget,
  listBudgets,
  getBudgetById,
  getBudgetItems,
  cancelBudget,
  duplicateBudget,
  convertBudget,
};
