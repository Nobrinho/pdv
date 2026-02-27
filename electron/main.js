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

// electron/database/context/CompanyContext.ts
var CompanyContext = class {
  static currentCompanyId = null;
  static setCompany(companyId) {
    this.currentCompanyId = companyId;
    console.log(`[CompanyContext] Empresa definida: ${companyId}`);
  }
  static getCompany() {
    return this.currentCompanyId;
  }
  static clear() {
    this.currentCompanyId = null;
  }
};
var CompanyContext_default = CompanyContext;

// electron/database/repositories/BaseRepository.ts
var BaseRepository = class {
  db = knex;
  tableName;
  get companyId() {
    const contextCompany = CompanyContext_default.getCompany();
    if (!contextCompany) {
      console.warn(
        `[CompanyContext] Empresa n\xE3o definida para ${this.tableName}. Usando fallback EMPRESA_LOCAL_001`
      );
      return "EMPRESA_LOCAL_001";
    }
    return contextCompany;
  }
  constructor(tableName) {
    this.tableName = tableName;
  }
  get query() {
    return this.db(this.tableName).where(`${this.tableName}.empresa_id`, this.companyId).whereNull(`${this.tableName}.deleted_at`);
  }
  async getAll() {
    return await this.query;
  }
  async getById(id) {
    return await this.query.where("id", id).first();
  }
  async insert(data) {
    const now = Date.now();
    return await this.db.transaction(async (trx) => {
      const [id] = await trx(this.tableName).insert({
        ...data,
        empresa_id: this.companyId,
        updated_at: now,
        synced: false
      });
      await this.addToSyncQueueTrx(trx, id, "INSERT", data);
      return id;
    });
  }
  async update(id, data) {
    const now = Date.now();
    await this.db.transaction(async (trx) => {
      await trx(this.tableName).where("id", id).where("empresa_id", this.companyId).update({
        ...data,
        updated_at: now,
        synced: false
      });
      await this.addToSyncQueueTrx(trx, id, "UPDATE", data);
    });
  }
  async delete(id) {
    const now = Date.now();
    await this.db.transaction(async (trx) => {
      await trx(this.tableName).where("id", id).where("empresa_id", this.companyId).update({
        deleted_at: now,
        synced: false
      });
      await this.addToSyncQueueTrx(trx, id, "DELETE", null);
    });
  }
  async addToSyncQueue(recordId, action, payload) {
    await this.addToSyncQueueTrx(this.db, recordId, action, payload);
  }
  async addToSyncQueueTrx(trx, recordId, action, payload, tableName) {
    const syncId = `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await trx("sync_queue").insert({
      id: syncId,
      table_name: tableName || this.tableName,
      record_id: recordId.toString(),
      action,
      payload: payload ? JSON.stringify(payload) : null,
      empresa_id: this.companyId,
      created_at: Date.now(),
      processed: false
    });
  }
};

// electron/database/repositories/ProdutosRepository.ts
var ProdutosRepository = class extends BaseRepository {
  constructor() {
    super("produtos");
  }
  async getActive() {
    return await this.query.where("ativo", true);
  }
  async saveWithHistory(product) {
    const now = Date.now();
    if (product.id) {
      const atual = await this.query.where("id", product.id).first();
      await this.update(product.id, product);
      if (parseFloat(atual.preco_venda) !== Number(product.preco_venda) || Number(atual.estoque_atual) !== Number(product.estoque_atual)) {
        await this.db("historico_produtos").insert({
          produto_id: product.id,
          preco_antigo: atual.preco_venda,
          preco_novo: product.preco_venda,
          estoque_antigo: atual.estoque_atual,
          estoque_novo: product.estoque_atual,
          tipo_alteracao: "atualizacao",
          data_alteracao: now,
          empresa_id: this.companyId,
          updated_at: now,
          synced: false
        });
      }
      return { id: product.id, success: true };
    } else {
      const codigo = product.codigo || "AUTO-" + Date.now();
      const id = await this.insert({ ...product, codigo, ativo: true });
      await this.db("historico_produtos").insert({
        produto_id: id,
        preco_novo: product.preco_venda,
        estoque_novo: product.estoque_atual,
        tipo_alteracao: "cadastro_inicial",
        data_alteracao: now,
        empresa_id: this.companyId,
        updated_at: now,
        synced: false
      });
      return { id, success: true };
    }
  }
  async getHistory() {
    return await this.db("historico_produtos").join("produtos", "historico_produtos.produto_id", "produtos.id").where("historico_produtos.empresa_id", this.companyId).whereNull("produtos.deleted_at").select("historico_produtos.*", "produtos.descricao", "produtos.codigo").orderBy("historico_produtos.data_alteracao", "desc");
  }
};

// electron/ipc/products.ts
var produtosRepo = new ProdutosRepository();
function registerProductHandlers() {
  import_electron2.ipcMain.handle("get-products", async () => {
    try {
      return await produtosRepo.getActive();
    } catch (error) {
      console.error(error);
      return [];
    }
  });
  import_electron2.ipcMain.handle("save-product", async (_event, product) => {
    try {
      return await produtosRepo.saveWithHistory(product);
    } catch (error) {
      if (error.code === "SQLITE_CONSTRAINT_UNIQUE")
        return { success: false, error: "C\xF3digo j\xE1 existe." };
      return { success: false, error: error.message };
    }
  });
  import_electron2.ipcMain.handle("delete-product", async (_event, id) => {
    try {
      await produtosRepo.delete(id);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  import_electron2.ipcMain.handle("get-product-history", async () => {
    try {
      return await produtosRepo.getHistory();
    } catch (error) {
      return [];
    }
  });
}

// electron/ipc/sales.ts
var import_electron3 = require("electron");

// electron/database/repositories/VendasRepository.ts
var VendasRepository = class extends BaseRepository {
  constructor() {
    super("vendas");
  }
  async createFullSale(saleData) {
    const trx = await this.db.transaction();
    const now = Date.now();
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
        data_venda: now,
        empresa_id: this.companyId,
        updated_at: now,
        synced: false
      });
      const items = saleData.itens.map((item) => ({
        venda_id: saleId,
        produto_id: item.id,
        quantidade: item.qty,
        preco_unitario: item.preco_venda,
        custo_unitario: item.custo,
        empresa_id: this.companyId,
        updated_at: now,
        synced: false
      }));
      if (items.length > 0) {
        await trx("venda_itens").insert(items);
        for (const item of items) {
          await trx("produtos").where("id", item.produto_id).where("empresa_id", this.companyId).decrement("estoque_atual", item.quantidade).update({ updated_at: now, synced: false });
        }
      }
      const pagamentos = saleData.pagamentos.map((p) => ({
        venda_id: saleId,
        metodo: p.metodo,
        valor: p.valor,
        detalhes: p.detalhes || "",
        empresa_id: this.companyId,
        updated_at: now,
        synced: false
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
              data_lancamento: now,
              empresa_id: this.companyId,
              updated_at: now,
              synced: false
            });
          }
        }
      }
      await this.addToSyncQueueTrx(trx, saleId, "INSERT", saleData, "vendas");
      await trx.commit();
      return { success: true, id: saleId };
    } catch (error) {
      await trx.rollback();
      throw error;
    }
  }
  async getAllDetailed() {
    const vendas = await this.db("vendas").leftJoin("pessoas as vendedor", "vendas.vendedor_id", "vendedor.id").leftJoin("pessoas as trocador", "vendas.trocador_id", "trocador.id").where("vendas.empresa_id", this.companyId).whereNull("vendas.deleted_at").select(
      "vendas.*",
      "vendedor.nome as vendedor_nome",
      "trocador.nome as trocador_nome",
      "vendedor.comissao_fixa"
    ).orderBy("data_venda", "desc");
    if (vendas.length === 0) return [];
    const vendaIds = vendas.map((v) => v.id);
    const allItems = await this.db("venda_itens").leftJoin("produtos", "venda_itens.produto_id", "produtos.id").whereIn("venda_id", vendaIds).select("venda_itens.*", "produtos.tipo");
    const allPayments = await this.db("venda_pagamentos").whereIn("venda_id", vendaIds).select("*");
    const configPadrao = await this.db("configuracoes").where("chave", "comissao_padrao").where("empresa_id", this.companyId).first();
    const configUsados = await this.db("configuracoes").where("chave", "comissao_usados").where("empresa_id", this.companyId).first();
    const comissaoPadrao = configPadrao ? parseFloat(configPadrao.valor) : 0.04;
    const comissaoUsados = configUsados ? parseFloat(configUsados.valor) : 0.25;
    return vendas.map((venda) => {
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
          if (lucroItem > 0) comissaoTotal += lucroItem * comissaoUsados;
        } else {
          if (receitaLiqItem > 0) comissaoTotal += receitaLiqItem * taxaVendedorNovos;
        }
      });
      return {
        ...venda,
        custo_total_real: custoTotal,
        comissao_real: comissaoTotal,
        lista_pagamentos: pagamentosVenda
      };
    });
  }
  async getSaleItems(vendaId) {
    return await this.db("venda_itens").leftJoin("produtos", "venda_itens.produto_id", "produtos.id").where("venda_id", vendaId).where("venda_itens.empresa_id", this.companyId).select("venda_itens.*", "produtos.descricao", "produtos.codigo");
  }
  async cancelSale(vendaId, motivo) {
    const trx = await this.db.transaction();
    const now = Date.now();
    try {
      const itens = await trx("venda_itens").where("venda_id", vendaId).where("empresa_id", this.companyId);
      for (const item of itens) {
        await trx("produtos").where("id", item.produto_id).where("empresa_id", this.companyId).increment("estoque_atual", item.quantidade).update({ updated_at: now, synced: false });
      }
      await trx("vendas").where("id", vendaId).where("empresa_id", this.companyId).update({
        cancelada: true,
        motivo_cancelamento: motivo,
        data_cancelamento: now,
        updated_at: now,
        synced: false
      });
      await this.addToSyncQueueTrx(trx, vendaId, "UPDATE", { cancelada: true, motivo_cancelamento: motivo }, "vendas");
      await trx.commit();
      return { success: true };
    } catch (error) {
      await trx.rollback();
      throw error;
    }
  }
};

// electron/ipc/sales.ts
var vendasRepo = new VendasRepository();
function registerSalesHandlers() {
  import_electron3.ipcMain.handle("create-sale", async (_event, saleData) => {
    try {
      return await vendasRepo.createFullSale(saleData);
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  import_electron3.ipcMain.handle("get-sales", async () => {
    try {
      return await vendasRepo.getAllDetailed();
    } catch (error) {
      console.error("Erro get-sales:", error);
      return [];
    }
  });
  import_electron3.ipcMain.handle("get-sale-items", async (_e, id) => {
    try {
      return await vendasRepo.getSaleItems(id);
    } catch (error) {
      console.error("Erro get-sale-items:", error);
      return [];
    }
  });
  import_electron3.ipcMain.handle("cancel-sale", async (_event, { vendaId, motivo }) => {
    try {
      return await vendasRepo.cancelSale(vendaId, motivo);
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
}

// electron/ipc/people.ts
var import_electron4 = require("electron");

// electron/database/repositories/PessoasRepository.ts
var PessoasRepository = class extends BaseRepository {
  constructor() {
    super("pessoas");
  }
  async getActive() {
    return await this.query.leftJoin("cargos", "pessoas.cargo_id", "cargos.id").select("pessoas.*", "cargos.nome as cargo_nome").where("pessoas.ativo", true);
  }
  async getBrief() {
    return await this.query.select("id", "nome", "comissao_fixa");
  }
  async save(person) {
    if (person.id) {
      await this.update(person.id, person);
    } else {
      await this.insert({ ...person, ativo: true });
    }
  }
  // --- CARGOS ---
  async getRoles() {
    return await this.db("cargos");
  }
  async saveRole(nome) {
    return await this.db("cargos").insert({ nome });
  }
  async deleteRole(id) {
    return await this.db("cargos").where("id", id).del();
  }
};

// electron/ipc/people.ts
var pessoasRepo = new PessoasRepository();
function registerPeopleHandlers() {
  import_electron4.ipcMain.handle("get-people", async () => {
    try {
      return await pessoasRepo.getActive();
    } catch (error) {
      return [];
    }
  });
  import_electron4.ipcMain.handle("save-person", async (_event, person) => {
    try {
      await pessoasRepo.save(person);
      return { id: person.id, success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  import_electron4.ipcMain.handle("delete-person", async (_event, id) => {
    try {
      await pessoasRepo.delete(id);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  import_electron4.ipcMain.handle("get-roles", async () => {
    return await pessoasRepo.getRoles();
  });
  import_electron4.ipcMain.handle("save-role", async (_e, nome) => {
    try {
      const [id] = await pessoasRepo.saveRole(nome);
      return { success: true, id };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  import_electron4.ipcMain.handle("delete-role", async (_e, id) => {
    try {
      await pessoasRepo.deleteRole(id);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
}

// electron/ipc/clients.ts
var import_electron5 = require("electron");

// electron/database/repositories/ClientesRepository.ts
var ClientesRepository = class extends BaseRepository {
  constructor() {
    super("clientes");
  }
  async getWithSaldoDevedor() {
    const clientes = await this.query.where("ativo", true);
    for (let cli of clientes) {
      const dividas = await this.db("contas_receber").where("cliente_id", cli.id).where("empresa_id", this.companyId).whereNot("status", "PAGO").whereNull("deleted_at");
      const totalDivida = dividas.reduce(
        (acc, d) => acc + (d.valor_total - d.valor_pago),
        0
      );
      cli.saldo_devedor = totalDivida;
    }
    return clientes;
  }
  async save(client) {
    if (client.id) {
      await this.update(client.id, client);
    } else {
      await this.insert({ ...client, ativo: true });
    }
    return { success: true };
  }
  async deleteIfNoDebt(id) {
    const dividas = await this.db("contas_receber").where("cliente_id", id).where("empresa_id", this.companyId).whereNot("status", "PAGO").whereNull("deleted_at").first();
    if (dividas) {
      return { success: false, error: "Cliente possui d\xE9bitos pendentes." };
    }
    await this.delete(id);
    return { success: true };
  }
  async getDebts(clienteId) {
    return await this.db("contas_receber").where("cliente_id", clienteId).where("empresa_id", this.companyId).whereNull("deleted_at").orderBy("data_lancamento", "desc");
  }
  async payDebt(contaId, valorPago) {
    const now = Date.now();
    const conta = await this.db("contas_receber").where("id", contaId).where("empresa_id", this.companyId).first();
    if (!conta) throw new Error("Conta n\xE3o encontrada");
    const novoValorPago = conta.valor_pago + valorPago;
    let novoStatus = conta.status;
    if (novoValorPago >= conta.valor_total) {
      novoStatus = "PAGO";
    } else if (novoValorPago > 0) {
      novoStatus = "PARCIAL";
    }
    await this.db("contas_receber").where("id", contaId).where("empresa_id", this.companyId).update({
      valor_pago: novoValorPago,
      status: novoStatus,
      updated_at: now,
      synced: false
    });
    const syncId = `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await this.db("sync_queue").insert({
      id: syncId,
      table_name: "contas_receber",
      record_id: contaId.toString(),
      action: "UPDATE",
      payload: JSON.stringify({ valor_pago: novoValorPago, status: novoStatus }),
      empresa_id: this.companyId,
      created_at: now,
      processed: false
    });
    return { success: true };
  }
};

