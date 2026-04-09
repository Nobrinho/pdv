const { app, BrowserWindow, ipcMain, shell } = require("electron");
const path = require("path");
const { knex, dbPath, isDev } = require("./lib/db");
const { safeHandle } = require("./lib/safeHandle");
const { initTurso, syncData, getSyncStatus, setOnSyncChange, reinitTurso } = require("./lib/turso");
const { getCloudConfig, saveCloudConfig } = require("./lib/cloudConfig");

let mainWindow;
let splashWindow;

// 1. Janela Splash (Instantânea e leve)
function createSplashWindow() {
  splashWindow = new BrowserWindow({
    width: 450,
    height: 350,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    center: true,
    show: true,
    backgroundColor: "#0f172a",
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  splashWindow.loadFile(path.join(__dirname, "splash.html"));
}

// 2. Inicialização do Banco (com Log para o terminal)
async function initDb() {
  try {
    console.log("🚀 Iniciando Bootstrap do Sistema...");
    await knex.migrate.latest();
    console.log("✅ Migrações concluídas.");

    const config = getCloudConfig();
    initTurso(dbPath, config);
    
    setOnSyncChange((status) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send("sync-event", status);
      }
    });

    await syncData();
    console.log("✅ Sincronização e Banco prontos.");
    return true;
  } catch (err) {
    console.error("❌ Erro crítico no banco de dados:", err);
    return false;
  }
}

// 3. Janela Principal (Criada em 'background')
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    show: false, // Oculta para não mostrar tela branca
    autoHideMenuBar: true,
    backgroundColor: "#0f172a", // Cor de fundo para evitar flash
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  if (isDev) {
    mainWindow.loadURL("http://localhost:5173");
  } else {
    mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  }

  // EVENTO CHAVE: Só mostramos o app quando o React estiver pronto
  mainWindow.once("ready-to-show", () => {
    if (splashWindow && !splashWindow.isDestroyed()) {
      splashWindow.close();
    }
    mainWindow.maximize();
    mainWindow.show();
    mainWindow.focus();
    
    // Abre DevTools em Dev apenas após o show
    if (isDev) mainWindow.webContents.openDevTools();
  });

  mainWindow.on("closed", () => (mainWindow = null));
}

// 4. Registro de Handlers IPC
function registerIpcHandlers() {
  safeHandle("get-sync-status", async () => getSyncStatus());
  safeHandle("force-sync", async () => await syncData());
  safeHandle("get-cloud-config", async () => getCloudConfig());
  safeHandle("save-cloud-config", async (event, config) => {
    const result = saveCloudConfig(config);
    if (result.success) return await reinitTurso(dbPath, config);
    return result;
  });
}

// 5. Ciclo de Vida do App
app.whenReady().then(async () => {
  createSplashWindow(); // Primeiro passo: Mostrar splash agora!
  
  registerIpcHandlers();
  
  // Rodar inicialização do banco
  const dbSuccess = await initDb();
  
  if (dbSuccess) {
    createWindow(); // Cria janela, mas ela fica em background
    
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
  } else {
    // Se falhar, você pode mostrar um erro na splash ou logar
    console.error("O sistema não pôde ser iniciado devido a erros no banco.");
  }

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
