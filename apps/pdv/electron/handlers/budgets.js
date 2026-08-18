const { logEvent } = require("../lib/eventLogger");
const { buildBudgetCode } = require("../services/budgets/buildBudgetCode");
const { normalizeBudgetTotals, fromCents } = require("../services/budgets/normalizeBudgetTotals");
const { createSaleTransaction } = require("../services/sales/createSaleTransaction");
const { requirePerm, requirePermAny, getDataScope, scopedSellerId } = require("../lib/authSession");

const OPEN_STATUS = "ABERTO";
const CONVERTED_STATUS = "CONVERTIDO";

async function validateBudgetActors(trx, budgetData) {
  const vendedorId = Number(budgetData?.vendedor_id);
  if (!Number.isInteger(vendedorId) || vendedorId <= 0) {
    throw new Error("Orcamento invalido: vendedor nao informado.");
  }

  const vendedor = await trx("pessoas").where({ id: vendedorId, ativo: true }).first();
  if (!vendedor) {
    throw new Error("Orcamento invalido: vendedor nao encontrado ou inativo.");
  }

  if (budgetData?.cliente_id) {
    const clienteId = Number(budgetData.cliente_id);
    const cliente = await trx("clientes").where({ id: clienteId, ativo: true }).first();
    if (!cliente) {
      throw new Error("Orcamento invalido: cliente nao encontrado ou inativo.");
    }
  }

  const laborCents = Math.round((Number(budgetData?.mao_de_obra) || 0) * 100);
  const trocadorId = budgetData?.trocador_id ? Number(budgetData.trocador_id) : null;
  if (laborCents > 0 && !trocadorId) {
    throw new Error("Orcamento invalido: responsavel pela mao de obra nao informado.");
  }

  if (trocadorId !== null) {
    if (!Number.isInteger(trocadorId) || trocadorId <= 0) {
      throw new Error("Orcamento invalido: responsavel pela mao de obra invalido.");
    }
    const trocador = await trx("pessoas").where({ id: trocadorId, ativo: true }).first();
    if (!trocador) {
      throw new Error("Orcamento invalido: responsavel pela mao de obra nao encontrado ou inativo.");
    }
  }

  return { vendedorId, trocadorId };
}

async function validateBudgetItems(trx, items = []) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("Orcamento invalido: nenhum item informado.");
  }

  const normalizedItems = [];
  for (const item of items) {
    const produtoId = Number(item?.id ?? item?.produto_id);
    const quantidade = Number(item?.qty ?? item?.quantidade);
    const precoUnitario = Number(item?.preco_venda ?? item?.preco_unitario);
    const custoUnitario = Number(item?.custo ?? item?.custo_unitario);

    if (!Number.isInteger(produtoId) || produtoId <= 0) {
      throw new Error("Item de orcamento invalido: produto nao informado.");
    }
    if (!Number.isInteger(quantidade) || quantidade <= 0) {
      throw new Error("Item de orcamento invalido: quantidade deve ser maior que zero.");
    }
    if (!Number.isFinite(precoUnitario) || precoUnitario < 0) {
      throw new Error("Item de orcamento invalido: preco unitario invalido.");
    }
    if (!Number.isFinite(custoUnitario) || custoUnitario < 0) {
      throw new Error("Item de orcamento invalido: custo unitario invalido.");
    }

    const produto = await trx("produtos").where("id", produtoId).first();
    if (!produto) {
      throw new Error(`Produto #${produtoId} nao encontrado.`);
    }
    if (produto.ativo === false || produto.ativo === 0) {
      throw new Error(`Produto #${produtoId} esta inativo.`);
    }

    normalizedItems.push({
      produto_id: produtoId,
      quantidade,
      preco_unitario: precoUnitario,
      custo_unitario: custoUnitario,
      codigo_snapshot: produto.codigo || null,
      descricao_snapshot: produto.descricao,
      tipo_snapshot: produto.tipo || null,
    });
  }

  return normalizedItems;
}

async function persistBudgetItems(trx, budgetId, normalizedItems) {
  await trx("orcamento_itens").where("orcamento_id", budgetId).del();
  await trx("orcamento_itens").insert(
    normalizedItems.map((item) => ({
      orcamento_id: budgetId,
      ...item,
    })),
  );
}

