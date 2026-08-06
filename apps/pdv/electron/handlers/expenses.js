/**
 * Handlers de Despesas da loja (modo local SQLite).
 */
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

function register(safeHandle, knex) {
  const { logEvent } = require("../lib/eventLogger");

  safeHandle("get-expense-categories", async () => DEFAULT_CATEGORIES);

  safeHandle("get-expenses", async (event, filters = {}) => {
    const base = knex("despesas");
    if (filters.startDate) base.where("data_despesa", ">=", Number(filters.startDate));
    if (filters.endDate) base.where("data_despesa", "<=", Number(filters.endDate));
    if (filters.categoria) base.where("categoria", filters.categoria);

    const expenses = await base.clone().select("*").orderBy("data_despesa", "desc");
    const totalRow = await base.clone().sum("valor as total").count("id as qtd").first();

    return {
      success: true,
      expenses,
      totals: { total: Number(totalRow?.total || 0), qtd: Number(totalRow?.qtd || 0) },
    };
  });

  safeHandle("save-expense", async (event, data = {}) => {
    const descricao = String(data.descricao || "").trim();
    const valor = Number(data.valor);
    if (!descricao) return { success: false, error: "Descricao obrigatoria." };
    if (!Number.isFinite(valor) || valor <= 0) {
      return { success: false, error: "Valor invalido. Informe um valor maior que zero." };
    }

    let dataDespesa = Date.now();
    if (data.data_despesa) {
      const n = Number(data.data_despesa);
      dataDespesa = Number.isFinite(n) ? n : new Date(data.data_despesa).getTime() || Date.now();
    }

    const payload = {
      descricao,
      categoria: String(data.categoria || "Outros").trim() || "Outros",
      valor,
      data_despesa: dataDespesa,
      forma_pagamento: data.forma_pagamento || null,
      recorrente: data.recorrente ? 1 : 0,
      observacoes: data.observacoes || null,
    };

    if (data.id) {
      const updated = await knex("despesas").where("id", data.id).update(payload);
      if (!updated) return { success: false, error: "Despesa nao encontrada." };
      return { success: true, id: data.id };
    }

    const [id] = await knex("despesas").insert(payload);
    await logEvent(knex, {
      event_category: "domain_action",
      event_type: "expense.created",
      entity_type: "despesa",
      entity_id: id,
      severity: "info",
      message: `Despesa #${id} registrada`,
      payload: { valor, categoria: payload.categoria },
      source: "handler",
    });
    return { success: true, id };
  });

  safeHandle("delete-expense", async (event, id) => {
    const removed = await knex("despesas").where("id", id).del();
    if (!removed) return { success: false, error: "Despesa nao encontrada." };
    return { success: true };
  });
}

module.exports = { register };
