const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const { autoUpdater } = require('electron-updater');

// Configuração de Ambiente
// MUDANÇA IMPORTANTE: Usar app.isPackaged é mais seguro para detectar produção
const isDev = !app.isPackaged;
let dbPath;

if (isDev) {
  dbPath = path.join(__dirname, "../syscontrol.sqlite3");
} else {
  const userDataPath = app.getPath("userData");
  dbPath = path.join(userDataPath, "syscontrol.sqlite3");
}

const knex = require("knex")({
  client: "better-sqlite3",
  connection: {
    filename: dbPath,
  },
  useNullAsDefault: true,
  migrations: {
    directory: isDev
      ? path.join(__dirname, "../database/migrations")
      : path.join(process.resourcesPath, "database", "migrations"),
  },
});

// Configuração do AutoUpdater
autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = true;

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
    // autoHideMenuBar: true, // Opcional
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  if (isDev) {
    mainWindow.loadURL("http://localhost:5173");
    // mainWindow.webContents.openDevTools(); 
  } else {
    mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  }
}

app.whenReady().then(() => {
  initDb();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

// ==========================================
// 🔌 API (IPC Handlers)
// ==========================================

// --- PRODUTOS ---
ipcMain.handle("get-products", async () => {
  try {
    return await knex("produtos").where("ativo", true).select("*");
  } catch (error) {
    console.error(error); return [];
  }
});

ipcMain.handle("save-product", async (event, product) => {
  try {
    if (product.id) {
        // Histórico antes de atualizar
        const atual = await knex('produtos').where('id', product.id).first();
        await knex("produtos").where("id", product.id).update(product);
        
        // Log de histórico
        if (parseFloat(atual.preco_venda) !== parseFloat(product.preco_venda) || parseInt(atual.estoque_atual) !== parseInt(product.estoque_atual)) {
            await knex('historico_produtos').insert({
                produto_id: product.id,
                preco_antigo: atual.preco_venda,
                preco_novo: product.preco_venda,
                estoque_antigo: atual.estoque_atual,
                estoque_novo: product.estoque_atual,
                tipo_alteracao: 'atualizacao',
                data_alteracao: Date.now()
            });
        }
        return { id: product.id, success: true };
    } else {
      if (!product.codigo) product.codigo = 'AUTO-' + Date.now();
      const [id] = await knex("produtos").insert({ ...product, ativo: true });
      
      await knex('historico_produtos').insert({
          produto_id: id,
          preco_novo: product.preco_venda,
          estoque_novo: product.estoque_atual,
          tipo_alteracao: 'cadastro_inicial',
          data_alteracao: Date.now()
      });
      return { id, success: true };
    }
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') return { success: false, error: "Código já existe." };
    return { success: false, error: error.message };
  }
});

ipcMain.handle("delete-product", async (event, id) => {
  try {
    // Soft delete
    await knex("produtos").where("id", id).update({ ativo: false });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-product-history', async () => {
    try {
        return await knex('historico_produtos')
            .join('produtos', 'historico_produtos.produto_id', 'produtos.id')
            .select('historico_produtos.*', 'produtos.descricao', 'produtos.codigo')
            .orderBy('historico_produtos.data_alteracao', 'desc');
    } catch (error) { return []; }
});

// --- PESSOAS & CARGOS ---
ipcMain.handle("get-people", async () => {
  try {
    return await knex("pessoas")
      .leftJoin("cargos", "pessoas.cargo_id", "cargos.id")
      .where("pessoas.ativo", true)
      .select("pessoas.*", "cargos.nome as cargo_nome");
  } catch (error) { return []; }
});

ipcMain.handle("save-person", async (event, person) => {
  try {
    if (person.id) {
      await knex("pessoas").where("id", person.id).update(person);
      return { id: person.id, success: true };
    } else {
      const [id] = await knex("pessoas").insert({ ...person, ativo: true });
      return { id, success: true };
    }
  } catch (error) { return { success: false, error: error.message }; }
});

ipcMain.handle("delete-person", async (event, id) => {
  try {
    await knex("pessoas").where("id", id).update({ ativo: false });
    return { success: true };
  } catch (error) { return { success: false, error: error.message }; }
});

ipcMain.handle("get-roles", async () => await knex("cargos").select("*"));
ipcMain.handle("save-role", async (e, nome) => { const [id] = await knex("cargos").insert({ nome }); return { success: true, id }; });
ipcMain.handle("delete-role", async (e, id) => { await knex("cargos").where("id", id).del(); return { success: true }; });

// --- VENDAS ---
ipcMain.handle("create-sale", async (event, saleData) => {
  const trx = await knex.transaction();
  try {
    const [saleId] = await trx("vendas").insert({
      vendedor_id: saleData.vendedor_id,
      trocador_id: saleData.trocador_id || null,
      subtotal: saleData.subtotal,
      mao_de_obra: saleData.mao_de_obra,
      acrescimo: saleData.acrescimo_valor || 0,
      desconto_valor: saleData.desconto_valor || 0,
      desconto_tipo: saleData.desconto_tipo || "percent",
      total_final: saleData.total_final,
      forma_pagamento: saleData.forma_pagamento,
      data_venda: Date.now(),
    });

    const items = saleData.itens.map((item) => ({
      venda_id: saleId,
      produto_id: item.id,
      quantidade: item.qty,
      preco_unitario: item.preco_venda,
      custo_unitario: item.custo,
    }));

    if (items.length > 0) {
      await trx("venda_itens").insert(items);
      for (const item of items) {
        await trx("produtos").where("id", item.produto_id).decrement("estoque_atual", item.quantidade);
      }
    }
    await trx.commit();
    return { success: true, id: saleId };
  } catch (error) {
    await trx.rollback();
    return { success: false, error: error.message };
  }
});

ipcMain.handle("get-sales", async () => {
    try {
        // 1. Busca as vendas
        const vendas = await knex("vendas")
          .leftJoin("pessoas as vendedor", "vendas.vendedor_id", "vendedor.id")
          .leftJoin("pessoas as trocador", "vendas.trocador_id", "trocador.id")
          .select(
            "vendas.*",
            "vendedor.nome as vendedor_nome",
            "trocador.nome as trocador_nome"
          )
          .orderBy("data_venda", "desc");
    
        // 2. Busca o custo real somado dos itens de cada venda
        const custos = await knex("venda_itens")
          .select("venda_id")
          .sum({ total: knex.raw("custo_unitario * quantidade") })
          .groupBy("venda_id");
    
        // 3. Mescla o custo real na lista de vendas
        const vendasComCusto = vendas.map((venda) => {
          const custoItem = custos.find((c) => c.venda_id === venda.id);
          return {
            ...venda,
            custo_total_real: custoItem ? custoItem.total : 0,
          };
        });
    
        return vendasComCusto;
      } catch (error) {
        console.error("Erro get-sales:", error);
        return [];
      }
});

ipcMain.handle("get-sale-items", async (e, id) => {
    return await knex("venda_itens")
      .join("produtos", "venda_itens.produto_id", "produtos.id")
      .where("venda_id", id)
      .select("venda_itens.*", "produtos.descricao", "produtos.codigo");
});

ipcMain.handle("cancel-sale", async (event, { vendaId, motivo }) => {
    const trx = await knex.transaction();
    try {
        const itens = await trx('venda_itens').where('venda_id', vendaId);
        for (const item of itens) {
            await trx('produtos').where('id', item.produto_id).increment('estoque_atual', item.quantidade);
        }
        await trx('vendas').where('id', vendaId).update({ cancelada: true, motivo_cancelamento: motivo, data_cancelamento: Date.now() });
        await trx.commit();
        return { success: true };
    } catch (error) {
        await trx.rollback();
        return { success: false, error: error.message };
    }
});

// --- SERVIÇOS ---
ipcMain.handle("get-services", async () => {
    return await knex("servicos_avulsos")
      .leftJoin("pessoas", "servicos_avulsos.trocador_id", "pessoas.id")
      .select("servicos_avulsos.*", "pessoas.nome as trocador_nome")
      .orderBy("data_servico", "desc");
});

ipcMain.handle("create-service", async (e, data) => {
    const [id] = await knex("servicos_avulsos").insert({ ...data, data_servico: Date.now() });
    return { success: true, id };
});

// --- DASHBOARD (CORRIGIDO) ---
ipcMain.handle("get-dashboard-stats", async () => {
  try {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).getTime();

    // 1. Vendas de Hoje (IGNORA CANCELADAS)
    const vendas = await knex("vendas")
        .whereBetween("data_venda", [startOfDay, endOfDay])
        .where('cancelada', 0);

    // 2. Serviços de Hoje
    const servicos = await knex("servicos_avulsos").whereBetween("data_servico", [startOfDay, endOfDay]);

    const config = await knex("configuracoes").where("chave", "comissao_padrao").first();
    const comissaoPadrao = config ? parseFloat(config.valor) : 0.3;
    const pessoas = await knex("pessoas").select("*");

    const vendaIds = vendas.map((v) => v.id);
    const itens = vendaIds.length > 0 ? await knex("venda_itens").whereIn("venda_id", vendaIds) : [];

    let totalFaturamento = 0;
    let totalMaoDeObra = 0;
    let totalComissoes = 0;
    let totalCustoProdutos = 0; // <--- VARIÁVEL DECLARADA AQUI (A Correção)

    // Cálculos
    vendas.forEach((venda) => {
      totalFaturamento += venda.total_final;
      if (venda.mao_de_obra) totalMaoDeObra += venda.mao_de_obra;

      // Comissão
      const vendedor = pessoas.find((p) => p.id === venda.vendedor_id);
      const taxa = vendedor && vendedor.comissao_fixa ? vendedor.comissao_fixa / 100 : comissaoPadrao;
      
      const itensVenda = itens.filter((i) => i.venda_id === venda.id);
      const custoVenda = itensVenda.reduce((acc, item) => acc + item.custo_unitario * item.quantidade, 0);
      
      // Soma ao total de custos
      totalCustoProdutos += custoVenda;
      
      let desconto = 0;
      if (venda.desconto_tipo === 'fixed') desconto = venda.desconto_valor;
      else desconto = (venda.subtotal * venda.desconto_valor) / 100;

      const receitaProdutos = venda.subtotal - desconto;

      if (receitaProdutos > 0) {
        totalComissoes += receitaProdutos * taxa;
      }
    });

    servicos.forEach((s) => {
        totalFaturamento += s.valor;
        totalMaoDeObra += s.valor;
    });

    const lucro = totalFaturamento - totalCustoProdutos - totalComissoes; 

    return {
      faturamento: totalFaturamento,
      lucro: lucro,
      vendasCount: vendas.length,
      maoDeObra: totalMaoDeObra,
      comissoes: totalComissoes,
    };
  } catch (error) {
    console.error(error);
    return { faturamento: 0, lucro: 0, vendasCount: 0, maoDeObra: 0, comissoes: 0 };
  }
});

ipcMain.handle("get-weekly-sales", async () => {
    const labels = [];
    const data = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        d.setHours(0, 0, 0, 0);
        const nextD = new Date(d);
        nextD.setDate(d.getDate() + 1);

        const vendas = await knex("vendas")
            .whereBetween("data_venda", [d.getTime(), nextD.getTime()])
            .where('cancelada', 0)
            .sum("total_final as total");
            
        const servicos = await knex("servicos_avulsos")
            .whereBetween("data_servico", [d.getTime(), nextD.getTime()])
            .sum("valor as total");

        labels.push(d.toLocaleDateString("pt-BR", { weekday: "short" }));
        data.push((vendas[0].total || 0) + (servicos[0].total || 0));
    }
    return { labels, data };
});

ipcMain.handle("get-low-stock", async () => {
    return await knex("produtos").where("estoque_atual", "<=", 5).where("ativo", true).limit(10);
});

// --- AUTH, USER, CONFIG, BACKUP, PRINT, UPDATE ---

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
  return { salt, hash };
}
function verifyPassword(password, salt, storedHash) {
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
  return hash === storedHash;
}