// electron/ipc/clients.ts
var clientesRepo = new ClientesRepository();
function registerClientHandlers() {
  import_electron5.ipcMain.handle("get-clients", async () => {
    try {
      return await clientesRepo.getWithSaldoDevedor();
    } catch (error) {
      console.error("Erro get-clients:", error);
      return [];
    }
  });
  import_electron5.ipcMain.handle("save-client", async (_event, client) => {
    try {
      return await clientesRepo.save(client);
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  import_electron5.ipcMain.handle("delete-client", async (_event, id) => {
    try {
      return await clientesRepo.deleteIfNoDebt(id);
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  import_electron5.ipcMain.handle("get-client-debts", async (_event, clienteId) => {
    try {
      return await clientesRepo.getDebts(clienteId);
    } catch (error) {
      return [];
    }
  });
  import_electron5.ipcMain.handle("pay-debt", async (_event, { contaId, valorPago }) => {
    try {
      return await clientesRepo.payDebt(contaId, valorPago);
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
}

// electron/ipc/services.ts
var import_electron6 = require("electron");

// electron/database/repositories/ServicesRepository.ts
var ServicesRepository = class extends BaseRepository {
  constructor() {
    super("servicos_avulsos");
  }
  async getAllDetailed() {
    return await this.query.leftJoin("pessoas", "servicos_avulsos.trocador_id", "pessoas.id").select("servicos_avulsos.*", "pessoas.nome as trocador_nome").whereNull("servicos_avulsos.deleted_at").orderBy("data_servico", "desc");
  }
  async create(data) {
    const now = Date.now();
    return await this.insert({
      ...data,
      data_servico: now
    });
  }
};

// electron/ipc/services.ts
var servicesRepo = new ServicesRepository();
function registerServiceHandlers() {
  import_electron6.ipcMain.handle("get-services", async () => {
    try {
      return await servicesRepo.getAllDetailed();
    } catch (error) {
      console.error("Erro get-services:", error);
      return [];
    }
  });
  import_electron6.ipcMain.handle("create-service", async (_e, data) => {
    try {
      const id = await servicesRepo.create(data);
      return { success: true, id };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
}

// electron/ipc/company.ts
var import_electron7 = require("electron");

// electron/database/repositories/SystemRepository.ts
var import_crypto = __toESM(require("crypto"));
var SystemRepository = class extends BaseRepository {
  constructor() {
    super("usuarios");
  }
  // --- USUÁRIOS ---
  async getUsers() {
    return await this.db("usuarios").where("empresa_id", this.companyId).whereNull("deleted_at").select("id", "nome", "username", "cargo");
  }
  async checkUsersExist() {
    const res = await this.db("usuarios").where("empresa_id", this.companyId).whereNull("deleted_at").count("id as total").first();
    return res.total > 0;
  }
  async registerUser(userData) {
    const { salt, hash } = this.hashPassword(userData.password);
    return await this.insert({
      nome: userData.nome,
      username: userData.username,
      password_hash: hash,
      salt,
      cargo: userData.cargo || "admin",
      ativo: true
    });
  }
  async findByUsername(username) {
    return await this.db("usuarios").where("username", username).where("empresa_id", this.companyId).whereNull("deleted_at").first();
  }
  // --- CONFIGURAÇÕES ---
  async getConfig(key) {
    const config = await this.db("configuracoes").where("chave", key).where("empresa_id", this.companyId).whereNull("deleted_at").first();
    return config ? config.valor : null;
  }
  async saveConfig(key, value) {
    const now = Date.now();
    await this.db.transaction(async (trx) => {
      const existing = await trx("configuracoes").where("chave", key).where("empresa_id", this.companyId).first();
      if (existing) {
        await trx("configuracoes").where("chave", key).where("empresa_id", this.companyId).update({
          valor: value,
          updated_at: now,
          synced: false,
          deleted_at: null
        });
      } else {
        await trx("configuracoes").insert({
          chave: key,
          valor: value,
          empresa_id: this.companyId,
          updated_at: now,
          synced: false
        });
      }
      await this.addToSyncQueueTrx(
        trx,
        key,
        existing ? "UPDATE" : "INSERT",
        { valor: value },
        "configuracoes"
      );
    });
  }
  // --- HELPERS ---
  hashPassword(password) {
    const salt = import_crypto.default.randomBytes(16).toString("hex");
    const hash = import_crypto.default.pbkdf2Sync(password, salt, 1e3, 64, "sha512").toString("hex");
    return { salt, hash };
  }
  verifyPassword(password, salt, storedHash) {
    const hash = import_crypto.default.pbkdf2Sync(password, salt, 1e3, 64, "sha512").toString("hex");
    return hash === storedHash;
  }
};

// electron/ipc/company.ts
var import_fs = __toESM(require("fs"));
var import_path2 = __toESM(require("path"));
var import_sharp = __toESM(require("sharp"));
var systemRepo = new SystemRepository();
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
      const result = {};
      for (const key of keys) {
        result[key] = await systemRepo.getConfig(key);
      }
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
      for (const [key, value] of Object.entries(data)) {
        if (key === "empresa_logo_url") continue;
        if (key === "empresa_logo") {
          if (typeof value === "string" && value.startsWith("data:image")) {
            continue;
          }
        }
        await systemRepo.saveConfig(key, value);
      }
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
      await systemRepo.saveConfig("empresa_logo", destPath);
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

// electron/database/repositories/DashboardRepository.ts
var DashboardRepository = class extends BaseRepository {
  constructor() {
    super("vendas");
  }
  async getDashboardStats() {
    const now = /* @__PURE__ */ new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).getTime();
    const vendas = await this.db("vendas").where("empresa_id", this.companyId).whereNull("deleted_at").where("data_venda", ">=", startOfDay).where("data_venda", "<=", endOfDay).where("cancelada", false);
    const servicos = await this.db("servicos_avulsos").where("empresa_id", this.companyId).whereNull("deleted_at").where("data_servico", ">=", startOfDay).where("data_servico", "<=", endOfDay);
    const configPadrao = await this.db("configuracoes").where("chave", "comissao_padrao").where("empresa_id", this.companyId).first();
    const configUsados = await this.db("configuracoes").where("chave", "comissao_usados").where("empresa_id", this.companyId).first();
    const comissaoPadrao = configPadrao ? parseFloat(configPadrao.valor) : 0.04;
    const comissaoUsados = configUsados ? parseFloat(configUsados.valor) : 0.25;
    const pessoas = await this.db("pessoas").where("empresa_id", this.companyId).whereNull("deleted_at");
    const vendaIds = vendas.map((v) => v.id);
    const itens = vendaIds.length > 0 ? await this.db("venda_itens").leftJoin("produtos", "venda_itens.produto_id", "produtos.id").whereIn("venda_id", vendaIds).where("venda_itens.empresa_id", this.companyId).select("venda_itens.*", "produtos.tipo") : [];
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
          if (receitaLiqItem > 0) totalComissoes += receitaLiqItem * taxaVendedorNovos;
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
  }
  async getWeeklySales() {
    const labels = [];
    const data = [];
    const today = /* @__PURE__ */ new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      const nextD = new Date(d);
      nextD.setDate(d.getDate() + 1);
      const res = await this.db("vendas").where("empresa_id", this.companyId).whereNull("deleted_at").where("data_venda", ">=", d.getTime()).where("data_venda", "<", nextD.getTime()).where("cancelada", false).sum({ total: this.db.raw("total_final - mao_de_obra") }).first();
      labels.push(d.toLocaleDateString("pt-BR", { weekday: "short" }));
      data.push(res.total || 0);
    }
    return { labels, data };
  }
  // --- INVENTÁRIO ---
  async getLowStock() {
    return await this.db("produtos").where("empresa_id", this.companyId).whereNull("deleted_at").where("ativo", true).where("estoque_atual", "<=", 5).limit(10);
  }
  async getInventoryStats() {
    const produtos = await this.db("produtos").where("empresa_id", this.companyId).whereNull("deleted_at").where("ativo", true).select("custo", "preco_venda", "estoque_atual");
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
  }
};

// electron/ipc/system.ts
var import_fs2 = __toESM(require("fs"));
var import_path3 = __toESM(require("path"));
var isDev2 = !import_electron8.app.isPackaged;
var systemRepo2 = new SystemRepository();
var dashRepo = new DashboardRepository();
function registerSystemHandlers(mainWindow2) {
  import_electron8.ipcMain.handle("check-users-exist", async () => {
    return await systemRepo2.checkUsersExist();
  });
  import_electron8.ipcMain.handle("register-user", async (_event, userData) => {
    try {
      await systemRepo2.registerUser(userData);
      return { success: true };
    } catch (error) {
      if (error.code === "SQLITE_CONSTRAINT_UNIQUE") {
        return { success: false, error: "Este nome de usu\xE1rio j\xE1 existe." };
      }
      return { success: false, error: error.message };
    }
  });
  import_electron8.ipcMain.handle("login-attempt", async (_e, { username, password }) => {
    const user = await systemRepo2.findByUsername(username);
    if (!user || !user.ativo)
      return { success: false, error: "Usu\xE1rio inv\xE1lido" };
    if (systemRepo2.verifyPassword(password, user.salt, user.password_hash)) {
      if (user.empresa_id) {
        CompanyContext_default.setCompany(user.empresa_id);
      } else {
        CompanyContext_default.setCompany("EMPRESA_LOCAL_001");
      }
      return {
        success: true,
        user: {
          id: user.id,
          nome: user.nome,
          username: user.username,
          cargo: user.cargo
        }
      };
    }
    return { success: false, error: "Senha incorreta" };
  });
  import_electron8.ipcMain.handle("get-users", async () => {
    return await systemRepo2.getUsers();
  });
  import_electron8.ipcMain.handle("delete-user", async (_e, id) => {
    await systemRepo2.delete(id);
    return { success: true };
  });
  import_electron8.ipcMain.handle("get-config", async (_e, k) => {
    const configValue = await systemRepo2.getConfig(k);
    if (!configValue) return null;
    if (k === "login_background" && configValue && (configValue.includes("/") || configValue.includes("\\"))) {
      try {
        if (import_fs2.default.existsSync(configValue)) {
          const fileBuffer = import_fs2.default.readFileSync(configValue);
          const ext = import_path3.default.extname(configValue).replace(".", "");
          return `data:image/${ext};base64,${fileBuffer.toString("base64")}`;
        }
      } catch (err) {
        console.error("Erro ao ler fundo customizado:", err);
      }
    }
    return configValue;
  });
  import_electron8.ipcMain.handle("save-config", async (_e, k, v) => {
    try {
      await systemRepo2.saveConfig(k, v);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
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
      await systemRepo2.saveConfig("login_background", destPath);
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
      return await dashRepo.getDashboardStats();
    } catch (error) {
      console.error("Erro dashboard stats:", error);
      return { faturamento: 0, lucro: 0, vendasCount: 0, maoDeObra: 0, comissoes: 0 };
    }
  });
  import_electron8.ipcMain.handle("get-weekly-sales", async () => {
    try {
      return await dashRepo.getWeeklySales();
    } catch (error) {
      console.error("Erro weekly sales:", error);
      return { labels: [], data: [] };
    }
  });
  import_electron8.ipcMain.handle("get-low-stock", async () => {
    try {
      return await dashRepo.getLowStock();
    } catch (error) {
      console.error("Erro low stock:", error);
      return [];
    }
  });
  import_electron8.ipcMain.handle("get-inventory-stats", async () => {
    try {
      return await dashRepo.getInventoryStats();
    } catch (error) {
      console.error("Erro inventory stats:", error);
      return { custoTotal: 0, vendaPotencial: 0, lucroProjetado: 0, qtdZerados: 0, qtdBaixoEstoque: 0, totalItensFisicos: 0 };
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
var import_node_machine_id = require("node-machine-id");
var isDev3 = !import_electron10.app.isPackaged;
var mainWindow = null;
async function initDb() {
  try {
    CompanyContext_default.setCompany("EMPRESA_LOCAL_001");
    await knex.migrate.latest();
    console.log("Banco de dados sincronizado.");
    const deviceId = (0, import_node_machine_id.machineIdSync)();
    const config = await knex("saas_config").first();
    if (config && !config.device_id) {
      await knex("saas_config").where("id", config.id).update({
        device_id: deviceId,
        updated_at: Date.now()
      });
      console.log("Device ID registrado:", deviceId);
    }
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
