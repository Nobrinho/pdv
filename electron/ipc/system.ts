import { ipcMain, app, dialog, BrowserWindow } from "electron";
import { autoUpdater } from "electron-updater";
import { knex, dbPath } from "../database/knex";
import fs from "fs";
import path from "path";
import nodeCrypto from "crypto";

const isDev = !app.isPackaged;
let updateCheckTimer: NodeJS.Timeout | undefined;

function hashPassword(password: string) {
  const salt = nodeCrypto.randomBytes(16).toString("hex");
  const hash = nodeCrypto
    .pbkdf2Sync(password, salt, 1000, 64, "sha512")
    .toString("hex");
  return { salt, hash };
}

function verifyPassword(password: string, salt: string, storedHash: string) {
  const hash = nodeCrypto
    .pbkdf2Sync(password, salt, 1000, 64, "sha512")
    .toString("hex");
  return hash === storedHash;
}

export function registerSystemHandlers(mainWindow: BrowserWindow) {
  // --- AUTH ---
  ipcMain.handle(
    "check-users-exist",
    async () => (await (knex("usuarios").count("id as total").first() as any)).total > 0,
  );

  ipcMain.handle("register-user", async (_event, userData: any) => {
    try {
      const { salt, hash } = hashPassword(userData.password);
      await knex("usuarios").insert({
        nome: userData.nome,
        username: userData.username,
        password_hash: hash,
        salt: salt,
        cargo: userData.cargo || "admin",
        ativo: true,
      });
      return { success: true };
    } catch (error: any) {
      if (error.code === "SQLITE_CONSTRAINT_UNIQUE") {
        return { success: false, error: "Este nome de usuário já existe." };
      }
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("login-attempt", async (_e, { username, password }) => {
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

  ipcMain.handle("delete-user", async (_e, id: number) => {
    await knex("usuarios").where("id", id).del();
    return { success: true };
  });

  // --- CONFIG ---
  ipcMain.handle(
    "get-config",
    async (_e, k: string) => {
      const config = await knex("configuracoes").where("chave", k).first();
      if (!config) return null;

      // Se for o fundo de login e for uma imagem externa/customizada
      if (k === "login_background" && config.valor && (config.valor.includes("/") || config.valor.includes("\\"))) {
        try {
          if (fs.existsSync(config.valor)) {
            const fileBuffer = fs.readFileSync(config.valor);
            const ext = path.extname(config.valor).replace(".", "");
            return `data:image/${ext};base64,${fileBuffer.toString("base64")}`;
          }
        } catch (err) {
          console.error("Erro ao ler fundo customizado:", err);
        }
      }
      
      return config.valor;
    }
  );

  ipcMain.handle("save-config", async (_e, k: string, v: any) => {
    const ex = await knex("configuracoes").where("chave", k).first();
    ex
      ? await knex("configuracoes").where("chave", k).update({ valor: v })
      : await knex("configuracoes").insert({ chave: k, valor: v });
    return { success: true };
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
      
      await knex("configuracoes")
        .where("chave", "login_background")
        .delete();
        
      await knex("configuracoes").insert({
        chave: "login_background",
        valor: destPath,
      });

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
        .where("data_venda", ">=", new Date(startOfDay))
        .where("data_venda", "<=", new Date(endOfDay))
        .where("cancelada", 0);

      const servicos = await knex("servicos_avulsos")
        .where("data_servico", ">=", new Date(startOfDay))
        .where("data_servico", "<=", new Date(endOfDay));

      const configPadrao = await knex("configuracoes")
        .where("chave", "comissao_padrao")
        .first();
      const configUsados = await knex("configuracoes")
        .where("chave", "comissao_usados")
        .first();
      const comissaoPadrao = configPadrao ? parseFloat(configPadrao.valor) : 0.3;
      const comissaoUsados = configUsados ? parseFloat(configUsados.valor) : 0.25;

      const pessoas = await knex("pessoas").select("*");

      const vendaIds = vendas.map((v) => v.id);
      const itens =
        vendaIds.length > 0
          ? await knex("venda_itens")
              .leftJoin("produtos", "venda_itens.produto_id", "produtos.id")
              .whereIn("venda_id", vendaIds)
              .select("venda_itens.*", "produtos.tipo")
          : [];

      let totalFaturamento = 0;
      let totalMaoDeObra = 0;
      let totalComissoes = 0;
      let totalCustoProdutos = 0;

      vendas.forEach((venda) => {
        totalFaturamento += venda.total_final - (venda.mao_de_obra || 0);
        if (venda.mao_de_obra) totalMaoDeObra += venda.mao_de_obra;

        const vendedor = pessoas.find((p) => p.id === venda.vendedor_id);
        const taxaVendedorNovos =
          vendedor && vendedor.comissao_fixa
            ? vendedor.comissao_fixa / 100
            : comissaoPadrao;

        const itensVenda = itens.filter((i) => i.venda_id === venda.id);

        itensVenda.forEach((item) => {
          const totalItem = item.preco_unitario * item.quantidade;
          const custoItem = item.custo_unitario * item.quantidade;
          totalCustoProdutos += custoItem;

          let descontoItem = 0;
          if (venda.desconto_tipo === "fixed") {
            const ratio = venda.subtotal > 0 ? totalItem / venda.subtotal : 0;
            descontoItem = venda.desconto_valor * ratio;
          } else {
            descontoItem = (totalItem * venda.desconto_valor) / 100;
          }
          const receitaLiqItem = totalItem - descontoItem;

          if (item.tipo === "usado") {
            const lucroItem = receitaLiqItem - custoItem;
            if (lucroItem > 0) totalComissoes += lucroItem * comissaoUsados;
          } else {
            if (receitaLiqItem > 0)
              totalComissoes += receitaLiqItem * taxaVendedorNovos;
          }
        });
      });

      servicos.forEach((s) => {
        totalMaoDeObra += s.valor;
      });

      const lucro =
        totalFaturamento - totalCustoProdutos - totalComissoes - totalMaoDeObra;

      return {
        faturamento: totalFaturamento,
        lucro: lucro,
        vendasCount: vendas.length,
        maoDeObra: totalMaoDeObra,
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

      const vendas = await knex("vendas")
        .where("data_venda", ">=", d)
        .where("data_venda", "<", nextD)
        .where("cancelada", 0)
        .sum({ total: knex.raw("total_final - mao_de_obra") } as any);

      labels.push(d.toLocaleDateString("pt-BR", { weekday: "short" }));
      data.push((vendas[0] as any).total || 0);
    }
    return { labels, data };
  });

  ipcMain.handle("get-low-stock", async () => {
    return await knex("produtos")
      .where("estoque_atual", "<=", 5)
      .where("ativo", true)
      .limit(10);
  });

  ipcMain.handle("get-inventory-stats", async () => {
    try {
      const produtos = await knex("produtos")
        .where("ativo", true)
        .select("custo", "preco_venda", "estoque_atual");

      let custoTotal = 0;
      let vendaPotencial = 0;
      let qtdZerados = 0;
      let qtdBaixoEstoque = 0;
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
