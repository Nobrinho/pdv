"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// electron/main.ts
var import_electron10 = require("electron");
var import_electron_updater2 = require("electron-updater");
var import_path4 = __toESM(require("path"));

// electron/ipc/products.ts
var import_electron2 = require("electron");

// electron/database/knex.ts
var import_electron = require("electron");
var import_path = __toESM(require("path"));
var import_knex = __toESM(require("knex"));
var isDev = !import_electron.app.isPackaged;
var rootPath = isDev ? import_electron.app.getAppPath() : process.resourcesPath;
var dbPath;
if (isDev) {
  dbPath = import_path.default.join(rootPath, "syscontrol.sqlite3");
} else {
  const userDataPath = import_electron.app.getPath("userData");
  dbPath = import_path.default.join(userDataPath, "syscontrol.sqlite3");
}
var knex = (0, import_knex.default)({
  client: "better-sqlite3",
  connection: {
    filename: dbPath
  },
  useNullAsDefault: true,
  migrations: {
    directory: isDev ? import_path.default.join(rootPath, "database", "migrations") : import_path.default.join(rootPath, "database", "migrations")
  }
});

// electron/ipc/products.ts
function registerProductHandlers() {
  import_electron2.ipcMain.handle("get-products", async () => {
    try {
      return await knex("produtos").where("ativo", true).select("*");
    } catch (error) {
      console.error(error);
      return [];
    }
  });
  import_electron2.ipcMain.handle("save-product", async (_event, product) => {
    try {
      if (product.id) {
        const atual = await knex("produtos").where("id", product.id).first();
        await knex("produtos").where("id", product.id).update(product);
        if (parseFloat(atual.preco_venda) !== Number(product.preco_venda) || Number(atual.estoque_atual) !== Number(product.estoque_atual)) {
          await knex("historico_produtos").insert({
            produto_id: product.id,
            preco_antigo: atual.preco_venda,
            preco_novo: product.preco_venda,
            estoque_antigo: atual.estoque_atual,
            estoque_novo: product.estoque_atual,
            tipo_alteracao: "atualizacao",
            data_alteracao: /* @__PURE__ */ new Date()
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
          data_alteracao: /* @__PURE__ */ new Date()
        });
        return { id, success: true };
      }
    } catch (error) {
      if (error.code === "SQLITE_CONSTRAINT_UNIQUE")
        return { success: false, error: "C\xF3digo j\xE1 existe." };
      return { success: false, error: error.message };
    }
  });
  import_electron2.ipcMain.handle("delete-product", async (_event, id) => {
    try {
      await knex("produtos").where("id", id).update({ ativo: false });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  import_electron2.ipcMain.handle("get-product-history", async () => {
    try {
      return await knex("historico_produtos").join("produtos", "historico_produtos.produto_id", "produtos.id").select("historico_produtos.*", "produtos.descricao", "produtos.codigo").orderBy("historico_produtos.data_alteracao", "desc");
    } catch (error) {
      return [];
    }
  });
}

// electron/ipc/sales.ts
var import_electron3 = require("electron");
function registerSalesHandlers() {
  import_electron3.ipcMain.handle("create-sale", async (_event, saleData) => {
    const trx = await knex.transaction();
    try {
      const formaPagamentoResumo = saleData.pagamentos.length > 1 ? "M\xFAltiplos" : saleData.pagamentos[0].metodo;
      const [saleId] = await trx("vendas").insert({
        vendedor_id: saleData.vendedor_id,
        trocador_id: null,
        cliente_id: saleData.cliente_id || null,
        subtotal: saleData.subtotal,
        mao_de_obra: 0,
        acrescimo: saleData.acrescimo_valor || 0,
        desconto_valor: saleData.desconto_valor || 0,
        desconto_tipo: saleData.desconto_tipo || "percent",
        total_final: saleData.total_final,
        forma_pagamento: formaPagamentoResumo,
        data_venda: /* @__PURE__ */ new Date()
      });
      const items = saleData.itens.map((item) => ({
        venda_id: saleId,
        produto_id: item.id,
        quantidade: item.qty,
        preco_unitario: item.preco_venda,
        custo_unitario: item.custo
      }));
      if (items.length > 0) {
        await trx("venda_itens").insert(items);
        for (const item of items) {
          await trx("produtos").where("id", item.produto_id).decrement("estoque_atual", item.quantidade);
        }
      }
      const pagamentos = saleData.pagamentos.map((p) => ({
        venda_id: saleId,
        metodo: p.metodo,
        valor: p.valor,
        detalhes: p.detalhes || ""
      }));
      if (pagamentos.length > 0) {
        await trx("venda_pagamentos").insert(pagamentos);
        for (const pg of pagamentos) {
          if (pg.metodo === "Fiado") {
            if (!saleData.cliente_id)
              throw new Error("Venda Fiado exige um cliente selecionado.");
            await trx("contas_receber").insert({
              cliente_id: saleData.cliente_id,
              venda_id: saleId,
              descricao: `Venda #${saleId}`,
              valor_total: pg.valor,
              valor_pago: 0,
              status: "PENDENTE",
              data_lancamento: /* @__PURE__ */ new Date()
            });
          }
        }
      }
      await trx.commit();
      return { success: true, id: saleId };
    } catch (error) {
      await trx.rollback();
      return { success: false, error: error.message };
    }
  });
  import_electron3.ipcMain.handle("get-sales", async () => {
    try {
      const vendas = await knex("vendas").leftJoin("pessoas as vendedor", "vendas.vendedor_id", "vendedor.id").leftJoin("pessoas as trocador", "vendas.trocador_id", "trocador.id").select(
        "vendas.*",
        "vendedor.nome as vendedor_nome",
        "trocador.nome as trocador_nome",
        "vendedor.comissao_fixa"
      ).orderBy("data_venda", "desc");
      if (vendas.length === 0) return [];
      const vendaIds = vendas.map((v) => v.id);
      const allItems = await knex("venda_itens").leftJoin("produtos", "venda_itens.produto_id", "produtos.id").whereIn("venda_id", vendaIds).select("venda_itens.*", "produtos.tipo");
      const allPayments = await knex("venda_pagamentos").whereIn("venda_id", vendaIds).select("*");
      const configPadrao = await knex("configuracoes").where("chave", "comissao_padrao").first();
      const configUsados = await knex("configuracoes").where("chave", "comissao_usados").first();
      const comissaoPadrao = configPadrao ? parseFloat(configPadrao.valor) : 0.3;
      const comissaoUsados = configUsados ? parseFloat(configUsados.valor) : 0.25;
      const vendasProcessadas = vendas.map((venda) => {
        const itensVenda = allItems.filter((i) => i.venda_id === venda.id);
        const pagamentosVenda = allPayments.filter(
          (p) => p.venda_id === venda.id
        );
        const custoTotal = itensVenda.reduce(
          (acc, item) => acc + item.custo_unitario * item.quantidade,
          0
        );
        let comissaoTotal = 0;
        const taxaVendedorNovos = venda.comissao_fixa ? venda.comissao_fixa / 100 : comissaoPadrao;
        itensVenda.forEach((item) => {
          const totalItem = item.preco_unitario * item.quantidade;
          let descontoItem = 0;
          if (venda.desconto_tipo === "fixed") {
            const ratio = venda.subtotal > 0 ? totalItem / venda.subtotal : 0;
            descontoItem = venda.desconto_valor * ratio;
          } else {
            descontoItem = totalItem * venda.desconto_valor / 100;
          }
          const receitaLiqItem = totalItem - descontoItem;
          if (item.tipo === "usado") {
            const custoItem = item.custo_unitario * item.quantidade;
            const lucroItem = receitaLiqItem - custoItem;
            if (lucroItem > 0) {
              comissaoTotal += lucroItem * comissaoUsados;
            }
          } else {
            if (receitaLiqItem > 0) {
              comissaoTotal += receitaLiqItem * taxaVendedorNovos;
            }
          }
        });
        return {
          ...venda,
          custo_total_real: custoTotal,
          comissao_real: comissaoTotal,
          lista_pagamentos: pagamentosVenda
        };
      });
      return vendasProcessadas;
    } catch (error) {
      console.error("Erro get-sales:", error);
      return [];
    }
  });
  import_electron3.ipcMain.handle("get-sale-items", async (_e, id) => {
    return await knex("venda_itens").leftJoin("produtos", "venda_itens.produto_id", "produtos.id").where("venda_id", id).select("venda_itens.*", "produtos.descricao", "produtos.codigo");
  });
  import_electron3.ipcMain.handle("cancel-sale", async (_event, { vendaId, motivo }) => {
    const trx = await knex.transaction();
    try {
      const itens = await trx("venda_itens").where("venda_id", vendaId);
      for (const item of itens) {
        await trx("produtos").where("id", item.produto_id).increment("estoque_atual", item.quantidade);
      }
      await trx("vendas").where("id", vendaId).update({
        cancelada: true,
        motivo_cancelamento: motivo,
        data_cancelamento: /* @__PURE__ */ new Date()
      });
      await trx.commit();
      return { success: true };
    } catch (error) {
      await trx.rollback();
      return { success: false, error: error.message };
    }
  });
}

// electron/ipc/people.ts
var import_electron4 = require("electron");
function registerPeopleHandlers() {
  import_electron4.ipcMain.handle("get-people", async () => {
    try {
      return await knex("pessoas").leftJoin("cargos", "pessoas.cargo_id", "cargos.id").where("pessoas.ativo", true).select("pessoas.*", "cargos.nome as cargo_nome");
    } catch (error) {
      return [];
    }
  });
  import_electron4.ipcMain.handle("save-person", async (_event, person) => {
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
  import_electron4.ipcMain.handle("delete-person", async (_event, id) => {
    try {
      await knex("pessoas").where("id", id).update({ ativo: false });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  import_electron4.ipcMain.handle("get-roles", async () => await knex("cargos").select("*"));
  import_electron4.ipcMain.handle("save-role", async (_e, nome) => {
    const [id] = await knex("cargos").insert({ nome });
    return { success: true, id };
  });
  import_electron4.ipcMain.handle("delete-role", async (_e, id) => {
    await knex("cargos").where("id", id).del();
    return { success: true };
  });
}

// electron/ipc/clients.ts
var import_electron5 = require("electron");
function registerClientHandlers() {
  import_electron5.ipcMain.handle("get-clients", async () => {
    try {
      const clientes = await knex("clientes").where("ativo", true);
      for (let cli of clientes) {
        const dividas = await knex("contas_receber").where("cliente_id", cli.id).whereNot("status", "PAGO");
        const totalDivida = dividas.reduce(
          (acc, d) => acc + (d.valor_total - d.valor_pago),
          0
        );
        cli.saldo_devedor = totalDivida;
      }
      return clientes;
    } catch (error) {
      console.error("Erro get-clients:", error);
      return [];
    }
  });
  import_electron5.ipcMain.handle("save-client", async (_event, client) => {
    try {
      if (client.id) {
        await knex("clientes").where("id", client.id).update(client);
        return { success: true };
      } else {
        await knex("clientes").insert({ ...client, ativo: true });
        return { success: true };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  import_electron5.ipcMain.handle("delete-client", async (_event, id) => {
    try {
      const dividas = await knex("contas_receber").where("cliente_id", id).whereNot("status", "PAGO").first();
      if (dividas)
        return { success: false, error: "Cliente possui d\xE9bitos pendentes." };
      await knex("clientes").where("id", id).update({ ativo: false });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  import_electron5.ipcMain.handle("get-client-debts", async (_event, clienteId) => {
    return await knex("contas_receber").where("cliente_id", clienteId).orderBy("data_lancamento", "desc");
  });
  import_electron5.ipcMain.handle("pay-debt", async (_event, { contaId, valorPago }) => {
    try {
      const conta = await knex("contas_receber").where("id", contaId).first();
      if (!conta) throw new Error("Conta n\xE3o encontrada");
      const novoValorPago = conta.valor_pago + valorPago;
      let novoStatus = conta.status;
      if (novoValorPago >= conta.valor_total) {
        novoStatus = "PAGO";
      } else if (novoValorPago > 0) {
        novoStatus = "PARCIAL";
      }
      await knex("contas_receber").where("id", contaId).update({
        valor_pago: novoValorPago,
        status: novoStatus
      });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
}

// electron/ipc/services.ts
var import_electron6 = require("electron");
function registerServiceHandlers() {
  import_electron6.ipcMain.handle("get-services", async () => {
    return await knex("servicos_avulsos").leftJoin("pessoas", "servicos_avulsos.trocador_id", "pessoas.id").select("servicos_avulsos.*", "pessoas.nome as trocador_nome").orderBy("data_servico", "desc");
  });
  import_electron6.ipcMain.handle("create-service", async (_e, data) => {
    const [id] = await knex("servicos_avulsos").insert({
      ...data,
      data_servico: /* @__PURE__ */ new Date()
    });
    return { success: true, id };
  });
}

// electron/ipc/company.ts
var import_electron7 = require("electron");
var import_fs = __toESM(require("fs"));
var import_path2 = __toESM(require("path"));
var import_sharp = __toESM(require("sharp"));
function registerCompanyHandlers(mainWindow2) {
  import_electron7.ipcMain.handle("get-company-info", async () => {
    try {
      const keys = [
        "empresa_nome",
        "empresa_endereco",
        "empresa_telefone",
        "empresa_cnpj",
        "empresa_logo"
      ];
      const configs = await knex("configuracoes").whereIn("chave", keys);
      const result = {};
      configs.forEach((c) => {
        result[c.chave] = c.valor;
      });
      if (result.empresa_logo) {
        try {
          if (import_fs.default.existsSync(result.empresa_logo)) {
            const fileBuffer = import_fs.default.readFileSync(result.empresa_logo);
            const ext = import_path2.default.extname(result.empresa_logo).replace(".", "");
            const base64 = fileBuffer.toString("base64");
            const base64Img = `data:image/${ext};base64,${base64}`;
            result.empresa_logo = base64Img;
            result.empresa_logo_url = base64Img;
          } else {
            result.empresa_logo = null;
          }
        } catch (err) {
          console.error("Erro ao ler arquivo de logo:", err);
          result.empresa_logo = null;
        }
      }
      return result;
    } catch (error) {
      console.error("Erro get-company-info:", error);
      return {};
    }
  });
  import_electron7.ipcMain.handle("save-company-info", async (_event, data) => {
    try {
      const trx = await knex.transaction();
      for (const [key, value] of Object.entries(data)) {
        if (key === "empresa_logo_url") continue;
        if (key === "empresa_logo") {
          if (typeof value === "string" && value.startsWith("data:image")) {
            continue;
          }
        }
        const existing = await trx("configuracoes").where("chave", key).first();
        if (existing) {
          await trx("configuracoes").where("chave", key).update({ valor: value });
        } else {
          await trx("configuracoes").insert({ chave: key, valor: value });
        }
      }
      await trx.commit();
      return { success: true };
    } catch (error) {
      console.error("Erro save-company-info:", error);
      return { success: false, error: error.message };
    }
  });
  import_electron7.ipcMain.handle("select-logo-file", async () => {
    const { canceled, filePaths } = await import_electron7.dialog.showOpenDialog(mainWindow2, {
      properties: ["openFile"],
      filters: [{ name: "Imagens", extensions: ["jpg", "png", "jpeg"] }]
    });
    if (canceled || filePaths.length === 0) return null;
    const sourcePath = filePaths[0];
    const ext = import_path2.default.extname(sourcePath);
    const destFileName = `logo_empresa${ext}`;
    const destPath = import_path2.default.join(import_electron7.app.getPath("userData"), destFileName);
    try {
      await (0, import_sharp.default)(sourcePath).resize(300).grayscale().toFile(destPath);
      const existing = await knex("configuracoes").where("chave", "empresa_logo").first();
      if (existing) {
        await knex("configuracoes").where("chave", "empresa_logo").update({ valor: destPath });
      } else {
        await knex("configuracoes").insert({
          chave: "empresa_logo",
          valor: destPath
        });
      }
      const fileBuffer = await import_fs.default.promises.readFile(destPath);
      const base64 = fileBuffer.toString("base64");
      const extName = import_path2.default.extname(destPath).replace(".", "");
      return {
        path: destPath,
        base64: `data:image/${extName};base64,${base64}`
      };
    } catch (error) {
      console.error("Erro ao salvar logo:", error);
      return null;
    }
  });
}

// electron/ipc/system.ts
var import_electron8 = require("electron");
var import_electron_updater = require("electron-updater");
var import_fs2 = __toESM(require("fs"));
var import_path3 = __toESM(require("path"));
var import_crypto = __toESM(require("crypto"));
var isDev2 = !import_electron8.app.isPackaged;
function hashPassword(password) {
  const salt = import_crypto.default.randomBytes(16).toString("hex");
  const hash = import_crypto.default.pbkdf2Sync(password, salt, 1e3, 64, "sha512").toString("hex");
  return { salt, hash };
}
function verifyPassword(password, salt, storedHash) {
  const hash = import_crypto.default.pbkdf2Sync(password, salt, 1e3, 64, "sha512").toString("hex");
  return hash === storedHash;
}
function registerSystemHandlers(mainWindow2) {
  import_electron8.ipcMain.handle(
    "check-users-exist",
    async () => (await knex("usuarios").count("id as total").first()).total > 0
  );
  import_electron8.ipcMain.handle("register-user", async (_event, userData) => {
    try {
      const { salt, hash } = hashPassword(userData.password);
      await knex("usuarios").insert({
        nome: userData.nome,
        username: userData.username,
        password_hash: hash,
        salt,
        cargo: userData.cargo || "admin",
        ativo: true
      });
      return { success: true };
    } catch (error) {
      if (error.code === "SQLITE_CONSTRAINT_UNIQUE") {
        return { success: false, error: "Este nome de usu\xE1rio j\xE1 existe." };
      }
      return { success: false, error: error.message };
    }
  });
  import_electron8.ipcMain.handle("login-attempt", async (_e, { username, password }) => {
    const user = await knex("usuarios").where("username", username).first();
    if (!user || !user.ativo)
      return { success: false, error: "Usu\xE1rio inv\xE1lido" };
    if (verifyPassword(password, user.salt, user.password_hash))
      return {
        success: true,
        user: {
          id: user.id,
          nome: user.nome,
          username: user.username,
          cargo: user.cargo
        }
      };
    return { success: false, error: "Senha incorreta" };
  });
  import_electron8.ipcMain.handle(
    "get-users",
    async () => await knex("usuarios").select("id", "nome", "username", "cargo")
  );
  import_electron8.ipcMain.handle("delete-user", async (_e, id) => {
    await knex("usuarios").where("id", id).del();
    return { success: true };
  });
  import_electron8.ipcMain.handle(
    "get-config",
    async (_e, k) => {
      const config = await knex("configuracoes").where("chave", k).first();
      if (!config) return null;
      if (k === "login_background" && config.valor && (config.valor.includes("/") || config.valor.includes("\\"))) {
        try {
          if (import_fs2.default.existsSync(config.valor)) {
            const fileBuffer = import_fs2.default.readFileSync(config.valor);
            const ext = import_path3.default.extname(config.valor).replace(".", "");
            return `data:image/${ext};base64,${fileBuffer.toString("base64")}`;
          }
        } catch (err) {
          console.error("Erro ao ler fundo customizado:", err);
        }
      }
      return config.valor;
    }
  );
  import_electron8.ipcMain.handle("save-config", async (_e, k, v) => {
    const ex = await knex("configuracoes").where("chave", k).first();
    ex ? await knex("configuracoes").where("chave", k).update({ valor: v }) : await knex("configuracoes").insert({ chave: k, valor: v });
    return { success: true };
  });
  import_electron8.ipcMain.handle("select-custom-background", async () => {
    const { canceled, filePaths } = await import_electron8.dialog.showOpenDialog(mainWindow2, {
      properties: ["openFile"],
      filters: [{ name: "Imagens", extensions: ["jpg", "png", "jpeg", "webp"] }]
    });
    if (canceled || filePaths.length === 0) return null;
    const sourcePath = filePaths[0];
    const ext = import_path3.default.extname(sourcePath);
    const destFileName = `custom_bg${ext}`;
    const destPath = import_path3.default.join(import_electron8.app.getPath("userData"), destFileName);
    try {
      await import_fs2.default.promises.copyFile(sourcePath, destPath);
      await knex("configuracoes").where("chave", "login_background").delete();
      await knex("configuracoes").insert({
        chave: "login_background",
        valor: destPath
      });
      const fileBuffer = await import_fs2.default.promises.readFile(destPath);
      const base64 = fileBuffer.toString("base64");
      const extName = ext.replace(".", "");
      return {
        path: destPath,
        base64: `data:image/${extName};base64,${base64}`
      };
    } catch (error) {
      console.error("Erro ao salvar fundo customizado:", error);
      return null;
    }
  });
  import_electron8.ipcMain.handle("get-login-backgrounds", async () => {
    return Array.from({ length: 10 }, (_, i) => `bg${i + 1}`);
  });
  import_electron8.ipcMain.handle("backup-database", async () => {
    const { canceled, filePath } = await import_electron8.dialog.showSaveDialog(mainWindow2, {
      defaultPath: `backup_${Date.now()}.sqlite3`
    });
    if (canceled || !filePath) return { success: false };
    await import_fs2.default.promises.copyFile(dbPath, filePath);
    return { success: true };
  });
  import_electron8.ipcMain.handle("restore-database", async () => {
    const { canceled, filePaths } = await import_electron8.dialog.showOpenDialog(mainWindow2, {
      properties: ["openFile"],
      filters: [{ name: "Bancos de Dados SQLite", extensions: ["sqlite3"] }]
    });
    if (canceled || filePaths.length === 0) return { success: false };
    await import_fs2.default.promises.copyFile(filePaths[0], dbPath);
    import_electron8.app.relaunch();
    import_electron8.app.exit(0);
  });
  import_electron8.ipcMain.handle(
    "get-printers",
    async () => mainWindow2.webContents.getPrintersAsync()
  );
  import_electron8.ipcMain.handle("get-dashboard-stats", async () => {
    try {
      const now = /* @__PURE__ */ new Date();
      const startOfDay = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate()
      ).getTime();
      const endOfDay = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        23,
        59,
        59,
        999
      ).getTime();
      const vendas = await knex("vendas").where("data_venda", ">=", new Date(startOfDay)).where("data_venda", "<=", new Date(endOfDay)).where("cancelada", 0);
      const servicos = await knex("servicos_avulsos").where("data_servico", ">=", new Date(startOfDay)).where("data_servico", "<=", new Date(endOfDay));
      const configPadrao = await knex("configuracoes").where("chave", "comissao_padrao").first();
      const configUsados = await knex("configuracoes").where("chave", "comissao_usados").first();
      const comissaoPadrao = configPadrao ? parseFloat(configPadrao.valor) : 0.3;
      const comissaoUsados = configUsados ? parseFloat(configUsados.valor) : 0.25;
      const pessoas = await knex("pessoas").select("*");
      const vendaIds = vendas.map((v) => v.id);
      const itens = vendaIds.length > 0 ? await knex("venda_itens").leftJoin("produtos", "venda_itens.produto_id", "produtos.id").whereIn("venda_id", vendaIds).select("venda_itens.*", "produtos.tipo") : [];
      let totalFaturamento = 0;
      let totalMaoDeObra = 0;
      let totalComissoes = 0;
      let totalCustoProdutos = 0;
      vendas.forEach((venda) => {
        totalFaturamento += venda.total_final - (venda.mao_de_obra || 0);
        if (venda.mao_de_obra) totalMaoDeObra += venda.mao_de_obra;
        const vendedor = pessoas.find((p) => p.id === venda.vendedor_id);
        const taxaVendedorNovos = vendedor && vendedor.comissao_fixa ? vendedor.comissao_fixa / 100 : comissaoPadrao;
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
            descontoItem = totalItem * venda.desconto_valor / 100;
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
      const lucro = totalFaturamento - totalCustoProdutos - totalComissoes - totalMaoDeObra;
      return {
        faturamento: totalFaturamento,
        lucro,
        vendasCount: vendas.length,
        maoDeObra: totalMaoDeObra,
        comissoes: totalComissoes
      };
    } catch (error) {
      console.error(error);
      return {
        faturamento: 0,
        lucro: 0,
        vendasCount: 0,
        maoDeObra: 0,
        comissoes: 0
      };
    }
  });
  import_electron8.ipcMain.handle("get-weekly-sales", async () => {
    const labels = [];
    const data = [];
    const today = /* @__PURE__ */ new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      const nextD = new Date(d);
      nextD.setDate(d.getDate() + 1);
      const vendas = await knex("vendas").where("data_venda", ">=", d).where("data_venda", "<", nextD).where("cancelada", 0).sum({ total: knex.raw("total_final - mao_de_obra") });
      labels.push(d.toLocaleDateString("pt-BR", { weekday: "short" }));
      data.push(vendas[0].total || 0);
    }
    return { labels, data };
  });
  import_electron8.ipcMain.handle("get-low-stock", async () => {
    return await knex("produtos").where("estoque_atual", "<=", 5).where("ativo", true).limit(10);
  });
  import_electron8.ipcMain.handle("get-inventory-stats", async () => {
    try {
      const produtos = await knex("produtos").where("ativo", true).select("custo", "preco_venda", "estoque_atual");
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
        totalItensFisicos
      };
    } catch (error) {
      console.error("Erro inventory stats:", error);
      return {
        custoTotal: 0,
        vendaPotencial: 0,
        lucroProjetado: 0,
        qtdZerados: 0,
        qtdBaixoEstoque: 0,
        totalItensFisicos: 0
      };
    }
  });
  import_electron8.ipcMain.handle("get-app-version", () => import_electron8.app.getVersion());
  import_electron8.ipcMain.handle("check-for-updates", () => {
    if (isDev2) {
      if (mainWindow2) mainWindow2.webContents.send("update_not_available");
      return;
    }
    import_electron_updater.autoUpdater.checkForUpdates().catch((err) => {
      console.error("Erro no check-for-updates:", err);
      if (mainWindow2 && !mainWindow2.isDestroyed()) {
        mainWindow2.webContents.send("update_error", err.message);
      }
    });
  });
  import_electron8.ipcMain.handle("download-update", async () => {
    await import_electron_updater.autoUpdater.downloadUpdate();
    return { success: true };
  });
  import_electron8.ipcMain.handle("quit-and-install", () => import_electron_updater.autoUpdater.quitAndInstall());
}

// electron/ipc/print.ts
var import_electron9 = require("electron");
function registerPrintHandlers(mainWindow2) {
  import_electron9.ipcMain.handle("print-silent", async (_event, contentHtml, printerName) => {
    console.log(`\u{1F5A8}\uFE0F Tentando imprimir: "${printerName}"`);
    if (printerName && printerName !== "Padr\xE3o do Windows") {
      const printers = await mainWindow2.webContents.getPrintersAsync();
      const exists = printers.find((p) => p.name === printerName);
      if (!exists) return { success: false, error: "Impressora n\xE3o encontrada." };
    }
    let printWindow = new import_electron9.BrowserWindow({
      show: false,
      width: 300,
      height: 600,
      webPreferences: { nodeIntegration: false }
    });
    const fullHtml = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
          <meta charset="UTF-8">
          <style>
              @page { margin: 0; size: auto; }
              * {
                  box-sizing: border-box;
                  color: #000 !important;
                  text-shadow: 0 0 0 #000;
              }
              body {
                  font-family: 'Courier New', Courier, monospace;
                  font-size: 13px;
                  font-weight: 700;
                  margin: 0;
                  padding: 5px;
                  width: 280px;
                  background-color: #fff;
              }
              .flex { display: flex; }
              .justify-between { justify-content: space-between; }
              .text-center { text-align: center; }
              .text-right { text-align: right; }
              .font-bold { font-weight: 900; }
              .border-b { border-bottom: 2px dashed #000; padding-bottom: 5px; margin-bottom: 5px; }
              .border-t { border-top: 2px dashed #000; padding-top: 5px; margin-top: 5px; }
              .mb-2 { margin-bottom: 5px; }
              .mb-4 { margin-bottom: 10px; }
              .mt-2 { margin-top: 5px; }
              .mt-4 { margin-top: 10px; }
              .uppercase { text-transform: uppercase; }
              .text-xs { font-size: 11px; }
              .text-sm { font-size: 13px; }
              img { max-width: 100%; height: auto; display: block; margin: 0 auto; image-rendering: crisp-edges; }
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
        `data:text/html;charset=utf-8,${encodeURIComponent(fullHtml)}`
      );
      await new Promise((r) => setTimeout(r, 1e3));
      const options = {
        silent: true,
        printBackground: false,
        color: false,
        margins: { marginType: "none" },
        landscape: false,
        scaleFactor: 100,
        copies: 1
      };
      if (printerName && printerName !== "Padr\xE3o do Windows") {
        options.deviceName = printerName;
      }
      await printWindow.webContents.print(options);
      setTimeout(() => {
        if (!printWindow.isDestroyed()) printWindow.close();
      }, 2e3);
      return { success: true };
    } catch (error) {
      console.error("Erro print:", error);
      if (!printWindow.isDestroyed()) printWindow.close();
      return { success: false, error: error.message };
    }
  });
}

// electron/main.ts
var isDev3 = !import_electron10.app.isPackaged;
var mainWindow = null;
import_electron_updater2.autoUpdater.autoDownload = false;
import_electron_updater2.autoUpdater.autoInstallOnAppQuit = true;
async function initDb() {
  try {
    await knex.migrate.latest();
    console.log("Banco de dados sincronizado.");
  } catch (error) {
    console.error("Erro ao inicializar banco de dados:", error);
  }
}
function createWindow() {
  mainWindow = new import_electron10.BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: import_path4.default.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true
    },
    icon: import_path4.default.join(__dirname, "../build/icon.png")
  });
  if (isDev3) {
    mainWindow.loadURL("http://localhost:5173");
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(import_path4.default.join(__dirname, "../dist/index.html"));
  }
  import_electron_updater2.autoUpdater.on("checking-for-update", () => {
    mainWindow?.webContents.send("checking_for_update");
  });
  import_electron_updater2.autoUpdater.on("update-available", (info) => {
    mainWindow?.webContents.send("update_available", info);
  });
  import_electron_updater2.autoUpdater.on("update-not-available", () => {
    mainWindow?.webContents.send("update_not_available");
  });
  import_electron_updater2.autoUpdater.on("error", (err) => {
    mainWindow?.webContents.send("update_error", err);
  });
  import_electron_updater2.autoUpdater.on("download-progress", (progressObj) => {
    mainWindow?.webContents.send("download_progress", progressObj);
  });
  import_electron_updater2.autoUpdater.on("update-downloaded", () => {
    mainWindow?.webContents.send("update_downloaded");
  });
}
import_electron10.app.whenReady().then(async () => {
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
  import_electron10.app.on("activate", function() {
    if (import_electron10.BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});
import_electron10.app.on("window-all-closed", function() {
  if (process.platform !== "darwin") import_electron10.app.quit();
});