ipcMain.handle("check-users-exist", async () => (await knex("usuarios").count("id as total").first()).total > 0);
ipcMain.handle("register-user", async (e, d) => { const { salt, hash } = hashPassword(d.password); await knex("usuarios").insert({ ...d, password_hash: hash, salt }); return { success: true }; });
ipcMain.handle("login-attempt", async (e, { username, password }) => {
    const user = await knex("usuarios").where("username", username).first();
    if (!user || !user.ativo) return { success: false, error: "Usuário inválido" };
    if (verifyPassword(password, user.salt, user.password_hash)) return { success: true, user: { id: user.id, nome: user.nome, username: user.username, cargo: user.cargo } };
    return { success: false, error: "Senha incorreta" };
});
ipcMain.handle("get-users", async () => await knex("usuarios").select("id", "nome", "username", "cargo"));
ipcMain.handle("delete-user", async (e, id) => { await knex("usuarios").where("id", id).del(); return { success: true }; });

ipcMain.handle("get-config", async (e, k) => (await knex("configuracoes").where("chave", k).first())?.valor);
ipcMain.handle("save-config", async (e, k, v) => {
    const ex = await knex("configuracoes").where("chave", k).first();
    ex ? await knex("configuracoes").where("chave", k).update({ valor: v }) : await knex("configuracoes").insert({ chave: k, valor: v });
    return { success: true };
});

