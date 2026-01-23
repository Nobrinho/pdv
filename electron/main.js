const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const { autoUpdater } = require("electron-updater");

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
    console.error(error);
    return [];
  }
});

ipcMain.handle("save-product", async (event, product) => {
  try {
    if (product.id) {
      // Histórico antes de atualizar
      const atual = await knex("produtos").where("id", product.id).first();
      await knex("produtos").where("id", product.id).update(product);

      // Log de histórico
      if (
        parseFloat(atual.preco_venda) !== parseFloat(product.preco_venda) ||
        parseInt(atual.estoque_atual) !== parseInt(product.estoque_atual)
      ) {
        await knex("historico_produtos").insert({
          produto_id: product.id,
          preco_antigo: atual.preco_venda,
          preco_novo: product.preco_venda,
          estoque_antigo: atual.estoque_atual,
          estoque_novo: product.estoque_atual,
          tipo_alteracao: "atualizacao",
          data_alteracao: Date.now(),
        });
      }
      return { id: product.id, success: true };
    } else {
      if (!product.codigo) product.codigo = "AUTO-" + Date.now();
      const [id] = await knex("produtos").insert({ ...product, ativo: true });

      await knex("historico_produtos").insert({
        produto_id: id,
        preco_novo: product.preco_venda,
        estoque_novo: product.estoque_atual,
        tipo_alteracao: "cadastro_inicial",
        data_alteracao: Date.now(),
      });
      return { id, success: true };
    }
  } catch (error) {
    if (error.code === "SQLITE_CONSTRAINT_UNIQUE")
      return { success: false, error: "Código já existe." };
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

ipcMain.handle("get-product-history", async () => {
  try {
    return await knex("historico_produtos")
      .join("produtos", "historico_produtos.produto_id", "produtos.id")
      .select("historico_produtos.*", "produtos.descricao", "produtos.codigo")
      .orderBy("historico_produtos.data_alteracao", "desc");
  } catch (error) {
    return [];
  }
});

// --- PESSOAS & CARGOS ---
ipcMain.handle("get-people", async () => {
  try {
    return await knex("pessoas")
      .leftJoin("cargos", "pessoas.cargo_id", "cargos.id")
      .where("pessoas.ativo", true)
      .select("pessoas.*", "cargos.nome as cargo_nome");
  } catch (error) {
    return [];
  }
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
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle("delete-person", async (event, id) => {
  try {
    await knex("pessoas").where("id", id).update({ ativo: false });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle("get-roles", async () => await knex("cargos").select("*"));
ipcMain.handle("save-role", async (e, nome) => {
  const [id] = await knex("cargos").insert({ nome });
  return { success: true, id };
});
ipcMain.handle("delete-role", async (e, id) => {
  await knex("cargos").where("id", id).del();
  return { success: true };
});

// --- VENDAS ---
ipcMain.handle("create-sale", async (event, saleData) => {
  const trx = await knex.transaction();
  try {
    // Definir forma de pagamento principal para o histórico antigo
    // Se tiver mais de um pagamento, grava como "Múltiplos"
    const formaPagamentoResumo =
      saleData.pagamentos.length > 1
        ? "Múltiplos"
        : saleData.pagamentos[0].metodo;

    // 1. Inserir a Venda
    const [saleId] = await trx("vendas").insert({
      vendedor_id: saleData.vendedor_id,
      trocador_id: null, // Removido fluxo de trocador nesta tela
      subtotal: saleData.subtotal,
      mao_de_obra: 0, // Removido
      acrescimo: saleData.acrescimo_valor || 0,
      desconto_valor: saleData.desconto_valor || 0,
      desconto_tipo: saleData.desconto_tipo || "percent",
      total_final: saleData.total_final,
      forma_pagamento: formaPagamentoResumo,
      data_venda: Date.now(),
    });

    // 2. Inserir os Itens
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
        await trx("produtos")
          .where("id", item.produto_id)
          .decrement("estoque_atual", item.quantidade);
      }
    }

    // 3. Inserir os Pagamentos (NOVO)
    const pagamentos = saleData.pagamentos.map((p) => ({
      venda_id: saleId,
      metodo: p.metodo,
      valor: p.valor,
      detalhes: p.detalhes || "",
    }));

    if (pagamentos.length > 0) {
      await trx("venda_pagamentos").insert(pagamentos);
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
        "trocador.nome as trocador_nome",
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
    const itens = await trx("venda_itens").where("venda_id", vendaId);
    for (const item of itens) {
      await trx("produtos")
        .where("id", item.produto_id)
        .increment("estoque_atual", item.quantidade);
    }
    await trx("vendas").where("id", vendaId).update({
      cancelada: true,
      motivo_cancelamento: motivo,
      data_cancelamento: Date.now(),
    });
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
  const [id] = await knex("servicos_avulsos").insert({
    ...data,
    data_servico: Date.now(),
  });
  return { success: true, id };
});

// --- DASHBOARD ---
ipcMain.handle("get-dashboard-stats", async () => {
  try {
    const now = new Date();
    const startOfDay = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    ).getTime();
    const endOfDay = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      23,
      59,
      59,
      999,
    ).getTime();

    const vendas = await knex("vendas")
      .whereBetween("data_venda", [startOfDay, endOfDay])
      .where("cancelada", 0);

    const servicos = await knex("servicos_avulsos").whereBetween(
      "data_servico",
      [startOfDay, endOfDay],
    );

    const config = await knex("configuracoes")
      .where("chave", "comissao_padrao")
      .first();
    const comissaoPadrao = config ? parseFloat(config.valor) : 0.3;
    const pessoas = await knex("pessoas").select("*");

    const vendaIds = vendas.map((v) => v.id);
    const itens =
      vendaIds.length > 0
        ? await knex("venda_itens").whereIn("venda_id", vendaIds)
        : [];

    let totalFaturamento = 0;
    let totalCustoProdutos = 0;
    let totalMaoDeObra = 0; // Agora é CUSTO
    let totalComissoes = 0;

    // Cálculos
    vendas.forEach((venda) => {
      // 1. Faturamento Real: (Total Final - Mão de Obra).
      // O Total Final no banco inclui a MO, então precisamos subtrair para saber quanto entrou de PEÇA.
      const faturamentoVenda = venda.total_final - (venda.mao_de_obra || 0);
      totalFaturamento += faturamentoVenda;

      // 2. Mão de Obra (Despesa)
      if (venda.mao_de_obra) totalMaoDeObra += venda.mao_de_obra;

      // 3. Comissões
      const vendedor = pessoas.find((p) => p.id === venda.vendedor_id);
      const taxa =
        vendedor && vendedor.comissao_fixa
          ? vendedor.comissao_fixa / 100
          : comissaoPadrao;

      let desconto = 0;
      if (venda.desconto_tipo === "fixed") desconto = venda.desconto_valor;
      else desconto = (venda.subtotal * venda.desconto_valor) / 100;

      // A receita de produtos já desconta o desconto dado na venda
      const receitaProdutos = venda.subtotal - desconto;

      if (receitaProdutos > 0) {
        totalComissoes += receitaProdutos * taxa;
      }

      // 4. Custo das Peças
      const itensVenda = itens.filter((i) => i.venda_id === venda.id);
      const custoVenda = itensVenda.reduce(
        (acc, item) => acc + item.custo_unitario * item.quantidade,
        0,
      );
      totalCustoProdutos += custoVenda;
    });

    // Serviços Avulsos também são DESPESA agora (a loja paga o serviço)
    servicos.forEach((s) => {
      totalMaoDeObra += s.valor;
    });

    // LUCRO = (Dinheiro que entrou das peças) - (Custo das peças + O que pagou de Mão de Obra + Comissões)
    const lucro =
      totalFaturamento - (totalCustoProdutos + totalMaoDeObra + totalComissoes);

    return {
      faturamento: totalFaturamento,
      lucro: lucro,
      vendasCount: vendas.length,
      maoDeObra: totalMaoDeObra, // Enviamos para mostrar no card de "Despesas com MO"
      comissoes: totalComissoes,
    };
  } catch (error) {
    console.error(error);
    return {
      faturamento: 0,
      lucro: 0,
      vendasCount: 0,
      maoDeObra: 0,
      comissoes: 0,
    };
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

    // Soma apenas o valor dos produtos (Total Final - Mão de Obra)
    const vendas = await knex("vendas")
      .whereBetween("data_venda", [d.getTime(), nextD.getTime()])
      .where("cancelada", 0)
      .sum({ total: knex.raw("total_final - mao_de_obra") }); // <--- CORREÇÃO AQUI

    // Não somamos serviços avulsos ao gráfico de vendas pois agora são despesa

    labels.push(d.toLocaleDateString("pt-BR", { weekday: "short" }));
    data.push(vendas[0].total || 0);
  }
  return { labels, data };
});

ipcMain.handle("get-low-stock", async () => {
  return await knex("produtos")
    .where("estoque_atual", "<=", 5)
    .where("ativo", true)
    .limit(10);
});

// --- AUTH, USER, CONFIG, BACKUP, PRINT, UPDATE ---

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto
    .pbkdf2Sync(password, salt, 1000, 64, "sha512")
    .toString("hex");
  return { salt, hash };
}
function verifyPassword(password, salt, storedHash) {
  const hash = crypto
    .pbkdf2Sync(password, salt, 1000, 64, "sha512")
    .toString("hex");
  return hash === storedHash;
}

ipcMain.handle(
  "check-users-exist",
  async () => (await knex("usuarios").count("id as total").first()).total > 0,
);
ipcMain.handle("register-user", async (event, userData) => {
  try {
    const { salt, hash } = hashPassword(userData.password);

    // CORREÇÃO: Não usamos mais spread operator ({...userData})
    // Definimos manualmente os campos para evitar enviar 'password' crua
    await knex("usuarios").insert({
      nome: userData.nome,
      username: userData.username,
      password_hash: hash, // Salva o hash
      salt: salt, // Salva o sal
      cargo: userData.cargo || "admin",
      ativo: true,
    });

    return { success: true };
  } catch (error) {
    console.error("Erro ao registrar usuário:", error);

    // Tratamento para usuário duplicado
    if (error.code === "SQLITE_CONSTRAINT_UNIQUE") {
      return { success: false, error: "Este nome de usuário já existe." };
    }

    return { success: false, error: error.message };
  }
});
ipcMain.handle("login-attempt", async (e, { username, password }) => {
  const user = await knex("usuarios").where("username", username).first();
  if (!user || !user.ativo)
    return { success: false, error: "Usuário inválido" };
  if (verifyPassword(password, user.salt, user.password_hash))
    return {
      success: true,
      user: {
        id: user.id,
        nome: user.nome,
        username: user.username,
        cargo: user.cargo,
      },
    };
  return { success: false, error: "Senha incorreta" };
});
ipcMain.handle(
  "get-users",
  async () => await knex("usuarios").select("id", "nome", "username", "cargo"),
);
ipcMain.handle("delete-user", async (e, id) => {
  await knex("usuarios").where("id", id).del();
  return { success: true };
});

ipcMain.handle(
  "get-config",
  async (e, k) =>
    (await knex("configuracoes").where("chave", k).first())?.valor,
);
ipcMain.handle("save-config", async (e, k, v) => {
  const ex = await knex("configuracoes").where("chave", k).first();
  ex
    ? await knex("configuracoes").where("chave", k).update({ valor: v })
    : await knex("configuracoes").insert({ chave: k, valor: v });
  return { success: true };
});

ipcMain.handle("backup-database", async () => {
  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
    defaultPath: `backup_${Date.now()}.sqlite3`,
  });
  if (canceled) return { success: false };
  await fs.promises.copyFile(dbPath, filePath);
  return { success: true };
});
ipcMain.handle("restore-database", async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    properties: ["openFile"],
    filters: [{ extensions: ["sqlite3"] }],
  });
  if (canceled) return { success: false };
  await fs.promises.copyFile(filePaths[0], dbPath);
  app.relaunch();
  app.exit(0);
});

