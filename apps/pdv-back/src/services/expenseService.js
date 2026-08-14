// =============================================================
// expenseService.js - Despesas da loja (CRUD + agregacoes).
// =============================================================
const { normalizeDateFilter } = require("./dateFilters");

const DEFAULT_CATEGORIES = [
  "Aluguel",
  "Fornecedores",
  "Contas",
  "Salarios",
  "Impostos",
  "Manutencao",
  "Marketing",
  "Outros",
];

function normalizeExpense(payload = {}) {
  const descricao = String(payload.descricao || "").trim();
  const valor = Number(payload.valor);
  if (!descricao) return { error: "Descricao obrigatoria." };
  if (!Number.isFinite(valor) || valor <= 0) return { error: "Valor invalido. Informe um valor maior que zero." };

  const categoria = String(payload.categoria || "Outros").trim() || "Outros";
  const data = normalizeDateFilter(payload.data_despesa ?? payload.data, "start");

  return {
    value: {
      descricao,
      categoria,
      valor,
      forma_pagamento: payload.forma_pagamento || null,
      recorrente: !!payload.recorrente,
      observacoes: payload.observacoes || null,
      data_despesa: data || new Date(),
    },
  };
}

async function listExpenses(knex, lojaId, filters = {}) {
  const page = filters.page ? parseInt(filters.page, 10) : null;
  const limit = filters.limit ? Math.min(parseInt(filters.limit, 10), 500) : null;
  const hasPagination = Number.isInteger(page) && Number.isInteger(limit) && page > 0 && limit > 0;
  const startDate = normalizeDateFilter(filters.startDate, "start");
  const endDate = normalizeDateFilter(filters.endDate, "end");

  const base = knex("despesas").where("despesas.loja_id", lojaId);
  if (startDate) base.where("data_despesa", ">=", startDate);
  if (endDate) base.where("data_despesa", "<=", endDate);
  if (filters.categoria) base.where("categoria", filters.categoria);

  const query = base
    .clone()
    .leftJoin("usuarios", function () {
      this.on("despesas.criado_por", "=", "usuarios.id").andOn("despesas.loja_id", "=", "usuarios.loja_id");
    })
    .select("despesas.*", "usuarios.nome as criado_por_nome")
    .orderBy("data_despesa", "desc");

  if (hasPagination) query.limit(limit).offset((page - 1) * limit);
  else if (filters.limit) query.limit(Number(filters.limit));

  const expenses = await query;
  const totalRow = await base.clone().sum("valor as total").count("id as qtd").first();
  const totals = { total: Number(totalRow?.total || 0), qtd: Number(totalRow?.qtd || 0) };

  if (!hasPagination) return { expenses, totals };

  const total = totals.qtd;
  return { expenses, totals, total, page, totalPages: Math.ceil(total / limit) };
}

async function createExpense(knex, lojaId, userId, payload = {}) {
  const normalized = normalizeExpense(payload);
  if (normalized.error) return { success: false, error: normalized.error };

  const [created] = await knex("despesas")
    .insert({ ...normalized.value, loja_id: lojaId, criado_por: userId || null })
    .returning(["id"]);
  return { success: true, id: created.id };
}

async function updateExpense(knex, lojaId, id, payload = {}) {
  const normalized = normalizeExpense(payload);
  if (normalized.error) return { success: false, error: normalized.error };

  const updated = await knex("despesas")
    .where({ id, loja_id: lojaId })
    .update({ ...normalized.value, updated_at: knex.fn.now() });
  if (!updated) return { success: false, error: "Despesa nao encontrada." };
  return { success: true, id };
}

async function deleteExpense(knex, lojaId, id) {
  const removed = await knex("despesas").where({ id, loja_id: lojaId }).del();
  if (!removed) return { success: false, error: "Despesa nao encontrada." };
  return { success: true };
}

// Total de despesas de uma loja no periodo (usado nos relatorios).
async function getExpensesTotal(knex, lojaId, filters = {}) {
  const startDate = normalizeDateFilter(filters.startDate, "start");
  const endDate = normalizeDateFilter(filters.endDate, "end");
  const query = knex("despesas").where("loja_id", lojaId);
  if (startDate) query.where("data_despesa", ">=", startDate);
  if (endDate) query.where("data_despesa", "<=", endDate);
  const row = await query.sum("valor as total").first();
  return Number(row?.total || 0);
}

// Total de despesas por loja (para o painel admin agregar resultado liquido).
async function getExpensesByStore(knex) {
  const rows = await knex("despesas").select("loja_id").sum("valor as total").groupBy("loja_id");
  const map = {};
  for (const r of rows) map[r.loja_id] = Number(r.total || 0);
  return map;
}

module.exports = {
  DEFAULT_CATEGORIES,
  listExpenses,
  createExpense,
  updateExpense,
  deleteExpense,
  getExpensesTotal,
  getExpensesByStore,
};
