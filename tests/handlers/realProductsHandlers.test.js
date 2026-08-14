import { describe, it, expect, beforeEach, afterEach } from "vitest";
import Knex from "knex";
import { createAuthSession } from "../../apps/pdv/electron/lib/authSession.js";
import { hashPassword } from "../../apps/pdv/electron/services/auth.js";
import { register as registerAuth } from "../../apps/pdv/electron/handlers/auth.js";
import { register as registerProducts } from "../../apps/pdv/electron/handlers/products.js";
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

  await db.schema.createTable("historico_produtos", (t) => {
    t.increments("id").primary();
    t.integer("produto_id").notNullable();
    t.decimal("preco_antigo", 10, 2).nullable();
    t.decimal("preco_novo", 10, 2).nullable();
    t.integer("estoque_antigo").nullable();
    t.integer("estoque_novo").nullable();
    t.string("tipo_alteracao");
    t.datetime("data_alteracao");
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

async function seedProduct(db) {
  await db("produtos").insert({
    id: 1,
    codigo: "P001",
    descricao: "Produto Teste",
    custo: 50,
    preco_venda: 100,
    estoque_atual: 10,
    tipo: "novo",
    ativo: 1,
  });
}

describe("Handlers reais - produtos", () => {
  let db;
  let ipc;
  let mainEvent;

  beforeEach(async () => {
    db = createDb();
    await createSchema(db);
    const authSession = createAuthSession();
    ipc = createIpcHarness();
    mainEvent = eventFor(40);

    registerAuth(ipc.safeHandle, db, authSession);
    registerProducts(ipc.safeHandle, db, authSession);
  });

  afterEach(async () => {
    await db.destroy();
  });

  it("bloqueia mutacoes de produto sem autorizacao admin", async () => {
    await seedAdmin(db);
    await seedProduct(db);

    const save = await ipc.invoke("save-product", mainEvent, {
      codigo: "P002",
      descricao: "Produto Novo",
      custo: 10,
      preco_venda: 20,
      estoque_atual: 5,
      tipo: "novo",
    });
    const remove = await ipc.invoke("delete-product", mainEvent, 1);
    const batch = await ipc.invoke("import-products-batch", mainEvent, {
      products: [{ codigo: "P003", descricao: "Lote", custo: 1, preco_venda: 2 }],
      conflictMode: "update",
    });
    const products = await db("produtos");

    expect(save.success).toBe(false);
    expect(remove.success).toBe(false);
    expect(batch.success).toBe(false);
    expect(products).toHaveLength(1);
    expect(products[0].ativo).toBe(1);
  });

  it("salva produto com admin e registra historico inicial", async () => {
    await seedAdmin(db);
    await ipc.invoke("login-attempt", mainEvent, {
      username: "admin",
      password: "1234",
    });

    const result = await ipc.invoke("save-product", mainEvent, {
      codigo: "P002",
      descricao: "Produto Novo",
      custo: 10,
      preco_venda: 20,
      estoque_atual: 5,
      tipo: "novo",
    });
    const product = await db("produtos").where("id", result.id).first();
    const history = await db("historico_produtos")
      .where("produto_id", result.id)
      .first();

    expect(result.success).toBe(true);
    expect(product.codigo).toBe("P002");
    expect(history.tipo_alteracao).toBe("cadastro_inicial");
    expect(Number(history.preco_novo)).toBe(20);
  });

  it("atualiza produto com admin e registra historico apenas para preco ou estoque", async () => {
    await seedAdmin(db);
    await seedProduct(db);
    await ipc.invoke("login-attempt", mainEvent, {
      username: "admin",
      password: "1234",
    });

    const result = await ipc.invoke("save-product", mainEvent, {
      id: 1,
      codigo: "P001",
      descricao: "Produto Teste",
      custo: 50,
      preco_venda: 125,
      estoque_atual: 12,
      tipo: "novo",
    });
    const product = await db("produtos").where("id", 1).first();
    const history = await db("historico_produtos").where("produto_id", 1).first();

    expect(result.success).toBe(true);
    expect(Number(product.preco_venda)).toBe(125);
    expect(product.estoque_atual).toBe(12);
    expect(history.tipo_alteracao).toBe("atualizacao");
    expect(Number(history.preco_antigo)).toBe(100);
    expect(Number(history.preco_novo)).toBe(125);
  });

  it("retorna erro controlado ao editar produto inexistente", async () => {
    await seedAdmin(db);
    await ipc.invoke("login-attempt", mainEvent, {
      username: "admin",
      password: "1234",
    });

    const result = await ipc.invoke("save-product", mainEvent, {
      id: 999,
      codigo: "NAO-EXISTE",
      descricao: "Produto Inexistente",
      custo: 10,
      preco_venda: 20,
      estoque_atual: 5,
      tipo: "novo",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("Produto nao encontrado");
  });

  it("importacao em lote com admin respeita skip e nao altera produto existente", async () => {
    await seedAdmin(db);
    await seedProduct(db);
    await ipc.invoke("login-attempt", mainEvent, {
      username: "admin",
      password: "1234",
    });

    const result = await ipc.invoke("import-products-batch", mainEvent, {
      products: [
        {
          codigo: "P001",
          descricao: "Produto Alterado",
          custo: 60,
          preco_venda: 200,
          estoque_atual: 99,
          tipo: "novo",
        },
      ],
      conflictMode: "skip",
    });
    const product = await db("produtos").where("id", 1).first();

    expect(result.success).toBe(true);
    expect(result.skipped).toBe(1);
    expect(Number(product.preco_venda)).toBe(100);
    expect(product.estoque_atual).toBe(10);
  });

  it("importacao em lote rejeita valores numericos invalidos sem gravar produto", async () => {
    await seedAdmin(db);
    await ipc.invoke("login-attempt", mainEvent, {
      username: "admin",
      password: "1234",
    });

    const result = await ipc.invoke("import-products-batch", mainEvent, {
      products: [
        {
          codigo: "INV-1",
          descricao: "Produto Invalido",
          custo: -1,
          preco_venda: 20,
          estoque_atual: 5,
          tipo: "novo",
        },
        {
          codigo: "INV-2",
          descricao: "Produto Invalido 2",
          custo: 1,
          preco_venda: "abc",
          estoque_atual: 5,
          tipo: "novo",
        },
        {
          codigo: "INV-3",
          descricao: "Produto Invalido 3",
          custo: 1,
          preco_venda: 20,
          estoque_atual: 1.5,
          tipo: "novo",
        },
      ],
      conflictMode: "update",
    });
    const products = await db("produtos");

    expect(result.success).toBe(true);
    expect(result.created).toBe(0);
    expect(result.errors).toHaveLength(3);
    expect(products).toHaveLength(0);
  });

  it("importacao em lote permite zerar preco e estoque de produto existente", async () => {
    await seedAdmin(db);
    await seedProduct(db);
    await ipc.invoke("login-attempt", mainEvent, {
      username: "admin",
      password: "1234",
    });

    const result = await ipc.invoke("import-products-batch", mainEvent, {
      products: [
        {
          codigo: "P001",
          descricao: "Produto Teste",
          custo: 0,
          preco_venda: 0,
          estoque_atual: 0,
          tipo: "novo",
        },
      ],
      conflictMode: "update",
    });
    const product = await db("produtos").where("id", 1).first();
    const history = await db("historico_produtos").where("produto_id", 1).first();

    expect(result.success).toBe(true);
    expect(result.updated).toBe(1);
    expect(Number(product.custo)).toBe(0);
    expect(Number(product.preco_venda)).toBe(0);
    expect(product.estoque_atual).toBe(0);
    expect(history.tipo_alteracao).toBe("atualizacao_lote");
  });
});
