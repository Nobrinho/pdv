// =============================================================
// api.js — Camada de abstração para chamadas IPC (window.api)
// =============================================================
// Ponto único de acesso à API. Facilita:
// - Renomear métodos sem quebrar múltiplas páginas
// - Adicionar cache, retry ou logging global
// - Mockar em testes
// =============================================================

const safeCall = async (fn, ...args) => {
  try {
    return await fn(...args);
  } catch (error) {
    console.error("[API Error]", error);
    throw error;
  }
};

export const api = {
  // --- PRODUTOS ---
  products: {
    list:    ()       => safeCall(window.api.getProducts),
    search:  (params) => safeCall(window.api.searchProducts, params),
    save:    (data)   => safeCall(window.api.saveProduct, data),
    delete:  (id)     => safeCall(window.api.deleteProduct, id),
    history: (f)      => safeCall(window.api.getProductHistory, f),
    importBatch: (data) => safeCall(window.api.importProductsBatch, data),
  },

  // --- VENDAS & RECIBOS ---
  sales: {
    create: (data) => safeCall(window.api.createSale, data),
    list:   (f)    => safeCall(window.api.getSales, f),
    items:  (id)   => safeCall(window.api.getSaleItems, id),
    cancel: (data) => safeCall(window.api.cancelSale, data),
  },

  // --- CLIENTES & FIADO ---
  clients: {
    list:      ()    => safeCall(window.api.getClients),
    save:      (d)   => safeCall(window.api.saveClient, d),
    delete:    (id)  => safeCall(window.api.deleteClient, id),
    findByDoc: (doc) => safeCall(window.api.findClientByDoc, doc),
    debts:     (id)  => safeCall(window.api.getClientDebts, id),
    payDebt:   (d)   => safeCall(window.api.payDebt, d),
  },

  // --- PESSOAS (EQUIPE) ---
  people: {
    list:   ()   => safeCall(window.api.getPeople),
    save:   (d)  => safeCall(window.api.savePerson, d),
    delete: (id) => safeCall(window.api.deletePerson, id),
  },

  // --- SERVIÇOS AVULSOS ---
  services: {
    list:   (f) => safeCall(window.api.getServices, f),
    create: (d) => safeCall(window.api.createService, d),
  },

  // --- AUTENTICAÇÃO ---
  auth: {
    checkExist: () => safeCall(window.api.checkUsersExist),
    register: (d) => safeCall(window.api.registerUser, d),
    login: (username, password) => {
      // Aceita tanto objeto quanto argumentos separados para flexibilidade
      const data = typeof username === "object" ? username : { username, password };
      return safeCall(window.api.loginAttempt, data);
    },
    getRoles: () => safeCall(window.api.getRoles),
    listUsers: () => safeCall(window.api.getUsers),
    deleteUser: (id) => safeCall(window.api.deleteUser, id),
  },

  // --- CONFIGURAÇÕES ---
  config: {
    get: (key) => safeCall(window.api.getConfig, key),
    save: (key, v) => safeCall(window.api.saveConfig, key, v),
    backup: () => safeCall(window.api.backupDatabase),
    restore: () => safeCall(window.api.restoreDatabase),
    getVersion: () => safeCall(window.api.getAppVersion),
  },

  // --- DASHBOARD ---
  dashboard: {
    stats: () => safeCall(window.api.getDashboardStats),
    weeklySales: () => safeCall(window.api.getWeeklySales),
    lowStock: () => safeCall(window.api.getLowStock),
    inventoryStats: () => safeCall(window.api.getInventoryStats),
  },

  // --- CARGOS ---
  roles: {
    list: () => safeCall(window.api.getRoles),
    save: (name) => safeCall(window.api.saveRole, name),
    delete: (id) => safeCall(window.api.deleteRole, id),
  },

  // --- IMPRESSÃO ---
  print: {
    printers: () => safeCall(window.api.getPrinters),
    silent: (html, p) => safeCall(window.api.printSilent, html, p),
  },

  // --- SISTEMA ---
  system: {
    version: () => safeCall(window.api.getAppVersion),
    checkUpdates: () => safeCall(window.api.checkForUpdates),
    downloadUpdate: () => safeCall(window.api.downloadUpdate),
    quitAndInstall: () => safeCall(window.api.quitAndInstall),
    openFileDialog: () => safeCall(window.api.openFileDialog),
  },
};
