const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
  // --- PRODUTOS ---
  getProducts: () => ipcRenderer.invoke("get-products"),
  searchProducts: (params) => ipcRenderer.invoke("search-products", params),
  saveProduct: (product) => ipcRenderer.invoke("save-product", product),
  deleteProduct: (id) => ipcRenderer.invoke("delete-product", id),
  importProductsBatch: (data) => ipcRenderer.invoke("import-products-batch", data),
  openFileDialog: () => ipcRenderer.invoke("open-file-dialog"),

  // --- PESSOAS (Equipa) ---
  getPeople: () => ipcRenderer.invoke("get-people"),
  savePerson: (person) => ipcRenderer.invoke("save-person", person),
  deletePerson: (id) => ipcRenderer.invoke("delete-person", id),

  // --- VENDAS & RECIBOS ---
  createSale: (saleData) => ipcRenderer.invoke("create-sale", saleData),
  getSales: (filters) => ipcRenderer.invoke("get-sales", filters),
  getSaleItems: (vendaId) => ipcRenderer.invoke("get-sale-items", vendaId),
  createBudget: (budgetData) => ipcRenderer.invoke("create-budget", budgetData),
  updateBudget: (budgetData) => ipcRenderer.invoke("update-budget", budgetData),
  getBudgets: (filters) => ipcRenderer.invoke("get-budgets", filters),
  getBudgetById: (budgetId) => ipcRenderer.invoke("get-budget-by-id", budgetId),
  getBudgetItems: (budgetId) => ipcRenderer.invoke("get-budget-items", budgetId),
  cancelBudget: (budgetId) => ipcRenderer.invoke("cancel-budget", budgetId),
  duplicateBudget: (budgetId) => ipcRenderer.invoke("duplicate-budget", budgetId),
  convertBudgetToSale: (payload) => ipcRenderer.invoke("convert-budget-to-sale", payload),

  // --- SERVIÇOS AVULSOS ---
  getServices: (filters) => ipcRenderer.invoke("get-services", filters),
  createService: (serviceData) =>
    ipcRenderer.invoke("create-service", serviceData),

  // --- CONFIGURAÇÕES & UTILITÁRIOS ---
  getRoles: () => ipcRenderer.invoke("get-roles"),
  saveRole: (name) => ipcRenderer.invoke("save-role", name),
  deleteRole: (id) => ipcRenderer.invoke("delete-role", id),
  getConfig: (key) => ipcRenderer.invoke("get-config", key),
  saveConfig: (key, value) => ipcRenderer.invoke("save-config", key, value),
  getDashboardStats: () => ipcRenderer.invoke("get-dashboard-stats"),
  getWeeklySales: () => ipcRenderer.invoke("get-weekly-sales"),
  getLowStock: () => ipcRenderer.invoke("get-low-stock"),

  // --- AUTENTICAÇÃO & USUÁRIOS ---
  checkUsersExist: () => ipcRenderer.invoke("check-users-exist"),
  checkOnboardingStatus: () => ipcRenderer.invoke("check-onboarding-status"),
  registerUser: (data) => ipcRenderer.invoke("register-user", data),
  loginAttempt: (data) => ipcRenderer.invoke("login-attempt", data),
  verifyAdmin: (data) => ipcRenderer.invoke("verify-admin", data),
  logoutSession: () => ipcRenderer.invoke("logout-session"),
  getUsers: () => ipcRenderer.invoke("get-users"),
  deleteUser: (id) => ipcRenderer.invoke("delete-user", id),
  saveUserPermissions: ({ userId, overrides }) =>
    ipcRenderer.invoke("save-user-permissions", { userId, overrides }),


  // --- BACKUP & IMPRESSÃO ---
  backupDatabase: () => ipcRenderer.invoke("backup-database"),
  restoreDatabase: () => ipcRenderer.invoke("restore-database"),
  saveGeneratedFile: (options) => ipcRenderer.invoke("save-generated-file", options),
  getPrinters: () => ipcRenderer.invoke("get-printers"),
  printSilent: (html, printer, options) =>
    ipcRenderer.invoke("print-silent", html, printer, options),

  // --- VENDAS & COMISSÕES ---
  cancelSale: (data) => ipcRenderer.invoke("cancel-sale", data),
  payCommissions: (ids) => ipcRenderer.invoke("pay-commissions", ids),

  // --- NOVO: HISTÓRICO ---
  getProductHistory: (filters) => ipcRenderer.invoke("get-product-history", filters),

  // --- AUTO UPDATE ---
  checkForUpdates: () => ipcRenderer.invoke("check-for-updates"),
  downloadUpdate: () => ipcRenderer.invoke("download-update"),
  quitAndInstall: () => ipcRenderer.invoke("quit-and-install"),

  // Listeners (Escutar eventos do backend)
  onUpdateAvailable: (callback) =>
    ipcRenderer.on("update_available", (event, version) => callback(version)),
  onUpdateProgress: (callback) =>
    ipcRenderer.on("update_progress", (event, percent) => callback(percent)),
  onUpdateDownloaded: (callback) =>
    ipcRenderer.on("update_downloaded", () => callback()),
  onUpdateError: (callback) =>
    ipcRenderer.on("update_error", (event, err) => callback(err)),

  // Limpeza de listeners (boa prática no React)
  removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel),

  // --- VERSÃO DO SISTEMA---
  getAppVersion: () => ipcRenderer.invoke("get-app-version"),

  // --- WHITE LABEL ---
  getTenantConfig: () => ipcRenderer.invoke("get-tenant-config"),

  getInventoryStats: () => ipcRenderer.invoke("get-inventory-stats"),

  // --- CLIENTES & FIADO (NOVO) ---
  getClients: () => ipcRenderer.invoke("get-clients"),
  saveClient: (client) => ipcRenderer.invoke("save-client", client),
  deleteClient: (id) => ipcRenderer.invoke("delete-client", id),
  findClientByDoc: (doc) => ipcRenderer.invoke("find-client-by-doc", doc),
  getClientDebts: (id) => ipcRenderer.invoke("get-client-debts", id),
  payDebt: (data) => ipcRenderer.invoke("pay-debt", data),

  // --- DESPESAS ---
  getExpenses: (filters) => ipcRenderer.invoke("get-expenses", filters),
  getExpenseCategories: () => ipcRenderer.invoke("get-expense-categories"),
  saveExpense: (data) => ipcRenderer.invoke("save-expense", data),
  deleteExpense: (id) => ipcRenderer.invoke("delete-expense", id),

  // --- EVENT LOGS ---
  logEvent: (payload) => ipcRenderer.invoke("log-event", payload),
  getEventLogs: (filters) => ipcRenderer.invoke("get-event-logs", filters),

  // --- MIGRACAO PARA ONLINE ---
  exportLocalData: () => ipcRenderer.invoke("export-local-data"),

});

