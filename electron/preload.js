"use strict";

// electron/preload.ts
var import_electron = require("electron");
import_electron.contextBridge.exposeInMainWorld("api", {
  // PRODUCTS
  getProducts: () => import_electron.ipcRenderer.invoke("get-products"),
  saveProduct: (product) => import_electron.ipcRenderer.invoke("save-product", product),
  deleteProduct: (id) => import_electron.ipcRenderer.invoke("delete-product", id),
  getProductHistory: () => import_electron.ipcRenderer.invoke("get-product-history"),
  // SALES
  createSale: (saleData) => import_electron.ipcRenderer.invoke("create-sale", saleData),
  getSales: () => import_electron.ipcRenderer.invoke("get-sales"),
  getSaleItems: (id) => import_electron.ipcRenderer.invoke("get-sale-items", id),
  cancelSale: (data) => import_electron.ipcRenderer.invoke("cancel-sale", data),
  // PEOPLE & ROLES
  getPeople: () => import_electron.ipcRenderer.invoke("get-people"),
  savePerson: (person) => import_electron.ipcRenderer.invoke("save-person", person),
  deletePerson: (id) => import_electron.ipcRenderer.invoke("delete-person", id),
  getRoles: () => import_electron.ipcRenderer.invoke("get-roles"),
  saveRole: (nome) => import_electron.ipcRenderer.invoke("save-role", nome),
  deleteRole: (id) => import_electron.ipcRenderer.invoke("delete-role", id),
  // CLIENTS & DEBTS
  getClients: () => import_electron.ipcRenderer.invoke("get-clients"),
  saveClient: (client) => import_electron.ipcRenderer.invoke("save-client", client),
  deleteClient: (id) => import_electron.ipcRenderer.invoke("delete-client", id),
  getClientDebts: (clienteId) => import_electron.ipcRenderer.invoke("get-client-debts", clienteId),
  payDebt: (data) => import_electron.ipcRenderer.invoke("pay-debt", data),
  // SERVICES
  getServices: () => import_electron.ipcRenderer.invoke("get-services"),
  createService: (data) => import_electron.ipcRenderer.invoke("create-service", data),
  // COMPANY
  getCompanyInfo: () => import_electron.ipcRenderer.invoke("get-company-info"),
  saveCompanyInfo: (data) => import_electron.ipcRenderer.invoke("save-company-info", data),
  selectLogoFile: () => import_electron.ipcRenderer.invoke("select-logo-file"),
  // SYSTEM & AUTH
  checkUsersExist: () => import_electron.ipcRenderer.invoke("check-users-exist"),
  registerUser: (userData) => import_electron.ipcRenderer.invoke("register-user", userData),
  loginAttempt: (credentials) => import_electron.ipcRenderer.invoke("login-attempt", credentials),
  getUsers: () => import_electron.ipcRenderer.invoke("get-users"),
  deleteUser: (id) => import_electron.ipcRenderer.invoke("delete-user", id),
  getConfig: (key) => import_electron.ipcRenderer.invoke("get-config", key),
  saveConfig: (key, value) => import_electron.ipcRenderer.invoke("save-config", key, value),
  backupDatabase: () => import_electron.ipcRenderer.invoke("backup-database"),
  restoreDatabase: () => import_electron.ipcRenderer.invoke("restore-database"),
  getPrinters: () => import_electron.ipcRenderer.invoke("get-printers"),
  selectCustomBackground: () => import_electron.ipcRenderer.invoke("select-custom-background"),
  // DASHBOARD
  getDashboardStats: () => import_electron.ipcRenderer.invoke("get-dashboard-stats"),
  getWeeklySales: () => import_electron.ipcRenderer.invoke("get-weekly-sales"),
  getLowStock: () => import_electron.ipcRenderer.invoke("get-low-stock"),
  getInventoryStats: () => import_electron.ipcRenderer.invoke("get-inventory-stats"),
  // PRINTING
  printSilent: (html, printer) => import_electron.ipcRenderer.invoke("print-silent", html, printer),
  // VERSION & UPDATES
  getAppVersion: () => import_electron.ipcRenderer.invoke("get-app-version"),
  checkForUpdates: () => import_electron.ipcRenderer.invoke("check-for-updates"),
  downloadUpdate: () => import_electron.ipcRenderer.invoke("download-update"),
  quitAndInstall: () => import_electron.ipcRenderer.invoke("quit-and-install"),
  // EVENT LISTENERS
  onUpdateAvailable: (callback) => import_electron.ipcRenderer.on("update_available", (_event, info) => callback(info)),
  onUpdateNotAvailable: (callback) => import_electron.ipcRenderer.on("update_not_available", () => callback()),
  onUpdateError: (callback) => import_electron.ipcRenderer.on("update_error", (_event, err) => callback(err)),
  onDownloadProgress: (callback) => import_electron.ipcRenderer.on(
    "download_progress",
    (_event, progress) => callback(progress)
  ),
  onUpdateDownloaded: (callback) => import_electron.ipcRenderer.on("update_downloaded", () => callback())
});