function register(safeHandle, knex, authSession) {
  safeHandle("create-budget", async (event, budgetData) => {
    const authError = await requirePerm(event, knex, authSession, "budgets.manage");
    if (authError) return authError;

    const trx = await knex.transaction();
    try {
      const { vendedorId, trocadorId } = await validateBudgetActors(trx, budgetData);
      const normalizedItems = await validateBudgetItems(trx, budgetData?.itens);
      const { subtotalCents, laborCents, surchargeCents, discountCents, totalCents } =
        normalizeBudgetTotals(budgetData);

      if (discountCents > subtotalCents) {
        throw new Error("Desconto invalido: maior que o subtotal das pecas.");
      }

      const now = Date.now();
      const codigo = await buildBudgetCode(trx, now);

      const [budgetId] = await trx("orcamentos").insert({
        cliente_id: budgetData?.cliente_id || null,
        vendedor_id: vendedorId,
        trocador_id: trocadorId,
        codigo,
        subtotal: fromCents(subtotalCents),
        mao_de_obra: fromCents(laborCents),
        acrescimo_valor: fromCents(surchargeCents),
        desconto_valor: fromCents(discountCents),
        desconto_tipo: budgetData?.desconto_tipo || "fixed",
        total_final: fromCents(totalCents),
        observacoes: budgetData?.observacoes || null,
        status: OPEN_STATUS,
        validade_em: budgetData?.validade_em || null,
        data_criacao: now,
        data_atualizacao: now,
      });

      await persistBudgetItems(trx, budgetId, normalizedItems);
      await trx.commit();

      await logEvent(knex, {
        event_category: "domain_action",
        event_type: "budget.created",
        entity_type: "orcamento",
        entity_id: budgetId,
        severity: "info",
        message: `Orcamento ${codigo} criado`,
        payload: { itens: normalizedItems.length, total_final: fromCents(totalCents) },
        source: "handler",
      });

      return { success: true, id: budgetId, codigo };
    } catch (error) {
      await trx.rollback();
      await logEvent(knex, {
        event_category: "error",
        event_type: "budget.create_failed",
        entity_type: "orcamento",
        severity: "error",
        message: error.message,
        source: "handler",
      });
      return { success: false, error: error.message };
    }
  });

  safeHandle("update-budget", async (event, budgetData) => {
    const authError = await requirePerm(event, knex, authSession, "budgets.manage");
    if (authError) return authError;

    const trx = await knex.transaction();
    try {
      const budgetId = Number(budgetData?.id);
      if (!Number.isInteger(budgetId) || budgetId <= 0) {
        throw new Error("Orcamento invalido: identificador ausente.");
      }

      const current = await trx("orcamentos").where("id", budgetId).first();
      if (!current) {
        throw new Error("Orcamento nao encontrado.");
      }
      if (current.status !== OPEN_STATUS) {
        throw new Error("Somente orcamentos em aberto podem ser editados.");
      }

      const { vendedorId, trocadorId } = await validateBudgetActors(trx, budgetData);
      const normalizedItems = await validateBudgetItems(trx, budgetData?.itens);
      const { subtotalCents, laborCents, surchargeCents, discountCents, totalCents } =
        normalizeBudgetTotals(budgetData);

      if (discountCents > subtotalCents) {
        throw new Error("Desconto invalido: maior que o subtotal das pecas.");
      }

      await trx("orcamentos").where("id", budgetId).update({
        cliente_id: budgetData?.cliente_id || null,
        vendedor_id: vendedorId,
        trocador_id: trocadorId,
        subtotal: fromCents(subtotalCents),
        mao_de_obra: fromCents(laborCents),
        acrescimo_valor: fromCents(surchargeCents),
        desconto_valor: fromCents(discountCents),
        desconto_tipo: budgetData?.desconto_tipo || "fixed",
        total_final: fromCents(totalCents),
        observacoes: budgetData?.observacoes || null,
        validade_em: budgetData?.validade_em || null,
        data_atualizacao: Date.now(),
      });

      await persistBudgetItems(trx, budgetId, normalizedItems);
      await trx.commit();

      return { success: true, id: budgetId };
    } catch (error) {
      await trx.rollback();
      return { success: false, error: error.message };
    }
  });

  safeHandle("get-budgets", async (event, filters = {}) => {
    // Escopo: usuário sem data.view_all vê só os próprios orçamentos.
    const scope = await getDataScope(knex, event, authSession);
    filters = { ...filters, sellerId: scopedSellerId(scope, filters.sellerId) };
    const page = filters.page ? parseInt(filters.page, 10) : null;
    const limit = filters.limit ? parseInt(filters.limit, 10) : null;
    const hasPagination = Number.isInteger(page) && Number.isInteger(limit) && page > 0 && limit > 0;
    const offset = hasPagination ? (page - 1) * limit : 0;

    const query = knex("orcamentos")
      .leftJoin("clientes", "orcamentos.cliente_id", "clientes.id")
      .leftJoin("pessoas as vendedor", "orcamentos.vendedor_id", "vendedor.id")
      .leftJoin("pessoas as trocador", "orcamentos.trocador_id", "trocador.id")
      .select(
        "orcamentos.*",
        "clientes.nome as cliente_nome",
        "clientes.documento as cliente_documento",
        "clientes.telefone as cliente_telefone",
        "vendedor.nome as vendedor_nome",
        "trocador.nome as trocador_nome",
      )
      .orderBy("orcamentos.data_criacao", "desc");

    const countQuery = knex("orcamentos");

    if (filters.startDate) {
      query.where("orcamentos.data_criacao", ">=", filters.startDate);
      countQuery.where("orcamentos.data_criacao", ">=", filters.startDate);
    }
    if (filters.endDate) {
      query.where("orcamentos.data_criacao", "<=", filters.endDate);
      countQuery.where("orcamentos.data_criacao", "<=", filters.endDate);
    }
    if (filters.status) {
      query.where("orcamentos.status", filters.status);
      countQuery.where("orcamentos.status", filters.status);
    }
    if (filters.clientId) {
      query.where("orcamentos.cliente_id", filters.clientId);
      countQuery.where("orcamentos.cliente_id", filters.clientId);
    }
    if (filters.sellerId) {
      query.where("orcamentos.vendedor_id", filters.sellerId);
      countQuery.where("orcamentos.vendedor_id", filters.sellerId);
    }

    if (hasPagination) {
      query.limit(limit).offset(offset);
    }

    const budgets = await query;
    const budgetIds = budgets.map((budget) => budget.id);
    const allItems = budgetIds.length
      ? await knex("orcamento_itens").whereIn("orcamento_id", budgetIds).select("*")
      : [];

    const processed = budgets.map((budget) => ({
      ...budget,
      itens: allItems.filter((item) => item.orcamento_id === budget.id),
    }));

    if (!hasPagination) return processed;

    const countResult = await countQuery.count("id as total").first();
    const total = Number(countResult?.total || 0);
    return {
      data: processed,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  });

  safeHandle("get-budget-by-id", async (event, id) => {
    const budgetId = Number(id);
    if (!Number.isInteger(budgetId) || budgetId <= 0) return null;

    const budget = await knex("orcamentos")
      .leftJoin("clientes", "orcamentos.cliente_id", "clientes.id")
      .leftJoin("pessoas as vendedor", "orcamentos.vendedor_id", "vendedor.id")
      .leftJoin("pessoas as trocador", "orcamentos.trocador_id", "trocador.id")
      .where("orcamentos.id", budgetId)
      .select(
        "orcamentos.*",
        "clientes.nome as cliente_nome",
        "clientes.documento as cliente_documento",
        "clientes.telefone as cliente_telefone",
        "vendedor.nome as vendedor_nome",
        "trocador.nome as trocador_nome",
      )
      .first();

    if (!budget) return null;
    const itens = await knex("orcamento_itens").where("orcamento_id", budgetId).select("*");
    return { ...budget, itens };
  });

  safeHandle("get-budget-items", async (event, id) => {
    return await knex("orcamento_itens").where("orcamento_id", id).select("*");
  });

  safeHandle("cancel-budget", async (event, id) => {
    const authError = await requirePerm(event, knex, authSession, "budgets.manage");
    if (authError) return authError;

    try {
      const budgetId = Number(id);
      const current = await knex("orcamentos").where("id", budgetId).first();
      if (!current) {
        throw new Error("Orcamento nao encontrado.");
      }
      if (current.status === CONVERTED_STATUS) {
        throw new Error("Orcamento convertido nao pode ser cancelado.");
      }
      if (current.status === "CANCELADO") {
        throw new Error("Orcamento ja cancelado.");
      }

      await knex("orcamentos").where("id", budgetId).update({
        status: "CANCELADO",
        data_atualizacao: Date.now(),
      });

      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  safeHandle("duplicate-budget", async (event, id) => {
    const authError = await requirePerm(event, knex, authSession, "budgets.manage");
    if (authError) return authError;

    const trx = await knex.transaction();
    try {
      const budgetId = Number(id);
      const source = await trx("orcamentos").where("id", budgetId).first();
      if (!source) {
        throw new Error("Orcamento nao encontrado.");
      }

      const items = await trx("orcamento_itens").where("orcamento_id", budgetId).select("*");
      const now = Date.now();
      const codigo = await buildBudgetCode(trx, now);

      const [newBudgetId] = await trx("orcamentos").insert({
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
        data_conversao: null,
        venda_id_gerada: null,
      });

      if (items.length > 0) {
        await trx("orcamento_itens").insert(
          items.map((item) => ({
            orcamento_id: newBudgetId,
            produto_id: item.produto_id,
            codigo_snapshot: item.codigo_snapshot,
            descricao_snapshot: item.descricao_snapshot,
            tipo_snapshot: item.tipo_snapshot,
            quantidade: item.quantidade,
            preco_unitario: item.preco_unitario,
            custo_unitario: item.custo_unitario,
          })),
        );
      }

      await trx.commit();
      return { success: true, id: newBudgetId, codigo };
    } catch (error) {
      await trx.rollback();
      return { success: false, error: error.message };
    }
  });

  safeHandle("convert-budget-to-sale", async (event, payload = {}) => {
    // Converter gera venda: exige gerir orçamentos ou criar vendas.
    const authError = await requirePermAny(event, knex, authSession, ["budgets.manage", "sales.create"]);
    if (authError) return authError;

    const trx = await knex.transaction();
    try {
      const budgetId = Number(payload?.budgetId ?? payload?.id);
      if (!Number.isInteger(budgetId) || budgetId <= 0) {
        throw new Error("Orcamento invalido: identificador ausente.");
      }

      const budget = await trx("orcamentos").where("id", budgetId).first();
      if (!budget) {
        throw new Error("Orcamento nao encontrado.");
      }
      if (budget.status !== OPEN_STATUS) {
        throw new Error("Somente orcamentos em aberto podem ser convertidos.");
      }

      const items = await trx("orcamento_itens").where("orcamento_id", budgetId).select("*");
      if (!items.length) {
        throw new Error("Orcamento invalido: nenhum item para converter.");
      }

      const saleData = {
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
      };

      const { saleId, totalCents, totalPaidCents, itemCount } = await createSaleTransaction(
        trx,
        saleData,
      );

      await trx("orcamentos").where("id", budgetId).update({
        status: CONVERTED_STATUS,
        data_conversao: Date.now(),
        data_atualizacao: Date.now(),
        venda_id_gerada: saleId,
      });

      await trx.commit();

      await logEvent(knex, {
        event_category: "domain_action",
        event_type: "sale.created",
        entity_type: "venda",
        entity_id: saleId,
        severity: "info",
        message: `Venda #${saleId} criada a partir do orcamento ${budget.codigo}`,
        payload: {
          budget_id: budgetId,
          total_final: fromCents(totalCents),
          itens: itemCount,
          total_pago: fromCents(totalPaidCents),
        },
        source: "handler",
      });
      await logEvent(knex, {
        event_category: "domain_action",
        event_type: "budget.converted",
        entity_type: "orcamento",
        entity_id: budgetId,
        severity: "info",
        message: `Orcamento ${budget.codigo} convertido em venda #${saleId}`,
        payload: { venda_id_gerada: saleId },
        source: "handler",
      });

      return { success: true, saleId };
    } catch (error) {
      await trx.rollback();
      await logEvent(knex, {
        event_category: "error",
        event_type: "budget.convert_failed",
        entity_type: "orcamento",
        entity_id: payload?.budgetId || payload?.id || null,
        severity: "error",
        message: error.message,
        source: "handler",
      });
      return { success: false, error: error.message };
    }
  });
}

module.exports = { register };