ipcMain.handle("get-printers", async () =>
  mainWindow.webContents.getPrintersAsync(),
);
// 2. Imprimir Silenciosamente (VERSÃO DE DIAGNÓSTICO E CORREÇÃO)
ipcMain.handle("print-silent", async (event, contentHtml, printerName) => {
  console.log(`🖨️ Tentando imprimir: "${printerName}"`);

  // Verifica se a impressora existe (se nome for fornecido)
  if (printerName && printerName !== "Padrão do Windows") {
    const printers = await mainWindow.webContents.getPrintersAsync();
    const exists = printers.find((p) => p.name === printerName);
    if (!exists) return { success: false, error: "Impressora não encontrada." };
  }

  let printWindow = new BrowserWindow({
    show: false,
    width: 300, // Largura padrão 80mm
    height: 600,
    webPreferences: { nodeIntegration: false },
  });

  // CSS "Força Bruta" para garantir legibilidade em térmicas ruins
  const fullHtml = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
        <meta charset="UTF-8">
        <style>
            @page { margin: 0; size: auto; }
            * {
                box-sizing: border-box;
                color: #000 !important; /* Força preto absoluto */
                text-shadow: 0 0 0 #000; /* Engrossa a fonte artificialmente */
            }
            body {
                font-family: 'Courier New', Courier, monospace; /* Monospace é melhor para alinhar */
                font-size: 13px; /* Fonte um pouco maior */
                font-weight: 700; /* Negrito em tudo */
                margin: 0;
                padding: 5px;
                width: 280px;
                background-color: #fff;
            }
            /* Classes de utilidade mapeadas do Tailwind para CSS puro */
            .flex { display: flex; }
            .justify-between { justify-content: space-between; }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .font-bold { font-weight: 900; } /* Mais negrito */
            .border-b { border-bottom: 2px dashed #000; padding-bottom: 5px; margin-bottom: 5px; }
            .border-t { border-top: 2px dashed #000; padding-top: 5px; margin-top: 5px; }
            .mb-2 { margin-bottom: 5px; }
            .mb-4 { margin-bottom: 10px; }
            .mt-2 { margin-top: 5px; }
            .mt-4 { margin-top: 10px; }
            .uppercase { text-transform: uppercase; }
            .text-xs { font-size: 11px; }
            .text-sm { font-size: 13px; }
            table { width: 100%; border-collapse: collapse; }
            td, th { padding: 2px 0; vertical-align: top; }
        </style>
    </head>
    <body>
        ${contentHtml}
    </body>
    </html>
  `;

  try {
    await printWindow.loadURL(
      `data:text/html;charset=utf-8,${encodeURIComponent(fullHtml)}`,
    );

    // Pequeno delay para renderizar
    await new Promise((r) => setTimeout(r, 500));

    const options = {
      silent: true,
      printBackground: false, // Em térmicas, fundo geralmente atrapalha
      color: false, // Força P&B
      margins: { marginType: "none" },
      landscape: false,
      scaleFactor: 100,
      copies: 1,
    };

    if (printerName && printerName !== "Padrão do Windows") {
      options.deviceName = printerName;
    }

    await printWindow.webContents.print(options);

    // Espera o spooler pegar antes de matar a janela
    setTimeout(() => {
      if (!printWindow.isDestroyed()) printWindow.close();
    }, 2000);

    return { success: true };
  } catch (error) {
    console.error("Erro print:", error);
    if (!printWindow.isDestroyed()) printWindow.close();
    return { success: false, error: error.message };
  }
});
ipcMain.handle("get-app-version", () => app.getVersion());

// Auto Update
ipcMain.handle("check-for-updates", () => {
  if (!isDev) autoUpdater.checkForUpdates();
});
ipcMain.handle("download-update", async () => {
  await autoUpdater.downloadUpdate();
  return { success: true };
});
ipcMain.handle("quit-and-install", () => autoUpdater.quitAndInstall());
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

// --- ESTATÍSTICAS DE ESTOQUE (NOVO) ---
ipcMain.handle("get-inventory-stats", async () => {
  try {
    // Busca todos os produtos ativos
    const produtos = await knex("produtos")
      .where("ativo", true)
      .select("custo", "preco_venda", "estoque_atual");

    let custoTotal = 0;
    let vendaPotencial = 0;
    let qtdZerados = 0;
    let qtdBaixoEstoque = 0; // <= 5 unidades
    let totalItensFisicos = 0;

    produtos.forEach((p) => {
      const qtd = p.estoque_atual || 0;
      const custo = p.custo || 0;
      const venda = p.preco_venda || 0;

      if (qtd <= 0) qtdZerados++;
      if (qtd > 0 && qtd <= 5) qtdBaixoEstoque++;

      totalItensFisicos += qtd;
      custoTotal += custo * qtd;
      vendaPotencial += venda * qtd;
    });

    return {
      custoTotal,
      vendaPotencial,
      lucroProjetado: vendaPotencial - custoTotal,
      qtdZerados,
      qtdBaixoEstoque,
      totalItensFisicos,
    };
  } catch (error) {
    console.error("Erro inventory stats:", error);
    return {
      custoTotal: 0,
      vendaPotencial: 0,
      lucroProjetado: 0,
      qtdZerados: 0,
      qtdBaixoEstoque: 0,
      totalItensFisicos: 0,
    };
  }
});
