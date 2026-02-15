const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
  // --- PRODUTOS ---
  getProducts: () => ipcRenderer.invoke("get-products"),
  saveProduct: (product) => ipcRenderer.invoke("save-product", product),
  deleteProduct: (id) => ipcRenderer.invoke("delete-product", id),

  // --- PESSOAS (Equipa) ---
  getPeople: () => ipcRenderer.invoke("get-people"),
  savePerson: (person) => ipcRenderer.invoke("save-person", person),
  deletePerson: (id) => ipcRenderer.invoke("delete-person", id),

  // --- VENDAS & RECIBOS ---
  createSale: (saleData) => ipcRenderer.invoke("create-sale", saleData),
  getSales: () => ipcRenderer.invoke("get-sales"),
  getSaleItems: (vendaId) => ipcRenderer.invoke("get-sale-items", vendaId),

  // --- SERVIÇOS AVULSOS ---
  getServices: () => ipcRenderer.invoke("get-services"),
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

  // --- AUTENTICAÇÃO & USUÁRIOS (O QUE FALTAVA) ---
  checkUsersExist: () => ipcRenderer.invoke("check-users-exist"),
  registerUser: (data) => ipcRenderer.invoke("register-user", data),
  loginAttempt: (data) => ipcRenderer.invoke("login-attempt", data),
  getUsers: () => ipcRenderer.invoke("get-users"), // <--- FALTAVA ESTA
  deleteUser: (id) => ipcRenderer.invoke("delete-user", id), // <--- E ESTA

  // --- BACKUP & IMPRESSÃO ---
  backupDatabase: () => ipcRenderer.invoke("backup-database"),
  restoreDatabase: () => ipcRenderer.invoke("restore-database"),
  getPrinters: () => ipcRenderer.invoke("get-printers"),
  printSilent: (html, printer) =>
    ipcRenderer.invoke("print-silent", html, printer),

  // --- CANCELAR ---
  cancelSale: (data) => ipcRenderer.invoke("cancel-sale", data),

  // --- NOVO: HISTÓRICO ---
  getProductHistory: () => ipcRenderer.invoke("get-product-history"),

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

  getInventoryStats: () => ipcRenderer.invoke("get-inventory-stats"),

  // --- CLIENTES & FIADO (NOVO) ---
  getClients: () => ipcRenderer.invoke("get-clients"),
  saveClient: (client) => ipcRenderer.invoke("save-client", client),
  deleteClient: (id) => ipcRenderer.invoke("delete-client", id),
  getClientDebts: (id) => ipcRenderer.invoke("get-client-debts", id),
  payDebt: (data) => ipcRenderer.invoke("pay-debt", data),

  // --- DADOS DA EMPRESA ---
  getCompanyInfo: () => ipcRenderer.invoke("get-company-info"),
  saveCompanyInfo: (data) => ipcRenderer.invoke("save-company-info", data),
  selectLogoFile: () => ipcRenderer.invoke("select-logo-file"),

  // --- DADOS DA EMPRESA ---
  getCompanyInfo: () => ipcRenderer.invoke("get-company-info"),
  saveCompanyInfo: (data) => ipcRenderer.invoke("save-company-info", data),
  selectLogoFile: () => ipcRenderer.invoke("select-logo-file"),
});
