const { app, BrowserWindow } = require("electron");
const path = require("path");
const { knex, dbPath, isDev } = require("./lib/db");
const { safeHandle } = require("./lib/safeHandle");

let mainWindow;

async function initDb() {
  try {
    await knex.migrate.latest();
    console.log("✅ Banco de dados inicializado em:", dbPath);
  } catch (err) {
    console.error("❌ Erro ao inicializar banco de dados:", err);
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  if (isDev) {
    mainWindow.loadURL("http://localhost:5173");
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  }
}

app.whenReady().then(() => {
  initDb();
  createWindow();

  // Registrar todos os handlers modulares
  require("./handlers/products").register(safeHandle, knex);
  require("./handlers/people").register(safeHandle, knex);
  require("./handlers/sales").register(safeHandle, knex);
  require("./handlers/clients").register(safeHandle, knex);
  require("./handlers/services").register(safeHandle, knex);
  require("./handlers/dashboard").register(safeHandle, knex);
  require("./handlers/auth").register(safeHandle, knex);
  require("./handlers/config").register(safeHandle, knex, mainWindow);
  require("./handlers/print").register(safeHandle, knex, mainWindow);
  require("./handlers/update").register(safeHandle, knex, mainWindow, isDev);

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
