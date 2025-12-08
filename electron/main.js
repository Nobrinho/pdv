const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const knexConfig = require('../database/knexfile');
const knex = require('knex')(knexConfig.development); // Use 'production' para builds finais

let mainWindow;

// Função para inicializar o Banco de Dados
async function initDb() {
  try {
    // Roda as migrações (cria tabelas se não existirem)
    await knex.migrate.latest();
    console.log('✅ Banco de dados inicializado com sucesso.');
  } catch (err) {
    console.error('❌ Erro ao inicializar banco de dados:', err);
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false, // Segurança: impede que o site acesse o Node diretamente
      contextIsolation: true  // Segurança: isola o contexto do preload
    }
  });

  const isDev = process.env.NODE_ENV !== 'production';

  if (isDev) {
    // Em desenvolvimento, carrega o servidor do Vite (hot-reload)
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools(); // Abre o console de desenvolvedor
  } else {
    // Em produção, carrega o arquivo buildado
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

// Inicialização do App
app.whenReady().then(() => {
  initDb();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// ---------------------------------------------------------
// 🔌 API DO BANCO DE DADOS (IPC Handlers)
// ---------------------------------------------------------

// --- PRODUTOS ---
ipcMain.handle('get-products', async () => {
    try {
        return await knex('produtos').select('*');
    } catch (error) {
        console.error("Erro ao buscar produtos:", error);
        return [];
    }
});

ipcMain.handle('save-product', async (event, product) => {
    try {
        if (product.id) {
            // Atualizar existente
            await knex('produtos').where('id', product.id).update(product);
            return { id: product.id, success: true };
        } else {
            // Criar novo
            const [id] = await knex('produtos').insert(product);
            return { id, success: true };
        }
    } catch (error) {
        console.error("Erro ao salvar produto:", error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('delete-product', async (event, id) => {
    try {
        await knex('produtos').where('id', id).del();
        return { success: true };
    } catch (error) {
        console.error("Erro ao deletar produto:", error);
        return { success: false, error: error.message };
    }
});

// --- PESSOAS (Vendedores/Trocadores) ---
ipcMain.handle('get-people', async () => {
    try {
        // Traz também o nome do cargo fazendo um JOIN com a tabela cargos
        return await knex('pessoas')
            .leftJoin('cargos', 'pessoas.cargo_id', 'cargos.id')
            .select('pessoas.*', 'cargos.nome as cargo_nome');
    } catch (error) {
        console.error("Erro ao buscar pessoas:", error);
        return [];
    }
});

ipcMain.handle('save-person', async (event, person) => {
    try {
        if (person.id) {
            await knex('pessoas').where('id', person.id).update(person);
            return { id: person.id, success: true };
        } else {
            const [id] = await knex('pessoas').insert(person);
            return { id, success: true };
        }
    } catch (error) {
        console.error("Erro ao salvar pessoa:", error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('delete-person', async (event, id) => {
    try {
        await knex('pessoas').where('id', id).del();
        return { success: true };
    } catch (error) {
        console.error("Erro ao deletar pessoa:", error);
        return { success: false, error: error.message };
    }
});

// --- CARGOS ---
ipcMain.handle('get-roles', async () => {
    try {
        return await knex('cargos').select('*');
    } catch (error) {
        console.error("Erro ao buscar cargos:", error);
        return [];
    }
});