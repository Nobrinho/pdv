import { describe, it, expect, beforeEach, afterEach } from "vitest";
import Knex from "knex";
import { createAuthSession } from "../../apps/pdv/electron/lib/authSession.js";
import { hashPassword } from "../../apps/pdv/electron/services/auth.js";
import { register as registerAuth } from "../../apps/pdv/electron/handlers/auth.js";
import { register as registerSales } from "../../apps/pdv/electron/handlers/sales.js";
import { createIpcHarness, eventFor } from "../helpers/ipc.js";

const createDb = () =>
  Knex({
    client: "sqlite3",
    connection: { filename: ":memory:" },
    useNullAsDefault: true,
  });

async function createSchema(db) {
  await db.schema.createTable("usuarios", (t) => {
    t.increments("id").primary();
    t.string("nome").notNullable();
    t.string("username").unique().notNullable();
    t.string("password_hash").notNullable();
    t.string("salt").notNullable();
    t.string("cargo").defaultTo("admin");
    t.boolean("ativo").defaultTo(true);
  });

  await db.schema.createTable("produtos", (t) => {
    t.increments("id").primary();
    t.string("codigo").unique();
    t.string("descricao").notNullable();
    t.decimal("custo", 10, 2).notNullable();
    t.decimal("preco_venda", 10, 2).notNullable();
    t.integer("estoque_atual").defaultTo(0);
    t.string("tipo").defaultTo("novo");
    t.boolean("ativo").defaultTo(true);
  });

  await db.schema.createTable("pessoas", (t) => {
    t.increments("id").primary();
    t.string("nome").notNullable();
    t.decimal("comissao_fixa", 10, 2).nullable();
    t.boolean("ativo").defaultTo(true);
  });

  await db.schema.createTable("vendas", (t) => {
    t.increments("id").primary();
    t.integer("vendedor_id").nullable();
    t.integer("trocador_id").nullable();
    t.integer("cliente_id").nullable();
    t.decimal("subtotal", 10, 2).notNullable();
    t.decimal("mao_de_obra", 10, 2).defaultTo(0);
    t.decimal("acrescimo", 10, 2).defaultTo(0);
    t.decimal("desconto_valor", 10, 2).defaultTo(0);
    t.string("desconto_tipo").defaultTo("fixed");
    t.decimal("total_final", 10, 2).notNullable();
    t.string("forma_pagamento").notNullable();
    t.datetime("data_venda");
    t.boolean("cancelada").defaultTo(false);
    t.string("motivo_cancelamento").nullable();
    t.datetime("data_cancelamento").nullable();
    t.boolean("comissao_paga").defaultTo(false);
    t.datetime("data_pagamento_comissao").nullable();
  });

  await db.schema.createTable("venda_itens", (t) => {
    t.increments("id").primary();
    t.integer("venda_id").notNullable();
    t.integer("produto_id").notNullable();
    t.integer("quantidade").notNullable();
    t.decimal("preco_unitario", 10, 2).notNullable();
    t.decimal("custo_unitario", 10, 2).notNullable();
  });

  await db.schema.createTable("venda_pagamentos", (t) => {
    t.increments("id").primary();
    t.integer("venda_id").notNullable();
    t.string("metodo").notNullable();
    t.decimal("valor", 10, 2).notNullable();
    t.string("detalhes").nullable();
  });

  await db.schema.createTable("contas_receber", (t) => {
    t.increments("id").primary();
    t.integer("cliente_id").notNullable();
    t.integer("venda_id").nullable();
    t.string("descricao").notNullable();
    t.decimal("valor_total", 10, 2).notNullable();
    t.decimal("valor_pago", 10, 2).defaultTo(0);
    t.string("status").defaultTo("PENDENTE");
  });

  await db.schema.createTable("event_logs", (t) => {
    t.increments("id").primary();
    t.bigInteger("occurred_at_ms");
    t.string("event_category");
    t.string("event_type");
    t.string("screen").nullable();
    t.string("component").nullable();
    t.string("action").nullable();
    t.string("target_id").nullable();
    t.string("entity_type").nullable();
    t.string("entity_id").nullable();
    t.string("user_id").nullable();
    t.string("user_name").nullable();
    t.string("session_id").nullable();
    t.string("correlation_id").nullable();
    t.string("severity");
    t.string("message").nullable();
    t.text("payload_json").nullable();
    t.string("source");
  });
}

