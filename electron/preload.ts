import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("api", {
  // PRODUCTS
  getProducts: () => ipcRenderer.invoke("get-products"),
  saveProduct: (product: any) => ipcRenderer.invoke("save-product", product),
  deleteProduct: (id: number) => ipcRenderer.invoke("delete-product", id),
  getProductHistory: () => ipcRenderer.invoke("get-product-history"),

  // SALES
  createSale: (saleData: any) => ipcRenderer.invoke("create-sale", saleData),
  getSales: () => ipcRenderer.invoke("get-sales"),
  getSaleItems: (id: number) => ipcRenderer.invoke("get-sale-items", id),
  cancelSale: (data: any) => ipcRenderer.invoke("cancel-sale", data),

  // PEOPLE & ROLES
  getPeople: () => ipcRenderer.invoke("get-people"),
  savePerson: (person: any) => ipcRenderer.invoke("save-person", person),
  deletePerson: (id: number) => ipcRenderer.invoke("delete-person", id),
  getRoles: () => ipcRenderer.invoke("get-roles"),
  saveRole: (nome: string) => ipcRenderer.invoke("save-role", nome),
  deleteRole: (id: number) => ipcRenderer.invoke("delete-role", id),

  // CLIENTS & DEBTS
  getClients: () => ipcRenderer.invoke("get-clients"),
  saveClient: (client: any) => ipcRenderer.invoke("save-client", client),
  deleteClient: (id: number) => ipcRenderer.invoke("delete-client", id),
  getClientDebts: (clienteId: number) =>
    ipcRenderer.invoke("get-client-debts", clienteId),
  payDebt: (data: any) => ipcRenderer.invoke("pay-debt", data),

  // SERVICES
  getServices: () => ipcRenderer.invoke("get-services"),
  createService: (data: any) => ipcRenderer.invoke("create-service", data),

  // COMPANY
  getCompanyInfo: () => ipcRenderer.invoke("get-company-info"),
  saveCompanyInfo: (data: any) => ipcRenderer.invoke("save-company-info", data),
  selectLogoFile: () => ipcRenderer.invoke("select-logo-file"),

  // SYSTEM & AUTH
  checkUsersExist: () => ipcRenderer.invoke("check-users-exist"),
  registerUser: (userData: any) => ipcRenderer.invoke("register-user", userData),
  loginAttempt: (credentials: any) =>
    ipcRenderer.invoke("login-attempt", credentials),
  getUsers: () => ipcRenderer.invoke("get-users"),
  deleteUser: (id: number) => ipcRenderer.invoke("delete-user", id),
  getConfig: (key: string) => ipcRenderer.invoke("get-config", key),
  saveConfig: (key: string, value: any) =>
    ipcRenderer.invoke("save-config", key, value),
  backupDatabase: () => ipcRenderer.invoke("backup-database"),
  restoreDatabase: () => ipcRenderer.invoke("restore-database"),
  getPrinters: () => ipcRenderer.invoke("get-printers"),
  selectCustomBackground: () => ipcRenderer.invoke("select-custom-background"),

  // DASHBOARD
  getDashboardStats: () => ipcRenderer.invoke("get-dashboard-stats"),
  getWeeklySales: () => ipcRenderer.invoke("get-weekly-sales"),
  getLowStock: () => ipcRenderer.invoke("get-low-stock"),
  getInventoryStats: () => ipcRenderer.invoke("get-inventory-stats"),

  // PRINTING
  printSilent: (html: string, printer: string) =>
    ipcRenderer.invoke("print-silent", html, printer),

  // VERSION & UPDATES
  getAppVersion: () => ipcRenderer.invoke("get-app-version"),
  checkForUpdates: () => ipcRenderer.invoke("check-for-updates"),
  downloadUpdate: () => ipcRenderer.invoke("download-update"),
  quitAndInstall: () => ipcRenderer.invoke("quit-and-install"),

  // EVENT LISTENERS
  onUpdateAvailable: (callback: any) =>
    ipcRenderer.on("update_available", (_event, info) => callback(info)),
  onUpdateNotAvailable: (callback: any) =>
    ipcRenderer.on("update_not_available", () => callback()),
  onUpdateError: (callback: any) =>
    ipcRenderer.on("update_error", (_event, err) => callback(err)),
  onDownloadProgress: (callback: any) =>
    ipcRenderer.on("download_progress", (_event, progress) =>
      callback(progress),
    ),
  onUpdateDownloaded: (callback: any) =>
    ipcRenderer.on("update_downloaded", () => callback()),
});
