import { describe, it, expect, beforeEach, afterEach } from "vitest";
import Knex from "knex";
import { register as registerDashboard } from "../../electron/handlers/dashboard.js";
import { createIpcHarness, eventFor } from "../helpers/ipc.js";

const createDb = () =>
  Knex({
    client: "sqlite3",
    connection: { filename: ":memory:" },
    useNullAsDefault: true,
  });

async function createSchema(db) {
  await db.schema.createTable("configuracoes", (t) => {
    t.string("chave").primary();
    t.string("valor");
  });

  await db.schema.createTable("pessoas", (t) => {
    t.increments("id").primary();
    t.string("nome").notNullable();
    t.decimal("comissao_fixa", 10, 2).nullable();
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
    t.decimal("subtotal", 10, 2).notNullable();
    t.decimal("mao_de_obra", 10, 2).nullable();
    t.decimal("desconto_valor", 10, 2).defaultTo(0);
    t.decimal("total_final", 10, 2).notNullable();
    t.datetime("data_venda");
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

  await db.schema.createTable("servicos_avulsos", (t) => {
    t.increments("id").primary();
    t.integer("trocador_id").notNullable();
    t.string("descricao").nullable();
    t.decimal("valor", 10, 2).notNullable();
    t.string("forma_pagamento").notNullable();
    t.datetime("data_servico");
  });
}

async function seedBase(db) {
  await db("configuracoes").insert([
    { chave: "comissao_padrao", valor: "0.3" },
    { chave: "comissao_usados", valor: "0.25" },
  ]);
  await db("pessoas").insert({ id: 1, nome: "Vendedor", comissao_fixa: null, ativo: 1 });
  await db("produtos").insert([
    {
      id: 1,
      codigo: "P001",
      descricao: "Produto Novo",
      custo: 50,
      preco_venda: 100,
      estoque_atual: 4,
      tipo: "novo",
      ativo: 1,
    },
    {
      id: 2,
      codigo: "P002",
      descricao: "Produto Inativo",
      custo: 10,
      preco_venda: 20,
      estoque_atual: 1,
      tipo: "novo",
      ativo: 0,
    },
  ]);
}

describe("Handlers reais - dashboard", () => {
  let db;
  let ipc;
  let mainEvent;

  beforeEach(async () => {
    db = createDb();
    await createSchema(db);
    await seedBase(db);
    ipc = createIpcHarness();
    mainEvent = eventFor(60);

    registerDashboard(ipc.safeHandle, db);
  });

  afterEach(async () => {
    await db.destroy();
  });

  it("dashboard ignora venda cancelada e soma servicos apenas em mao de obra", async () => {
    const today = Date.now();
    await db("vendas").insert([
      {
        id: 1,
        vendedor_id: 1,
        subtotal: 100,
        mao_de_obra: 20,
        desconto_valor: 0,
        total_final: 120,
        data_venda: today,
        cancelada: 0,
      },
      {
        id: 2,
        vendedor_id: 1,
        subtotal: 100,
        mao_de_obra: 0,
        desconto_valor: 0,
        total_final: 100,
        data_venda: today,
        cancelada: 1,
      },
    ]);
    await db("venda_itens").insert([
      {
        venda_id: 1,
        produto_id: 1,
        quantidade: 1,
        preco_unitario: 100,
        custo_unitario: 50,
      },
      {
        venda_id: 2,
        produto_id: 1,
        quantidade: 1,
        preco_unitario: 100,
        custo_unitario: 50,
      },
    ]);
    await db("servicos_avulsos").insert({
      trocador_id: 1,
      descricao: "Servico avulso",
      valor: 30,
      forma_pagamento: "Saida",
      data_servico: today,
    });

    const stats = await ipc.invoke("get-dashboard-stats", mainEvent);

    expect(stats.vendasCount).toBe(1);
    expect(stats.faturamento).toBe(100);
    expect(stats.maoDeObra).toBe(50);
    expect(stats.comissoes).toBe(30);
    expect(stats.lucro).toBe(20);
  });

  it("grafico semanal trata mao de obra nula como zero", async () => {
    const today = Date.now();
    await db("vendas").insert({
      id: 1,
      vendedor_id: 1,
      subtotal: 100,
      mao_de_obra: null,
      desconto_valor: 0,
      total_final: 100,
      data_venda: today,
      cancelada: 0,
    });

    const weekly = await ipc.invoke("get-weekly-sales", mainEvent);

    expect(weekly.data).toHaveLength(7);
    expect(weekly.data[6]).toBe(100);
  });

  it("estatisticas de estoque consideram apenas produtos ativos", async () => {
    const stats = await ipc.invoke("get-inventory-stats", mainEvent);
    const lowStock = await ipc.invoke("get-low-stock", mainEvent);

    expect(stats.custoTotal).toBe(200);
    expect(stats.vendaPotencial).toBe(400);
    expect(stats.lucroProjetado).toBe(200);
    expect(stats.totalItensFisicos).toBe(4);
    expect(lowStock).toHaveLength(1);
    expect(lowStock[0].id).toBe(1);
  });
});
