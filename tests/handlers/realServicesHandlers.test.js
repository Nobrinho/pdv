import { describe, it, expect, beforeEach, afterEach } from "vitest";
import Knex from "knex";
import { register as registerServices } from "../../electron/handlers/services.js";
import { createIpcHarness, eventFor } from "../helpers/ipc.js";

const createDb = () =>
  Knex({
    client: "sqlite3",
    connection: { filename: ":memory:" },
    useNullAsDefault: true,
  });

async function createSchema(db) {
  await db.schema.createTable("pessoas", (t) => {
    t.increments("id").primary();
    t.string("nome").notNullable();
    t.boolean("ativo").defaultTo(true);
  });

  await db.schema.createTable("servicos_avulsos", (t) => {
    t.increments("id").primary();
    t.integer("trocador_id").notNullable();
    t.string("descricao").nullable();
    t.decimal("valor", 10, 2).notNullable();
    t.string("forma_pagamento").notNullable();
    t.datetime("data_servico");
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

describe("Handlers reais - servicos", () => {
  let db;
  let ipc;
  let mainEvent;

  beforeEach(async () => {
    db = createDb();
    await createSchema(db);
    ipc = createIpcHarness();
    mainEvent = eventFor(30);

    registerServices(ipc.safeHandle, db);
  });

  afterEach(async () => {
    await db.destroy();
  });

  it("impede servico avulso com responsavel inexistente ou inativo", async () => {
    await db("pessoas").insert([
      { id: 1, nome: "Trocador Ativo", ativo: 1 },
      { id: 2, nome: "Trocador Inativo", ativo: 0 },
    ]);

    const missing = await ipc.invoke("create-service", mainEvent, {
      trocador_id: 999,
      descricao: "Servico externo",
      valor: 50,
      forma_pagamento: "Saida",
    });
    const inactive = await ipc.invoke("create-service", mainEvent, {
      trocador_id: 2,
      descricao: "Servico externo",
      valor: 50,
      forma_pagamento: "Saida",
    });
    const valid = await ipc.invoke("create-service", mainEvent, {
      trocador_id: 1,
      descricao: "Servico externo",
      valor: 50,
      forma_pagamento: "Saida",
    });
    const rows = await db("servicos_avulsos");

    expect(missing.success).toBe(false);
    expect(missing.error).toContain("Responsavel");
    expect(inactive.success).toBe(false);
    expect(inactive.error).toContain("Responsavel");
    expect(valid.success).toBe(true);
    expect(rows).toHaveLength(1);
    expect(rows[0].trocador_id).toBe(1);
  });
});
