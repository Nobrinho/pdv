// =============================================================
// Controle de acesso granular — catálogo de permissões (capabilities),
// presets por cargo e cálculo das permissões efetivas de um usuário.
//
// Versão CommonJS (Node/Electron). Deve ser mantida idêntica ao par ESM
// permissions.mjs (consumido pelo frontend Vite).
// =============================================================

// Capability = "recurso.ação". Agrupadas por módulo para a UI (matriz).
const PERMISSION_MODULES = [
  {
    key: "sales",
    label: "Vendas",
    caps: [
      { key: "sales.view", label: "Ver vendas" },
      { key: "sales.create", label: "Registrar venda" },
      { key: "sales.cancel", label: "Cancelar venda" },
      { key: "sales.discount", label: "Dar desconto / acréscimo" },
      { key: "sales.fiado", label: "Vender no fiado" },
    ],
  },
  {
    key: "products",
    label: "Produtos",
    caps: [
      { key: "products.view", label: "Ver produtos" },
      { key: "products.create", label: "Cadastrar produto" },
      { key: "products.edit", label: "Editar produto" },
      { key: "products.delete", label: "Excluir produto" },
      { key: "products.stock_entry", label: "Dar entrada de estoque" },
      { key: "products.import", label: "Importar em lote" },
    ],
  },
  {
    key: "clients",
    label: "Clientes",
    caps: [
      { key: "clients.view", label: "Ver clientes" },
      { key: "clients.edit", label: "Cadastrar / editar cliente" },
      { key: "clients.payment", label: "Registrar pagamento (fiado)" },
    ],
  },
  {
    key: "services",
    label: "Serviços e orçamentos",
    caps: [
      { key: "services.view", label: "Ver serviços" },
      { key: "services.manage", label: "Registrar serviço" },
      { key: "budgets.view", label: "Ver orçamentos" },
      { key: "budgets.manage", label: "Criar / editar orçamento" },
    ],
  },
  {
    key: "receipts",
    label: "Recibos",
    caps: [
      { key: "receipts.view", label: "Ver histórico de recibos" },
      { key: "receipts.reprint", label: "Reimprimir / compartilhar" },
    ],
  },
  {
    key: "reports",
    label: "Relatórios",
    caps: [{ key: "reports.view", label: "Ver relatórios" }],
  },
  {
    key: "expenses",
    label: "Despesas",
    caps: [
      { key: "expenses.view", label: "Ver despesas" },
      { key: "expenses.manage", label: "Lançar / editar despesa" },
    ],
  },
  {
    key: "commissions",
    label: "Comissões",
    caps: [
      { key: "commissions.view", label: "Ver comissões" },
      { key: "commissions.pay", label: "Dar baixa em comissão" },
    ],
  },
  {
    key: "prices",
    label: "Auditoria de preços",
    caps: [{ key: "prices.audit.view", label: "Ver histórico de preços" }],
  },
  {
    key: "visibility",
    label: "Visibilidade de dados",
    caps: [{ key: "data.view_all", label: "Ver dados de todos os usuários (não só os próprios)" }],
  },
  {
    key: "config",
    label: "Configurações e equipe",
    caps: [
      { key: "config.users", label: "Gerenciar usuários" },
      { key: "config.roles", label: "Gerenciar cargos e permissões" },
      { key: "config.identity", label: "Editar identidade da loja" },
      { key: "config.commissions", label: "Editar taxas de comissão" },
      { key: "backup.run", label: "Backup e restauração" },
      { key: "system.migrate", label: "Migrar dados (destrutivo)" },
    ],
  },
];

const ALL_CAPABILITIES = PERMISSION_MODULES.flatMap((m) => m.caps.map((c) => c.key));

const capsFor = (...keys) => keys;

const ROLE_PRESETS = {
  admin: [...ALL_CAPABILITIES],
  gerente: ALL_CAPABILITIES.filter((c) => c !== "system.migrate"),
  caixa: capsFor(
    "sales.view", "sales.create", "sales.discount", "sales.fiado",
    "products.view", "products.stock_entry",
    "clients.view", "clients.edit", "clients.payment",
    "services.view", "services.manage", "budgets.view", "budgets.manage",
    "receipts.view", "receipts.reprint",
  ),
  vendedor: capsFor(
    "sales.view", "sales.create",
    "products.view",
    "clients.view", "clients.edit",
    "receipts.view",
    "budgets.view", "budgets.manage",
  ),
};

/**
 * Permissões efetivas: base(cargo|roleTemplate) ∪ grants − denies.
 * `admin` sempre recebe tudo.
 */
function computeEffectivePermissions(input = {}) {
  const cargo = String(input.cargo || "").toLowerCase();
  if (cargo === "admin") return [...ALL_CAPABILITIES];

  const base = Array.isArray(input.roleTemplate) ? input.roleTemplate : ROLE_PRESETS[cargo] || [];
  const overrides = input.overrides || {};
  const grants = Array.isArray(overrides.grants) ? overrides.grants : [];
  const denies = new Set(Array.isArray(overrides.denies) ? overrides.denies : []);

  const set = new Set([...base, ...grants]);
  for (const d of denies) set.delete(d);
  return ALL_CAPABILITIES.filter((c) => set.has(c));
}

function hasCapability(effective, capability) {
  if (!capability) return true;
  if (effective instanceof Set) return effective.has(capability);
  return Array.isArray(effective) && effective.includes(capability);
}

const ROUTE_CAPABILITY = {
  "/": null,
  "/vendas": "sales.view",
  "/produtos": "products.view",
  "/servicos": "services.view",
  "/recibos": "receipts.view",
  "/orcamentos": "budgets.view",
  "/clientes": "clients.view",
  "/comissoes": "commissions.view",
  "/relatorios": "reports.view",
  "/despesas": "expenses.view",
  "/historico": "prices.audit.view",
  "/pessoas": "config.users",
  "/config": "config.identity",
};

const STORE_ROLES = ["admin", "gerente", "caixa", "vendedor"];

module.exports = {
  PERMISSION_MODULES,
  ALL_CAPABILITIES,
  ROLE_PRESETS,
  computeEffectivePermissions,
  hasCapability,
  ROUTE_CAPABILITY,
  STORE_ROLES,
};
