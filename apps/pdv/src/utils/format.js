// =============================================================
// format.js — Funções de formatação centralizadas do SysControl
// =============================================================
import dayjs from "dayjs";

/**
 * Formata valor numérico como moeda brasileira (R$ 1.234,56)
 */
export const formatCurrency = (val) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(val || 0);

/**
 * Formata timestamp como data legível
 * @param {number|string|Date} ts - Timestamp ou data
 * @param {string} fmt - Formato dayjs (default: "DD/MM/YYYY HH:mm")
 */
export const formatDate = (ts, fmt = "DD/MM/YYYY HH:mm") =>
  dayjs(ts).format(fmt);

/**
 * Formata número com casas decimais fixas
 */
export const formatNumber = (val, decimals = 2) =>
  (val || 0).toFixed(decimals).replace(".", ",");

const CARGO_LABELS = { admin: "Admin", gerente: "Gerente", caixa: "Caixa", vendedor: "Vendedor" };

/**
 * Rótulo de acesso do usuário para a UI. Prioriza o nome do perfil custom;
 * senão usa o cargo interno; fallback "Usuário".
 * @param {{cargo?: string, perfilNome?: string}} user
 */
export const roleLabel = (user = {}) => {
  if (user.cargo === "admin") return "Admin";
  return user.perfilNome || CARGO_LABELS[user.cargo] || "Usuário";
};
