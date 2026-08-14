// =============================================================
// api.js - Camada unica de acesso a dados
// =============================================================
// Electron: usa window.api/IPC e o SQLite local atual.
// Web/dev sem Electron: usa a API HTTP em apps/pdv-back.
// =============================================================

const ONLINE_TOKEN_KEY = "syscontrol_online_token";
const ONLINE_STORE_ID_KEY = "syscontrol_online_loja_id";
const ONLINE_USER_KEY = "syscontrol_online_user";
const DATA_MODE_KEY = "syscontrol_data_mode";

const hasElectronApi = () => typeof window !== "undefined" && !!window.api;
const getBaseUrl = () =>
  import.meta.env.VITE_API_URL ||
  localStorage.getItem("syscontrol_api_url") ||
  "http://localhost:3333";

const getDataMode = () => {
  if (!hasElectronApi()) return "online";
  return localStorage.getItem(DATA_MODE_KEY) === "online" ? "online" : "local";
};

const setDataMode = (mode) => {
  const nextMode = mode === "online" ? "online" : "local";
  localStorage.setItem(DATA_MODE_KEY, nextMode);
  if (nextMode === "local") clearOnlineSession();
};

const isRemoteMode = () => getDataMode() === "online";

const getOnlineToken = () => localStorage.getItem(ONLINE_TOKEN_KEY);
const getOnlineStoreId = () => localStorage.getItem(ONLINE_STORE_ID_KEY);
const getStoredOnlineUser = () => {
  try {
    return JSON.parse(localStorage.getItem(ONLINE_USER_KEY) || "null");
  } catch {
    return null;
  }
};

// Handler global para 401 (sessão expirada/inválida). O AuthContext registra
// um callback que derruba a sessão e volta para a tela de login.
let unauthorizedHandler = null;
const registerUnauthorized = (cb) => {
  unauthorizedHandler = cb;
  return () => {
    if (unauthorizedHandler === cb) unauthorizedHandler = null;
  };
};

const setOnlineSession = ({ token, user, loja }) => {
  if (token) localStorage.setItem(ONLINE_TOKEN_KEY, token);
  if (loja?.id) localStorage.setItem(ONLINE_STORE_ID_KEY, String(loja.id));
  if (user) localStorage.setItem(ONLINE_USER_KEY, JSON.stringify(user));
};

const clearOnlineSession = () => {
  localStorage.removeItem(ONLINE_TOKEN_KEY);
  localStorage.removeItem(ONLINE_USER_KEY);
};

const DEVICE_ID_KEY = "syscontrol_device_id";
const DEVICE_NAME_KEY = "syscontrol_device_name";

const getDeviceInfo = () => {
  let deviceId = localStorage.getItem(DEVICE_ID_KEY);
  if (!deviceId) {
    deviceId =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `dev-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }
  const nomeMaquina =
    localStorage.getItem(DEVICE_NAME_KEY) ||
    (typeof navigator !== "undefined" ? navigator.platform || "Dispositivo" : "Dispositivo");
  return { deviceId, nomeMaquina };
};

const buildQuery = (params = {}) => {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params || {})) {
    if (value !== undefined && value !== null && value !== "") {
      search.set(key, value);
    }
  }
  const query = search.toString();
  return query ? `?${query}` : "";
};

const http = async (path, { method = "GET", body, token = getOnlineToken() } = {}) => {
  const response = await fetch(`${getBaseUrl()}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.success === false) {
    // Token expirado/invalido numa requisicao autenticada: derruba a sessao e
    // avisa a aplicacao para voltar ao login. (Nao dispara em login/join, que
    // usam token:null.)
    if (response.status === 401 && token) {
      clearOnlineSession();
      if (unauthorizedHandler) unauthorizedHandler();
    }
    const error = new Error(data.error || `Erro HTTP ${response.status}`);
    error.response = data;
    error.status = response.status;
    throw error;
  }
  return data;
};

const safeCall = async (fn, ...args) => {
  try {
    return await fn(...args);
  } catch (error) {
    console.error("[API Error]", error);
    throw error;
  }
};

