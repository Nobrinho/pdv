import { app, BrowserWindow, autoUpdater as electronAutoUpdater } from "electron";
import { autoUpdater } from "electron-updater";
import path from "path";
import { registerProductHandlers } from "./ipc/products";
import { registerSalesHandlers } from "./ipc/sales";
import { registerPeopleHandlers } from "./ipc/people";
import { registerClientHandlers } from "./ipc/clients";
import { registerServiceHandlers } from "./ipc/services";
import { registerCompanyHandlers } from "./ipc/company";
import { registerSystemHandlers } from "./ipc/system";
import { registerPrintHandlers } from "./ipc/print";
import { knex } from "./database/knex";

const isDev = !app.isPackaged;
let mainWindow: BrowserWindow | null = null;

// Configuração do AutoUpdater
autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = true;

async function initDb() {
  try {
    await knex.migrate.latest();
    console.log("Banco de dados sincronizado.");
  } catch (error) {
    console.error("Erro ao inicializar banco de dados:", error);
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
    },
    icon: path.join(__dirname, "../build/icon.png"),
  });

  if (isDev) {
    mainWindow.loadURL("http://localhost:5173");
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  }

  // Setup auto-updater events
  autoUpdater.on("checking-for-update", () => {
    mainWindow?.webContents.send("checking_for_update");
  });
  autoUpdater.on("update-available", (info) => {
    mainWindow?.webContents.send("update_available", info);
  });
  autoUpdater.on("update-not-available", () => {
    mainWindow?.webContents.send("update_not_available");
  });
  autoUpdater.on("error", (err) => {
    mainWindow?.webContents.send("update_error", err);
  });
  autoUpdater.on("download-progress", (progressObj) => {
    mainWindow?.webContents.send("download_progress", progressObj);
  });
  autoUpdater.on("update-downloaded", () => {
    mainWindow?.webContents.send("update_downloaded");
  });
}

app.whenReady().then(async () => {
  await initDb();
  createWindow();

  if (mainWindow) {
    registerProductHandlers();
    registerSalesHandlers();
    registerPeopleHandlers();
    registerClientHandlers();
    registerServiceHandlers();
    registerCompanyHandlers(mainWindow);
    registerSystemHandlers(mainWindow);
    registerPrintHandlers(mainWindow);
  }

  app.on("activate", function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", function () {
  if (process.platform !== "darwin") app.quit();
});
