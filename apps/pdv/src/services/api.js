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

const setOnlineSession = ({ token, user, loja }) => {
  if (token) localStorage.setItem(ONLINE_TOKEN_KEY, token);
  if (loja?.id) localStorage.setItem(ONLINE_STORE_ID_KEY, String(loja.id));
  if (user) localStorage.setItem(ONLINE_USER_KEY, JSON.stringify(user));
};

const clearOnlineSession = () => {
  localStorage.removeItem(ONLINE_TOKEN_KEY);
  localStorage.removeItem(ONLINE_USER_KEY);
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

const online = {
  products: {
    list: async () => (await http("/products")).products || [],
    search: async (params) => (await http(`/products/search${buildQuery(params)}`)).products || [],
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
    importBatch: async (data) => await http("/products/import", { method: "POST", body: { products: data } }),
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
    register: async (data) => {
      if (getOnlineToken()) {
        return await http("/users", { method: "POST", body: data });
      }

      const result = await http("/store/onboarding/create", {
        method: "POST",
        body: {
          store: { nome: data.lojaNome || "Minha Loja" },
          admin: data,
        },
        token: null,
      });
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
    backup: async () => ({ success: false, error: "Backup online ainda nao implementado." }),
    restore: async () => ({ success: false, error: "Restore online ainda nao implementado." }),
    getVersion: async () => "online-dev",
    getTenant: async () => {
      if (!getOnlineToken()) return null;
      const result = await http("/tenant");
      return result.tenant;
    },
  },

  dashboard: {
    stats: async () => (await http("/dashboard/stats")).stats || {},
    weeklySales: async () => (await http("/dashboard/weekly-sales")).data || [],
    lowStock: async () => (await http("/dashboard/low-stock")).products || [],
    inventoryStats: async () => (await http("/dashboard/inventory")).stats || {},
  },

  roles: {
    list: async () => (await http("/roles")).roles || [],
    save: async (name) => await http("/roles", { method: "POST", body: { nome: name } }),
    delete: async (id) => await http(`/roles/${id}`, { method: "DELETE" }),
  },

  print: {
    printers: async () => [],
    silent: async () => ({ success: false, error: "Impressao silenciosa exige Electron." }),
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
  auth: {
    checkExist: () => safeCall(window.api.checkUsersExist),
    checkOnboarding: () => safeCall(window.api.checkOnboardingStatus),
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

export const api = new Proxy(
  {},
  {
    get(_target, prop) {
      if (prop === "isRemote") return isRemoteMode();
      if (prop === "isElectron") return hasElectronApi();
      if (prop === "dataMode") return getDataMode();
      if (prop === "setDataMode") return setDataMode;
      if (prop === "baseUrl") return getBaseUrl();
      return (isRemoteMode() ? online : electron)[prop];
    },
  },
);