const readJsonFileFromPicker = () =>
  new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,application/json";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return resolve({ canceled: true });
      try {
        const text = await file.text();
        resolve({ canceled: false, fileName: file.name, json: JSON.parse(text) });
      } catch (error) {
        resolve({ canceled: false, error: "Arquivo de backup invalido." });
      }
    };
    input.click();
  });

const saveJsonFile = async (defaultPath, data) => {
  const text = JSON.stringify(data, null, 2);
  const dataBase64 = btoa(unescape(encodeURIComponent(text)));

  if (hasElectronApi() && window.api?.saveGeneratedFile) {
    return await safeCall(window.api.saveGeneratedFile, {
      defaultPath,
      filters: [{ name: "Backup SysControl", extensions: ["json"] }],
      dataBase64,
    });
  }

  const blob = new Blob([text], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = defaultPath;
  link.click();
  URL.revokeObjectURL(url);
  return { success: true };
};

const toNumber = (value, fallback = 0) => {
  const normalized = Number(value);
  return Number.isFinite(normalized) ? normalized : fallback;
};

const normalizeOnlineProduct = (product) => {
  if (!product) return product;
  return {
    ...product,
    custo: toNumber(product.custo),
    preco_venda: toNumber(product.preco_venda),
    estoque_atual: toNumber(product.estoque_atual),
  };
};

const normalizeDashboardStats = (stats = {}) => ({
  faturamento: toNumber(stats.faturamento),
  lucro: toNumber(stats.lucro),
  vendasCount: toNumber(stats.vendasCount ?? stats.vendasHoje ?? stats.totalVendas),
  maoDeObra: toNumber(stats.maoDeObra),
  comissoes: toNumber(stats.comissoes),
  hasFinancialBreakdown: stats.maoDeObra !== undefined || stats.comissoes !== undefined,
});

const normalizeInventoryStats = (stats = {}) => {
  const custoTotal = toNumber(stats.custoTotal ?? stats.custoEstoque);
  const vendaPotencial = toNumber(stats.vendaPotencial ?? stats.valorVendaEstoque);
  const hasStockCounters =
    stats.qtdZerados !== undefined ||
    stats.qtdBaixoEstoque !== undefined ||
    stats.totalItensFisicos !== undefined;
  return {
    custoTotal,
    vendaPotencial,
    lucroProjetado: toNumber(stats.lucroProjetado, vendaPotencial - custoTotal),
    qtdZerados: toNumber(stats.qtdZerados),
    qtdBaixoEstoque: toNumber(stats.qtdBaixoEstoque),
    totalItensFisicos: toNumber(stats.totalItensFisicos ?? stats.estoqueTotal),
    hasStockCounters,
  };
};

const normalizeWeeklySales = (weekly = {}) => {
  if (Array.isArray(weekly)) {
    return {
      labels: weekly.map((row) =>
        new Date(row.dia).toLocaleDateString("pt-BR", { weekday: "short" }),
      ),
      data: weekly.map((row) => toNumber(row.total)),
    };
  }

  return {
    labels: Array.isArray(weekly.labels) ? weekly.labels : [],
    data: Array.isArray(weekly.data) ? weekly.data.map((value) => toNumber(value)) : [],
  };
};

const online = {
  products: {
    list: async () => ((await http("/products")).products || []).map(normalizeOnlineProduct),
    search: async (params) =>
      ((await http(`/products/search${buildQuery(params)}`)).products || []).map(normalizeOnlineProduct),
    save: async (data) => {
      if (data?.id) return await http(`/products/${data.id}`, { method: "PUT", body: data });
      return await http("/products", { method: "POST", body: data });
    },
    delete: async (id) => await http(`/products/${id}`, { method: "DELETE" }),
    history: async (filters) => {
      const result = await http(`/products/history${buildQuery(filters)}`);
      return {
        data: result.data || [],
        total: result.total || 0,
        page: result.page || 1,
        totalPages: result.totalPages || 0,
      };
    },
    importBatch: async (data) => await http("/products/import", { method: "POST", body: data }),
  },

  sales: {
    create: async (data) => await http("/sales", { method: "POST", body: data }),
    list: async (filters) => {
      const result = await http(`/sales${buildQuery(filters)}`);
      return result.data ? result : result.sales || [];
    },
    items: async (id) => (await http(`/sales/${id}/items`)).items || [],
    cancel: async (data) => await http(`/sales/${data.vendaId || data.venda_id}/cancel`, { method: "POST", body: data }),
    payCommissions: async (ids) => await http("/sales/commissions/pay", { method: "POST", body: { vendaIds: ids } }),
  },

  budgets: {
    create: async (data) => await http("/budgets", { method: "POST", body: data }),
    update: async (data) => await http(`/budgets/${data.id}`, { method: "PUT", body: data }),
    list: async (filters) => {
      const result = await http(`/budgets${buildQuery(filters)}`);
      return result.data ? result : result.budgets || [];
    },
    getById: async (id) => (await http(`/budgets/${id}`)).budget || null,
    items: async (id) => (await http(`/budgets/${id}/items`)).items || [],
    cancel: async (id) => await http(`/budgets/${id}/cancel`, { method: "POST" }),
    duplicate: async (id) => await http(`/budgets/${id}/duplicate`, { method: "POST" }),
    convert: async (data) => await http(`/budgets/${data.budgetId || data.id}/convert`, { method: "POST", body: data }),
  },

  clients: {
    list: async () => (await http("/clients")).clients || [],
    save: async (data) => {
      if (data?.id) return await http(`/clients/${data.id}`, { method: "PUT", body: data });
      return await http("/clients", { method: "POST", body: data });
    },
    delete: async (id) => await http(`/clients/${id}`, { method: "DELETE" }),
    findByDoc: async (doc) => await http(`/clients/by-doc${buildQuery({ documento: doc })}`),
    debts: async (id) => (await http(`/clients/${id}/debts`)).debts || [],
    payDebt: async (data) => await http("/clients/pay-debt", { method: "POST", body: data }),
  },

  people: {
    list: async () => (await http("/people")).people || [],
    save: async (data) => {
      if (data?.id) return await http(`/people/${data.id}`, { method: "PUT", body: data });
      return await http("/people", { method: "POST", body: data });
    },
    delete: async (id) => await http(`/people/${id}`, { method: "DELETE" }),
  },

  services: {
    list: async (filters) => {
      const result = await http(`/services${buildQuery(filters)}`);
      return result.data ? result : result.services || [];
    },
    create: async (data) => await http("/services", { method: "POST", body: data }),
  },

  auth: {
    checkExist: async () => true,
    checkOnboarding: async () => ({ onboardingDone: true, hasUsers: true, hasStoreConfig: true }),
    // Restaura a sessão persistida (token + usuário) após um refresh no web.
    getSession: async () => {
      const token = getOnlineToken();
      if (!token) return null;
      return { token, user: getStoredOnlineUser(), lojaId: getOnlineStoreId() };
    },
    register: async (data) => {
      if (getOnlineToken()) {
        return await http("/users", { method: "POST", body: data });
      }
      return await online.auth.createStore(data);
    },
    createStore: async (data = {}) => {
      const store = data.store || {
        nome: data.lojaNome || data.nome || "Minha Loja",
        documento: data.documento || null,
        telefone: data.telefone || null,
        email: data.email || null,
        cidade: data.cidade || null,
      };
      const admin = data.admin || {
        nome: data.nome,
        username: data.username,
        password: data.password,
      };
      const result = await http("/store/onboarding/create", {
        method: "POST",
        body: { store, admin, device: getDeviceInfo(), settings: data.settings || [] },
        token: null,
      });
      return result;
    },
    joinStore: async (data = {}) => {
      const result = await http("/store/onboarding/join", {
        method: "POST",
        body: {
          lojaId: data.lojaId || data.loja_id || data.codigoLoja,
          codigo: data.codigo || data.invite,
          username: data.username,
          password: data.password,
          device: getDeviceInfo(),
        },
        token: null,
      });
      setOnlineSession(result);
      return result;
    },
    login: async (username, password) => {
      const data = typeof username === "object" ? username : { username, password };
      const lojaId = data.lojaId || data.loja_id || getOnlineStoreId();
      const result = await http("/auth/login", {
        method: "POST",
        body: { ...data, lojaId },
        token: null,
      });
      setOnlineSession(result);
      return result;
    },
    verifyAdmin: async (username, password) => {
      const data = typeof username === "object" ? username : { username, password };
      return await online.auth.login(data);
    },
    logout: async () => {
      clearOnlineSession();
      return { success: true };
    },
    getRoles: async () => (await http("/roles")).roles || [],
    saveRole: async (name) => await http("/roles", { method: "POST", body: { nome: name } }),
    deleteRole: async (id) => await http(`/roles/${id}`, { method: "DELETE" }),
    listUsers: async () => (await http("/users")).users || [],
    deleteUser: async (id) => await http(`/users/${id}`, { method: "DELETE" }),
  },

  config: {
    get: async (key) => (await http(`/config/${encodeURIComponent(key)}`)).value,
    save: async (key, value) => await http(`/config/${encodeURIComponent(key)}`, {
      method: "PUT",
      body: { valor: value },
    }),
    backup: async () => {
      const result = await http("/backup/export");
      const lojaId = result.backup?.loja?.id || getOnlineStoreId() || "loja";
      const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
      const saved = await saveJsonFile(`backup-online-loja-${lojaId}-${stamp}.json`, result.backup);
      return saved.success === false ? saved : { success: true };
    },
    restore: async () => {
      const selected = await readJsonFileFromPicker();
      if (selected.canceled) return { success: false, message: "Restore cancelado." };
      if (selected.error) return { success: false, error: selected.error };
      return await http("/backup/restore", { method: "POST", body: selected.json });
    },
    getVersion: async () => "online-dev",
    getTenant: async () => {
      if (!getOnlineToken()) return null;
      const result = await http("/tenant");
      return result.tenant;
    },
  },

  dashboard: {
    stats: async () => normalizeDashboardStats((await http("/dashboard/stats")).stats),
    weeklySales: async () => normalizeWeeklySales((await http("/dashboard/weekly-sales")).data),
    lowStock: async () =>
      ((await http("/dashboard/low-stock")).products || []).map(normalizeOnlineProduct),
    inventoryStats: async () => normalizeInventoryStats((await http("/dashboard/inventory")).stats),
  },

  reports: {
    sales: async (filters = {}) => (await http(`/reports/sales${buildQuery(filters)}`)).report,
  },

  expenses: {
    list: async (filters = {}) => await http(`/expenses${buildQuery(filters)}`),
    categories: async () => (await http("/expenses/categories")).categories || [],
    create: async (data) => await http("/expenses", { method: "POST", body: data }),
    update: async (data) => await http(`/expenses/${data.id}`, { method: "PUT", body: data }),
    delete: async (id) => await http(`/expenses/${id}`, { method: "DELETE" }),
  },

  invites: {
    list: async () => (await http("/invites")).invites || [],
    create: async (data = {}) => await http("/invites", { method: "POST", body: data }),
    revoke: async (id) => await http(`/invites/${id}`, { method: "DELETE" }),
    resolve: async (codigo) => await http(`/invite/${encodeURIComponent(codigo)}`, { token: null }),
  },

  roles: {
    list: async () => (await http("/roles")).roles || [],
    save: async (name) => await http("/roles", { method: "POST", body: { nome: name } }),
    delete: async (id) => await http(`/roles/${id}`, { method: "DELETE" }),
  },

  print: {
    printers: async () => [],
    // Na web nao ha impressao silenciosa: abre a caixa de impressao do navegador.
    silent: async (html) => {
      try {
        if (!html || typeof window === "undefined") {
          return { success: false, error: "Nada para imprimir." };
        }
        const win = window.open("", "_blank", "width=380,height=640");
        if (!win) return { success: false, error: "Pop-up bloqueado. Libere pop-ups para imprimir." };
        win.document.write(
          `<html><head><title>Recibo</title><style>body{margin:0}</style></head><body onload="window.print()">${html}</body></html>`,
        );
        win.document.close();
        win.focus();
        return { success: true };
      } catch (error) {
        return { success: false, error: error.message };
      }
    },
  },

  system: {
    version: async () => "online-dev",
    checkUpdates: async () => ({ updateAvailable: false }),
    downloadUpdate: async () => ({ success: false }),
    quitAndInstall: async () => ({ success: false }),
    openFileDialog: async () => ({ canceled: true }),
    saveGeneratedFile: async () => ({ success: false, error: "Salvar arquivo exige Electron." }),
    onUpdateAvailable: () => {},
    onUpdateProgress: () => {},
    onUpdateDownloaded: () => {},
    onUpdateError: () => {},
  },

  events: {
    log: async (payload) => await http("/events", { method: "POST", body: payload }),
    list: async (filters) => await http(`/events${buildQuery(filters)}`),
  },
};

const electron = {
  products: {
    list: () => safeCall(window.api.getProducts),
    search: (params) => safeCall(window.api.searchProducts, params),
    save: (data) => safeCall(window.api.saveProduct, data),
    delete: (id) => safeCall(window.api.deleteProduct, id),
    history: (filters) => safeCall(window.api.getProductHistory, filters),
    importBatch: (data) => safeCall(window.api.importProductsBatch, data),
  },
  sales: {
    create: (data) => safeCall(window.api.createSale, data),
    list: (filters) => safeCall(window.api.getSales, filters),
    items: (id) => safeCall(window.api.getSaleItems, id),
    cancel: (data) => safeCall(window.api.cancelSale, data),
    payCommissions: (ids) => safeCall(window.api.payCommissions, ids),
  },
  budgets: {
    create: (data) => safeCall(window.api.createBudget, data),
    update: (data) => safeCall(window.api.updateBudget, data),
    list: (filters) => safeCall(window.api.getBudgets, filters),
    getById: (id) => safeCall(window.api.getBudgetById, id),
    items: (id) => safeCall(window.api.getBudgetItems, id),
    cancel: (id) => safeCall(window.api.cancelBudget, id),
    duplicate: (id) => safeCall(window.api.duplicateBudget, id),
    convert: (data) => safeCall(window.api.convertBudgetToSale, data),
  },
  clients: {
    list: () => safeCall(window.api.getClients),
    save: (data) => safeCall(window.api.saveClient, data),
    delete: (id) => safeCall(window.api.deleteClient, id),
    findByDoc: (doc) => safeCall(window.api.findClientByDoc, doc),
    debts: (id) => safeCall(window.api.getClientDebts, id),
    payDebt: (data) => safeCall(window.api.payDebt, data),
  },
  people: {
    list: () => safeCall(window.api.getPeople),
    save: (data) => safeCall(window.api.savePerson, data),
    delete: (id) => safeCall(window.api.deletePerson, id),
  },
  services: {
    list: (filters) => safeCall(window.api.getServices, filters),
    create: (data) => safeCall(window.api.createService, data),
  },
  expenses: {
    list: (filters) => safeCall(window.api.getExpenses, filters),
    categories: () => safeCall(window.api.getExpenseCategories),
    create: (data) => safeCall(window.api.saveExpense, data),
    update: (data) => safeCall(window.api.saveExpense, data),
    delete: (id) => safeCall(window.api.deleteExpense, id),
  },
  invites: {
    list: async () => [],
    create: async () => ({ success: false, error: "Links de acesso estao disponiveis apenas no modo online." }),
    revoke: async () => ({ success: false }),
    resolve: async () => ({ success: false }),
  },
  auth: {
    checkExist: () => safeCall(window.api.checkUsersExist),
    checkOnboarding: () => safeCall(window.api.checkOnboardingStatus),
    getSession: async () => null, // no desktop o login é por sessão de processo

    register: (data) => safeCall(window.api.registerUser, data),
    login: (username, password) => {
      const data = typeof username === "object" ? username : { username, password };
      return safeCall(window.api.loginAttempt, data);
    },
    verifyAdmin: (username, password) => {
      const data = typeof username === "object" ? username : { username, password };
      return safeCall(window.api.verifyAdmin, data);
    },
    logout: () => safeCall(window.api.logoutSession),
    getRoles: () => safeCall(window.api.getRoles),
    listUsers: () => safeCall(window.api.getUsers),
    deleteUser: (id) => safeCall(window.api.deleteUser, id),
  },
  config: {
    get: (key) => safeCall(window.api.getConfig, key),
    save: (key, value) => safeCall(window.api.saveConfig, key, value),
    backup: () => safeCall(window.api.backupDatabase),
    restore: () => safeCall(window.api.restoreDatabase),
    getVersion: () => safeCall(window.api.getAppVersion),
    getTenant: () => safeCall(window.api.getTenantConfig),
  },
  dashboard: {
    stats: () => safeCall(window.api.getDashboardStats),
    weeklySales: () => safeCall(window.api.getWeeklySales),
    lowStock: () => safeCall(window.api.getLowStock),
    inventoryStats: () => safeCall(window.api.getInventoryStats),
  },
  roles: {
    list: () => safeCall(window.api.getRoles),
    save: (name) => safeCall(window.api.saveRole, name),
    delete: (id) => safeCall(window.api.deleteRole, id),
  },
  print: {
    printers: () => safeCall(window.api.getPrinters),
    silent: (html, printer, options) => safeCall(window.api.printSilent, html, printer, options),
  },
  system: {
    version: () => safeCall(window.api.getAppVersion),
    checkUpdates: () => safeCall(window.api.checkForUpdates),
    downloadUpdate: () => safeCall(window.api.downloadUpdate),
    quitAndInstall: () => safeCall(window.api.quitAndInstall),
    openFileDialog: () => safeCall(window.api.openFileDialog),
    saveGeneratedFile: (options) => safeCall(window.api.saveGeneratedFile, options),
    onUpdateAvailable: (callback) => window.api.onUpdateAvailable(callback),
    onUpdateProgress: (callback) => window.api.onUpdateProgress(callback),
    onUpdateDownloaded: (callback) => window.api.onUpdateDownloaded(callback),
    onUpdateError: (callback) => window.api.onUpdateError(callback),
  },
  events: {
    log: (payload) => safeCall(window.api.logEvent, payload),
    list: (filters) => safeCall(window.api.getEventLogs, filters),
  },
};

// Migracao: le o banco local (SQLite via IPC) e importa na loja online logada.
const migrateLocalToOnline = async ({ force = false } = {}) => {
  if (!hasElectronApi() || !window.api?.exportLocalData) {
    throw new Error("Exportacao local disponivel apenas no aplicativo desktop.");
  }
  if (!getOnlineToken()) {
    throw new Error("Entre em uma loja online antes de importar os dados locais.");
  }

  const dump = await safeCall(window.api.exportLocalData);
  if (!dump || dump.success === false) {
    throw new Error(dump?.error || "Falha ao ler os dados locais.");
  }

  return await http("/store/import-sqlite", {
    method: "POST",
    body: { backup: dump.backup, force },
  });
};

export const api = new Proxy(
  {},
  {
    get(_target, prop) {
      if (prop === "migrateLocalToOnline") return migrateLocalToOnline;
      if (prop === "isRemote") return isRemoteMode();
      if (prop === "isElectron") return hasElectronApi();
      if (prop === "dataMode") return getDataMode();
      if (prop === "setDataMode") return setDataMode;
      if (prop === "baseUrl") return getBaseUrl();
      if (prop === "setApiUrl")
        return (url) => localStorage.setItem("syscontrol_api_url", String(url || "").trim());
      if (prop === "onlineStoreId") return getOnlineStoreId();
      if (prop === "onlineToken") return getOnlineToken();
      if (prop === "onlineUser") return getOnlineToken() ? getStoredOnlineUser() : null;
      if (prop === "onUnauthorized") return registerUnauthorized;
      return (isRemoteMode() ? online : electron)[prop];
    },
  },
);