ipcMain.handle("backup-database", async () => {
    const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, { defaultPath: `backup_${Date.now()}.sqlite3` });
    if (canceled) return { success: false };
    await fs.promises.copyFile(dbPath, filePath);
    return { success: true };
});
ipcMain.handle("restore-database", async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, { properties: ['openFile'], filters: [{ extensions: ['sqlite3'] }] });
    if (canceled) return { success: false };
    await fs.promises.copyFile(filePaths[0], dbPath);
    app.relaunch(); app.exit(0);
});

ipcMain.handle("get-printers", async () => mainWindow.webContents.getPrintersAsync());
ipcMain.handle("print-silent", async (e, html, printer) => {
    let win = new BrowserWindow({ show: false });
    await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
    const options = { silent: true, printBackground: false, deviceName: printer || undefined };
    await win.webContents.print(options);
    win.close();
    return { success: true };
});

ipcMain.handle("get-app-version", () => app.getVersion());

// Auto Update
ipcMain.handle('check-for-updates', () => { if (!isDev) autoUpdater.checkForUpdates(); });
ipcMain.handle('download-update', async () => { await autoUpdater.downloadUpdate(); return { success: true }; });
ipcMain.handle('quit-and-install', () => autoUpdater.quitAndInstall());
autoUpdater.on('update-available', (info) => mainWindow.webContents.send('update_available', info.version));
autoUpdater.on('download-progress', (p) => mainWindow.webContents.send('update_progress', p.percent));
autoUpdater.on('update-downloaded', () => mainWindow.webContents.send('update_downloaded'));
autoUpdater.on('error', (err) => mainWindow.webContents.send('update_error', err.message));