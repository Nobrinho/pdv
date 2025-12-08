const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // Produtos
  getProducts: () => ipcRenderer.invoke('get-products'),
  saveProduct: (product) => ipcRenderer.invoke('save-product', product),
  deleteProduct: (id) => ipcRenderer.invoke('delete-product', id),

  // Pessoas
  getPeople: () => ipcRenderer.invoke('get-people'),
  savePerson: (person) => ipcRenderer.invoke('save-person', person),
  deletePerson: (id) => ipcRenderer.invoke('delete-person', id),

  // Cargos
  getRoles: () => ipcRenderer.invoke('get-roles'),
});