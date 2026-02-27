import { ipcMain, app, dialog, BrowserWindow } from "electron";
import { autoUpdater } from "electron-updater";
import { dbPath } from "../database/knex";
import { SystemRepository } from "../database/repositories/SystemRepository";
import { DashboardRepository } from "../database/repositories/DashboardRepository";
import CompanyContext from "../database/context/CompanyContext";
import fs from "fs";
import path from "path";

const isDev = !app.isPackaged;
const systemRepo = new SystemRepository();
const dashRepo = new DashboardRepository();

export function registerSystemHandlers(mainWindow: BrowserWindow) {
  // --- AUTH ---
  ipcMain.handle("check-users-exist", async () => {
    return await systemRepo.checkUsersExist();
  });

  ipcMain.handle("register-user", async (_event, userData: any) => {
    try {
      await systemRepo.registerUser(userData);
      return { success: true };
    } catch (error: any) {
      if (error.code === "SQLITE_CONSTRAINT_UNIQUE") {
        return { success: false, error: "Este nome de usuário já existe." };
      }
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("login-attempt", async (_e, { username, password }) => {
    const user = await systemRepo.findByUsername(username);
    if (!user || !user.ativo)
      return { success: false, error: "Usuário inválido" };
    
    if (systemRepo.verifyPassword(password, user.salt, user.password_hash)) {
      // Definir contexto da empresa após login
      if (user.empresa_id) {
        CompanyContext.setCompany(user.empresa_id);
      } else {
        // Fallback redundante para segurança
        CompanyContext.setCompany("EMPRESA_LOCAL_001");
      }

      return {
        success: true,
        user: {
          id: user.id,
          nome: user.nome,
          username: user.username,
          cargo: user.cargo,
        },
      };
    }
    return { success: false, error: "Senha incorreta" };
  });

  ipcMain.handle("get-users", async () => {
    return await systemRepo.getUsers();
  });

  ipcMain.handle("delete-user", async (_e, id: number) => {
    await systemRepo.delete(id);
    return { success: true };
  });

  // --- CONFIG ---
  ipcMain.handle("get-config", async (_e, k: string) => {
    const configValue = await systemRepo.getConfig(k);
    if (!configValue) return null;

    if (k === "login_background" && configValue && (configValue.includes("/") || configValue.includes("\\"))) {
      try {
        if (fs.existsSync(configValue)) {
          const fileBuffer = fs.readFileSync(configValue);
          const ext = path.extname(configValue).replace(".", "");
          return `data:image/${ext};base64,${fileBuffer.toString("base64")}`;
        }
      } catch (err) {
        console.error("Erro ao ler fundo customizado:", err);
      }
    }
    return configValue;
  });

  ipcMain.handle("save-config", async (_e, k: string, v: any) => {
    try {
      await systemRepo.saveConfig(k, v);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("select-custom-background", async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
      properties: ["openFile"],
      filters: [{ name: "Imagens", extensions: ["jpg", "png", "jpeg", "webp"] }],
    });

    if (canceled || filePaths.length === 0) return null;

    const sourcePath = filePaths[0];
    const ext = path.extname(sourcePath);
    const destFileName = `custom_bg${ext}`;
    const destPath = path.join(app.getPath("userData"), destFileName);

    try {
      await fs.promises.copyFile(sourcePath, destPath);
      await systemRepo.saveConfig("login_background", destPath);

      const fileBuffer = await fs.promises.readFile(destPath);
      const base64 = fileBuffer.toString("base64");
      const extName = ext.replace(".", "");
      return {
        path: destPath,
        base64: `data:image/${extName};base64,${base64}`,
      };
    } catch (error) {
      console.error("Erro ao salvar fundo customizado:", error);
      return null;
    }
  });

  ipcMain.handle("get-login-backgrounds", async () => {
    return Array.from({ length: 10 }, (_, i) => `bg${i + 1}`);
  });

  // --- BACKUP ---
  ipcMain.handle("backup-database", async () => {
    const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
      defaultPath: `backup_${Date.now()}.sqlite3`,
    });
    if (canceled || !filePath) return { success: false };
    await fs.promises.copyFile(dbPath, filePath);
    return { success: true };
  });

  ipcMain.handle("restore-database", async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
      properties: ["openFile"],
      filters: [{ name: "Bancos de Dados SQLite", extensions: ["sqlite3"] }],
    });
    if (canceled || filePaths.length === 0) return { success: false };
    await fs.promises.copyFile(filePaths[0], dbPath);
    app.relaunch();
    app.exit(0);
  });

  // --- PRINTERS ---
  ipcMain.handle("get-printers", async () =>
    mainWindow.webContents.getPrintersAsync(),
  );

  // --- DASHBOARD ---
  ipcMain.handle("get-dashboard-stats", async () => {
    try {
      return await dashRepo.getDashboardStats();
    } catch (error) {
      console.error("Erro dashboard stats:", error);
      return { faturamento: 0, lucro: 0, vendasCount: 0, maoDeObra: 0, comissoes: 0 };
    }
  });

  ipcMain.handle("get-weekly-sales", async () => {
    try {
      return await dashRepo.getWeeklySales();
    } catch (error) {
      console.error("Erro weekly sales:", error);
      return { labels: [], data: [] };
    }
  });

  ipcMain.handle("get-low-stock", async () => {
    try {
      return await dashRepo.getLowStock();
    } catch (error) {
      console.error("Erro low stock:", error);
      return [];
    }
  });

  ipcMain.handle("get-inventory-stats", async () => {
    try {
      return await dashRepo.getInventoryStats();
    } catch (error) {
      console.error("Erro inventory stats:", error);
      return { custoTotal: 0, vendaPotencial: 0, lucroProjetado: 0, qtdZerados: 0, qtdBaixoEstoque: 0, totalItensFisicos: 0 };
    }
  });

  // --- VERSION & UPDATES ---
  ipcMain.handle("get-app-version", () => app.getVersion());

  ipcMain.handle("check-for-updates", () => {
    if (isDev) {
      if (mainWindow) mainWindow.webContents.send("update_not_available");
      return;
    }
    autoUpdater.checkForUpdates().catch((err) => {
      console.error("Erro no check-for-updates:", err);
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send("update_error", err.message);
      }
    });
  });

  ipcMain.handle("download-update", async () => {
    await autoUpdater.downloadUpdate();
    return { success: true };
  });

  ipcMain.handle("quit-and-install", () => autoUpdater.quitAndInstall());
}
