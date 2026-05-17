import { describe, it, expect, beforeEach, afterEach } from "vitest";
import Knex from "knex";
import { register as registerEventLogs } from "../../electron/handlers/eventLogs.js";
import { createIpcHarness, eventFor } from "../helpers/ipc.js";

const createDb = () =>
  Knex({
    client: "sqlite3",
    connection: { filename: ":memory:" },
    useNullAsDefault: true,
  });

async function createSchema(db) {
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

describe("Handlers reais - event logs", () => {
  let db;
  let ipc;
  let mainEvent;

  beforeEach(async () => {
    db = createDb();
    await createSchema(db);
    ipc = createIpcHarness();
    mainEvent = eventFor(70);

    registerEventLogs(ipc.safeHandle, db);
  });

  afterEach(async () => {
    await db.destroy();
  });

  it("limita payload de log vindo da UI", async () => {
    const result = await ipc.invoke("log-event", mainEvent, {
      event_type: "ui.test",
      message: "m".repeat(2_000),
      payload: { data: "x".repeat(20_000) },
    });
    const row = await db("event_logs").first();

    expect(result.success).toBe(true);
    expect(row.message.length).toBe(1_003);
    expect(row.payload_json.length).toBe(10_003);
  });

  it("normaliza paginacao invalida e limita tamanho da pagina", async () => {
    const rows = Array.from({ length: 3 }, (_, index) => ({
      occurred_at_ms: Date.now() + index,
      event_category: "system",
      event_type: `event.${index}`,
      severity: "info",
      source: "test",
    }));
    await db("event_logs").insert(rows);

    const result = await ipc.invoke("get-event-logs", mainEvent, {
      page: -10,
      limit: 10_000,
    });

    expect(result.page).toBe(1);
    expect(result.total).toBe(3);
    expect(result.totalPages).toBe(1);
    expect(result.data).toHaveLength(3);
  });
});
