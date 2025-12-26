const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // --- PRODUTOS ---
  getProducts: () => ipcRenderer.invoke('get-products'),
  saveProduct: (product) => ipcRenderer.invoke('save-product', product),
  deleteProduct: (id) => ipcRenderer.invoke('delete-product', id),

  // --- PESSOAS (Equipa) ---
  getPeople: () => ipcRenderer.invoke('get-people'),
  savePerson: (person) => ipcRenderer.invoke('save-person', person),
  deletePerson: (id) => ipcRenderer.invoke('delete-person', id),

  // --- VENDAS & RECIBOS ---
  createSale: (saleData) => ipcRenderer.invoke('create-sale', saleData),
  getSales: () => ipcRenderer.invoke('get-sales'),
  getSaleItems: (vendaId) => ipcRenderer.invoke('get-sale-items', vendaId),

  // --- SERVIÇOS AVULSOS ---
  getServices: () => ipcRenderer.invoke('get-services'),
  createService: (serviceData) => ipcRenderer.invoke('create-service', serviceData),

  // --- CONFIGURAÇÕES & UTILITÁRIOS ---
  getRoles: () => ipcRenderer.invoke('get-roles'),
  saveRole: (name) => ipcRenderer.invoke('save-role', name),
  deleteRole: (id) => ipcRenderer.invoke('delete-role', id),
  getConfig: (key) => ipcRenderer.invoke('get-config', key),
  saveConfig: (key, value) => ipcRenderer.invoke('save-config', key, value),
  getDashboardStats: () => ipcRenderer.invoke('get-dashboard-stats'),
  getWeeklySales: () => ipcRenderer.invoke('get-weekly-sales'),
  getLowStock: () => ipcRenderer.invoke('get-low-stock'),

  // --- AUTENTICAÇÃO & USUÁRIOS (O QUE FALTAVA) ---
  checkUsersExist: () => ipcRenderer.invoke('check-users-exist'),
  registerUser: (data) => ipcRenderer.invoke('register-user', data),
  loginAttempt: (data) => ipcRenderer.invoke('login-attempt', data),
  getUsers: () => ipcRenderer.invoke('get-users'), // <--- FALTAVA ESTA
  deleteUser: (id) => ipcRenderer.invoke('delete-user', id), // <--- E ESTA

  // --- BACKUP & IMPRESSÃO ---
  backupDatabase: () => ipcRenderer.invoke('backup-database'),
  restoreDatabase: () => ipcRenderer.invoke('restore-database'),
  getPrinters: () => ipcRenderer.invoke('get-printers'),
  printSilent: (html, printer) => ipcRenderer.invoke('print-silent', html, printer),

    // --- CANCELAR ---
  cancelSale: (data) => ipcRenderer.invoke('cancel-sale', data),

    // --- NOVO: HISTÓRICO ---
  getProductHistory: () => ipcRenderer.invoke('get-product-history'),
});