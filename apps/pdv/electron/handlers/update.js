/**
 * Handlers de Auto-Update
 */
const { autoUpdater } = require("electron-updater");
const { app } = require("electron");

function register(safeHandle, knex, mainWindow, isDev) {
  // Configuração do AutoUpdater
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;

  safeHandle("get-app-version", () => {
    return app.getVersion();
  });

  safeHandle("check-for-updates", () => {
    if (!isDev) autoUpdater.checkForUpdates();
  });

  safeHandle("download-update", async () => {
    await autoUpdater.downloadUpdate();
    return { success: true };
  });

  safeHandle("quit-and-install", () => {
    autoUpdater.quitAndInstall();
  });

  // Listeners de eventos do autoUpdater
  autoUpdater.on("update-available", (info) =>
    mainWindow.webContents.send("update_available", info.version),
  );
  autoUpdater.on("download-progress", (p) =>
    mainWindow.webContents.send("update_progress", p.percent),
  );
  autoUpdater.on("update-downloaded", () =>
    mainWindow.webContents.send("update_downloaded"),
  );
  autoUpdater.on("error", (err) =>
    mainWindow.webContents.send("update_error", err.message),
  );
}

module.exports = { register };
