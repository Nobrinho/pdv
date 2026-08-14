import { afterEach, beforeEach, describe, expect, it } from "vitest";
import Knex from "knex";
import { register as registerBudgets } from "../../apps/pdv/electron/handlers/budgets.js";
import { createIpcHarness, eventFor } from "../helpers/ipc.js";

const createDb = () =>
  Knex({
    client: "sqlite3",
    connection: { filename: ":memory:" },
    useNullAsDefault: true,
  });

async function createSchema(db) {
  await db.schema.createTable("clientes", (t) => {
    t.increments("id").primary();
    t.string("nome").notNullable();
    t.string("documento").nullable();
    t.string("telefone").nullable();
    t.boolean("ativo").defaultTo(true);
  });

  await db.schema.createTable("pessoas", (t) => {
    t.increments("id").primary();
    t.string("nome").notNullable();
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

  await db.schema.createTable("vendas", (t) => {
    t.increments("id").primary();
    t.integer("vendedor_id").nullable();
    t.integer("trocador_id").nullable();
    t.integer("cliente_id").nullable();
    t.decimal("subtotal", 10, 2).notNullable().defaultTo(0);
    t.decimal("mao_de_obra", 10, 2).defaultTo(0);
    t.decimal("acrescimo", 10, 2).defaultTo(0);
    t.decimal("desconto_valor", 10, 2).defaultTo(0);
    t.string("desconto_tipo").defaultTo("fixed");
    t.decimal("total_final", 10, 2).notNullable().defaultTo(0);
    t.string("forma_pagamento").nullable();
    t.bigInteger("data_venda").nullable();
    t.boolean("cancelada").defaultTo(false);
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
    t.bigInteger("data_lancamento").nullable();
  });

  await db.schema.createTable("orcamentos", (t) => {
    t.increments("id").primary();
    t.integer("cliente_id").nullable();
    t.integer("vendedor_id").notNullable();
    t.integer("trocador_id").nullable();
    t.string("codigo").notNullable().unique();
    t.decimal("subtotal", 10, 2).notNullable().defaultTo(0);
    t.decimal("mao_de_obra", 10, 2).notNullable().defaultTo(0);
    t.decimal("acrescimo_valor", 10, 2).notNullable().defaultTo(0);
    t.decimal("desconto_valor", 10, 2).notNullable().defaultTo(0);
    t.string("desconto_tipo").notNullable().defaultTo("fixed");
    t.decimal("total_final", 10, 2).notNullable().defaultTo(0);
    t.text("observacoes").nullable();
    t.string("status").notNullable().defaultTo("ABERTO");
    t.bigInteger("validade_em").nullable();
    t.bigInteger("data_criacao").notNullable();
    t.bigInteger("data_atualizacao").notNullable();
    t.bigInteger("data_conversao").nullable();
    t.integer("venda_id_gerada").nullable();
  });

  await db.schema.createTable("orcamento_itens", (t) => {
    t.increments("id").primary();
    t.integer("orcamento_id").notNullable();
    t.integer("produto_id").notNullable();
    t.string("codigo_snapshot").nullable();
    t.string("descricao_snapshot").notNullable();
    t.string("tipo_snapshot").nullable();
    t.integer("quantidade").notNullable();
    t.decimal("preco_unitario", 10, 2).notNullable();
    t.decimal("custo_unitario", 10, 2).notNullable();
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

async function seedBase(db) {
  await db("clientes").insert({ id: 1, nome: "Cliente Teste", ativo: 1 });
  await db("pessoas").insert([
    { id: 1, nome: "Vendedor Ativo", ativo: 1 },
    { id: 2, nome: "Trocador Ativo", ativo: 1 },
    { id: 3, nome: "Vendedor Inativo", ativo: 0 },
  ]);
  await db("produtos").insert([
    {
      id: 1,
      codigo: "P001",
      descricao: "Produto A",
      custo: 20,
      preco_venda: 50,
      estoque_atual: 10,
      tipo: "novo",
      ativo: 1,
    },
    {
      id: 2,
      codigo: "P002",
      descricao: "Produto Inativo",
      custo: 10,
      preco_venda: 30,
      estoque_atual: 5,
      tipo: "usado",
      ativo: 0,
    },
  ]);
}

const baseBudget = (overrides = {}) => ({
  cliente_id: 1,
  vendedor_id: 1,
  trocador_id: null,
  subtotal: 50,
  acrescimo_valor: 0,
  desconto_valor: 0,
  desconto_tipo: "fixed",
  mao_de_obra: 0,
  total_final: 50,
  observacoes: "Teste",
  itens: [{ id: 1, qty: 1, preco_venda: 50, custo: 20 }],
  ...overrides,
});

describe("Handlers reais - orcamentos", () => {
  let db;
  let ipc;
  let mainEvent;

  beforeEach(async () => {
    db = createDb();
    await createSchema(db);
    await seedBase(db);
    ipc = createIpcHarness();
    mainEvent = eventFor(55);
    registerBudgets(ipc.safeHandle, db);
  });

  afterEach(async () => {
    await db.destroy();
  });

  it("cria orcamento sem alterar estoque e salva snapshot dos itens", async () => {
    const result = await ipc.invoke("create-budget", mainEvent, baseBudget());
    const produto = await db("produtos").where("id", 1).first();
    const budget = await db("orcamentos").where("id", result.id).first();
    const items = await db("orcamento_itens").where("orcamento_id", result.id);

    expect(result.success).toBe(true);
    expect(result.codigo).toContain("ORC-");
    expect(produto.estoque_atual).toBe(10);
    expect(budget.status).toBe("ABERTO");
    expect(items).toHaveLength(1);
    expect(items[0].descricao_snapshot).toBe("Produto A");
  });

  it("bloqueia item inativo e vendedor invalido", async () => {
    const inactiveProduct = await ipc.invoke("create-budget", mainEvent, baseBudget({
      itens: [{ id: 2, qty: 1, preco_venda: 30, custo: 10 }],
      subtotal: 30,
      total_final: 30,
    }));
    const inactiveSeller = await ipc.invoke("create-budget", mainEvent, baseBudget({
      vendedor_id: 3,
    }));

    expect(inactiveProduct.success).toBe(false);
    expect(inactiveProduct.error).toContain("inativo");
    expect(inactiveSeller.success).toBe(false);
    expect(inactiveSeller.error).toContain("vendedor nao encontrado");
  });

  it("atualiza apenas orcamento aberto e lista com itens agregados", async () => {
    const created = await ipc.invoke("create-budget", mainEvent, baseBudget());
    const updated = await ipc.invoke("update-budget", mainEvent, {
      ...baseBudget({
        id: created.id,
        subtotal: 100,
        total_final: 100,
        itens: [{ id: 1, qty: 2, preco_venda: 50, custo: 20 }],
      }),
      id: created.id,
    });
    const listed = await ipc.invoke("get-budgets", mainEvent);

    expect(updated.success).toBe(true);
    expect(listed).toHaveLength(1);
    expect(Number(listed[0].subtotal)).toBe(100);
    expect(listed[0].itens).toHaveLength(1);
    expect(listed[0].itens[0].quantidade).toBe(2);
  });

  it("cancela e duplica orcamento sem permitir edicao depois do cancelamento", async () => {
    const created = await ipc.invoke("create-budget", mainEvent, baseBudget());
    const canceled = await ipc.invoke("cancel-budget", mainEvent, created.id);
    const updatedAfterCancel = await ipc.invoke("update-budget", mainEvent, {
      ...baseBudget({ id: created.id }),
      id: created.id,
    });
    const duplicated = await ipc.invoke("duplicate-budget", mainEvent, created.id);
    const duplicateBudget = await db("orcamentos").where("id", duplicated.id).first();

    expect(canceled.success).toBe(true);
    expect(updatedAfterCancel.success).toBe(false);
    expect(updatedAfterCancel.error).toContain("em aberto");
    expect(duplicated.success).toBe(true);
    expect(duplicateBudget.status).toBe("ABERTO");
    expect(duplicateBudget.codigo).not.toBeNull();
  });

  it("converte orcamento em venda, baixa estoque e bloqueia dupla conversao", async () => {
    const created = await ipc.invoke("create-budget", mainEvent, baseBudget());

    const converted = await ipc.invoke("convert-budget-to-sale", mainEvent, {
      budgetId: created.id,
      pagamentos: [{ metodo: "Pix", valor: 50 }],
    });
    const budget = await db("orcamentos").where("id", created.id).first();
    const sale = await db("vendas").where("id", converted.saleId).first();
    const payment = await db("venda_pagamentos").where("venda_id", converted.saleId).first();
    const product = await db("produtos").where("id", 1).first();

    const duplicateConvert = await ipc.invoke("convert-budget-to-sale", mainEvent, {
      budgetId: created.id,
      pagamentos: [{ metodo: "Pix", valor: 50 }],
    });

    expect(converted.success).toBe(true);
    expect(sale.total_final).toBe(50);
    expect(payment.metodo).toBe("Pix");
    expect(product.estoque_atual).toBe(9);
    expect(budget.status).toBe("CONVERTIDO");
    expect(budget.venda_id_gerada).toBe(converted.saleId);
    expect(duplicateConvert.success).toBe(false);
    expect(duplicateConvert.error).toContain("em aberto");
  });

  it("bloqueia conversao fiado sem cliente e falha com estoque insuficiente", async () => {
    const noClientBudget = await ipc.invoke("create-budget", mainEvent, baseBudget({ cliente_id: null }));
    const fiadoWithoutClient = await ipc.invoke("convert-budget-to-sale", mainEvent, {
      budgetId: noClientBudget.id,
      pagamentos: [{ metodo: "Fiado", valor: 50 }],
    });

    await db("produtos").where("id", 1).update({ estoque_atual: 0 });
    const noStockBudget = await ipc.invoke("create-budget", mainEvent, baseBudget());
    const noStockConvert = await ipc.invoke("convert-budget-to-sale", mainEvent, {
      budgetId: noStockBudget.id,
      pagamentos: [{ metodo: "Dinheiro", valor: 50 }],
    });

    expect(fiadoWithoutClient.success).toBe(false);
    expect(fiadoWithoutClient.error).toContain("cliente selecionado");
    expect(noStockConvert.success).toBe(false);
    expect(noStockConvert.error).toContain("Estoque insuficiente");
  });
});