async function seedAdmin(db) {
  const { salt, hash } = hashPassword("1234");
  await db("usuarios").insert({
    id: 1,
    nome: "Admin",
    username: "admin",
    password_hash: hash,
    salt,
    cargo: "admin",
    ativo: 1,
  });
}

async function seedCanceledSaleScenario(db) {
  await db("produtos").insert({
    id: 1,
    codigo: "P001",
    descricao: "Produto Teste",
    custo: 50,
    preco_venda: 100,
    estoque_atual: 3,
    tipo: "novo",
    ativo: 1,
  });
  await db("vendas").insert({
    id: 1,
    vendedor_id: 1,
    subtotal: 200,
    mao_de_obra: 0,
    acrescimo: 0,
    desconto_valor: 0,
    desconto_tipo: "fixed",
    total_final: 200,
    forma_pagamento: "Fiado",
    data_venda: Date.now(),
    cancelada: 0,
  });
  await db("venda_itens").insert({
    venda_id: 1,
    produto_id: 1,
    quantidade: 2,
    preco_unitario: 100,
    custo_unitario: 50,
  });
  await db("contas_receber").insert({
    cliente_id: 1,
    venda_id: 1,
    descricao: "Venda #1",
    valor_total: 200,
    valor_pago: 0,
    status: "PENDENTE",
  });
}

async function seedCreateSaleScenario(db) {
  await db("pessoas").insert([
    { id: 1, nome: "Vendedor Ativo", ativo: 1 },
    { id: 2, nome: "Vendedor Inativo", ativo: 0 },
    { id: 3, nome: "Trocador Ativo", ativo: 1 },
    { id: 4, nome: "Trocador Inativo", ativo: 0 },
  ]);
  await db("produtos").insert([
    {
      id: 1,
      codigo: "P001",
      descricao: "Produto Ativo",
      custo: 50,
      preco_venda: 100,
      estoque_atual: 3,
      tipo: "novo",
      ativo: 1,
    },
    {
      id: 2,
      codigo: "P002",
      descricao: "Produto Inativo",
      custo: 30,
      preco_venda: 80,
      estoque_atual: 3,
      tipo: "novo",
      ativo: 0,
    },
  ]);
}

const baseSaleData = (overrides = {}) => ({
  vendedor_id: 1,
  trocador_id: null,
  cliente_id: null,
  subtotal: 100,
  acrescimo_valor: 0,
  desconto_valor: 0,
  desconto_tipo: "fixed",
  mao_de_obra: 0,
  total_final: 100,
  pagamentos: [{ metodo: "Dinheiro", valor: 100 }],
  itens: [{ id: 1, qty: 1, preco_venda: 100, custo: 50 }],
  ...overrides,
});

describe("Handlers reais - vendas", () => {
  let db;
  let ipc;
  let mainEvent;

  beforeEach(async () => {
    db = createDb();
    await createSchema(db);
    const authSession = createAuthSession();
    ipc = createIpcHarness();
    mainEvent = eventFor(20);

    registerAuth(ipc.safeHandle, db, authSession);
    registerSales(ipc.safeHandle, db, authSession);
  });

  afterEach(async () => {
    await db.destroy();
  });

  it("bloqueia cancelamento sem admin e nao altera estoque", async () => {
    await seedAdmin(db);
    await seedCanceledSaleScenario(db);

    const result = await ipc.invoke("cancel-sale", mainEvent, {
      vendaId: 1,
      motivo: "Teste",
    });
    const produto = await db("produtos").where("id", 1).first();
    const venda = await db("vendas").where("id", 1).first();

    expect(result.success).toBe(false);
    expect(result.error).toContain("administrador");
    expect(produto.estoque_atual).toBe(3);
    expect(Boolean(venda.cancelada)).toBe(false);
  });

  it("cancela uma venda apenas uma vez e nao duplica devolucao de estoque", async () => {
    await seedAdmin(db);
    await seedCanceledSaleScenario(db);
    await ipc.invoke("login-attempt", mainEvent, {
      username: "admin",
      password: "1234",
    });

    const first = await ipc.invoke("cancel-sale", mainEvent, {
      vendaId: 1,
      motivo: "Cliente desistiu",
    });
    const stockAfterFirst = await db("produtos").where("id", 1).first();
    const contaAfterFirst = await db("contas_receber").where("venda_id", 1).first();

    const second = await ipc.invoke("cancel-sale", mainEvent, {
      vendaId: 1,
      motivo: "Tentativa duplicada",
    });
    const stockAfterSecond = await db("produtos").where("id", 1).first();
    const vendaAfterSecond = await db("vendas").where("id", 1).first();

    expect(first.success).toBe(true);
    expect(stockAfterFirst.estoque_atual).toBe(5);
    expect(contaAfterFirst.status).toBe("CANCELADO");
    expect(second.success).toBe(false);
    expect(second.error).toContain("ja cancelada");
    expect(stockAfterSecond.estoque_atual).toBe(5);
    expect(Boolean(vendaAfterSecond.cancelada)).toBe(true);
  });

  it("cria venda valida somente com vendedor ativo e decrementa estoque", async () => {
    await seedCreateSaleScenario(db);

    const result = await ipc.invoke("create-sale", mainEvent, baseSaleData());
    const product = await db("produtos").where("id", 1).first();
    const sale = await db("vendas").where("id", result.id).first();

    expect(result.success).toBe(true);
    expect(product.estoque_atual).toBe(2);
    expect(sale.vendedor_id).toBe(1);
  });

  it("bloqueia venda com vendedor ou trocador inexistente/inativo", async () => {
    await seedCreateSaleScenario(db);

    const inactiveSeller = await ipc.invoke("create-sale", mainEvent, baseSaleData({
      vendedor_id: 2,
    }));
    const missingSeller = await ipc.invoke("create-sale", mainEvent, baseSaleData({
      vendedor_id: 999,
    }));
    const inactiveMechanic = await ipc.invoke("create-sale", mainEvent, baseSaleData({
      mao_de_obra: 20,
      total_final: 120,
      pagamentos: [{ metodo: "Dinheiro", valor: 120 }],
      trocador_id: 4,
    }));

    expect(inactiveSeller.success).toBe(false);
    expect(inactiveSeller.error).toContain("vendedor nao encontrado");
    expect(missingSeller.success).toBe(false);
    expect(missingSeller.error).toContain("vendedor nao encontrado");
    expect(inactiveMechanic.success).toBe(false);
    expect(inactiveMechanic.error).toContain("mao de obra nao encontrado");
  });

  it("bloqueia itens invalidos sem movimentar estoque", async () => {
    await seedCreateSaleScenario(db);

    const negativeQuantity = await ipc.invoke("create-sale", mainEvent, baseSaleData({
      itens: [{ id: 1, qty: -1, preco_venda: 100, custo: 50 }],
    }));
    const inactiveProduct = await ipc.invoke("create-sale", mainEvent, baseSaleData({
      itens: [{ id: 2, qty: 1, preco_venda: 80, custo: 30 }],
      subtotal: 80,
      total_final: 80,
      pagamentos: [{ metodo: "Dinheiro", valor: 80 }],
    }));
    const product = await db("produtos").where("id", 1).first();
    const salesCount = await db("vendas").count("id as total").first();

    expect(negativeQuantity.success).toBe(false);
    expect(negativeQuantity.error).toContain("quantidade");
    expect(inactiveProduct.success).toBe(false);
    expect(inactiveProduct.error).toContain("inativo");
    expect(product.estoque_atual).toBe(3);
    expect(Number(salesCount.total)).toBe(0);
  });
});
