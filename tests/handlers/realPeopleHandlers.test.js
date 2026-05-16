import { describe, it, expect, beforeEach, afterEach } from "vitest";
import Knex from "knex";
import { createAuthSession } from "../../electron/lib/authSession.js";
import { hashPassword } from "../../electron/services/auth.js";
import { register as registerAuth } from "../../electron/handlers/auth.js";
import { register as registerPeople } from "../../electron/handlers/people.js";
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

  await db.schema.createTable("cargos", (t) => {
    t.increments("id").primary();
    t.string("nome").notNullable();
  });

  await db.schema.createTable("pessoas", (t) => {
    t.increments("id").primary();
    t.string("nome").notNullable();
    t.integer("cargo_id").notNullable();
    t.decimal("comissao_fixa", 10, 2).nullable();
    t.boolean("ativo").defaultTo(true);
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

describe("Handlers reais - pessoas e cargos", () => {
  let db;
  let ipc;
  let mainEvent;

  beforeEach(async () => {
    db = createDb();
    await createSchema(db);
    const authSession = createAuthSession();
    ipc = createIpcHarness();
    mainEvent = eventFor(50);

    registerAuth(ipc.safeHandle, db, authSession);
    registerPeople(ipc.safeHandle, db, authSession);
  });

  afterEach(async () => {
    await db.destroy();
  });

  async function loginAdmin() {
    await seedAdmin(db);
    return ipc.invoke("login-attempt", mainEvent, {
      username: "admin",
      password: "1234",
    });
  }

  it("bloqueia mutacoes de pessoas e cargos sem autorizacao admin", async () => {
    await seedAdmin(db);
    await db("cargos").insert({ id: 1, nome: "Vendedor" });

    const person = await ipc.invoke("save-person", mainEvent, {
      nome: "Joao",
      cargo_id: 1,
      comissao_fixa: 10,
    });
    const role = await ipc.invoke("save-role", mainEvent, "Trocador");
    const deleteRole = await ipc.invoke("delete-role", mainEvent, 1);

    expect(person.success).toBe(false);
    expect(role.success).toBe(false);
    expect(deleteRole.success).toBe(false);
    expect(person.error).toContain("administrador");
  });

  it("salva colaborador apenas com cargo existente e comissao valida", async () => {
    await loginAdmin();
    await db("cargos").insert({ id: 1, nome: "Vendedor" });

    const invalidRole = await ipc.invoke("save-person", mainEvent, {
      nome: "Joao",
      cargo_id: 999,
      comissao_fixa: 10,
    });
    const invalidCommission = await ipc.invoke("save-person", mainEvent, {
      nome: "Maria",
      cargo_id: 1,
      comissao_fixa: 101,
    });
    const valid = await ipc.invoke("save-person", mainEvent, {
      nome: "Maria",
      cargo_id: 1,
      comissao_fixa: 15,
    });
    const person = await db("pessoas").where("id", valid.id).first();

    expect(invalidRole.success).toBe(false);
    expect(invalidRole.error).toContain("Cargo nao encontrado");
    expect(invalidCommission.success).toBe(false);
    expect(invalidCommission.error).toContain("Comissao invalida");
    expect(valid.success).toBe(true);
    expect(person.nome).toBe("Maria");
    expect(Number(person.comissao_fixa)).toBe(15);
  });

  it("retorna erro controlado ao editar ou excluir colaborador inexistente", async () => {
    await loginAdmin();
    await db("cargos").insert({ id: 1, nome: "Vendedor" });

    const update = await ipc.invoke("save-person", mainEvent, {
      id: 999,
      nome: "Pessoa Ausente",
      cargo_id: 1,
      comissao_fixa: 10,
    });
    const remove = await ipc.invoke("delete-person", mainEvent, 999);

    expect(update.success).toBe(false);
    expect(update.error).toContain("Colaborador nao encontrado");
    expect(remove.success).toBe(false);
    expect(remove.error).toContain("Colaborador nao encontrado");
  });

  it("nao exclui cargo em uso por colaborador", async () => {
    await loginAdmin();
    await db("cargos").insert([
      { id: 1, nome: "Vendedor" },
      { id: 2, nome: "Trocador" },
    ]);
    await db("pessoas").insert({
      id: 1,
      nome: "Joao",
      cargo_id: 1,
      comissao_fixa: 10,
      ativo: 1,
    });

    const inUse = await ipc.invoke("delete-role", mainEvent, 1);
    const free = await ipc.invoke("delete-role", mainEvent, 2);
    const roles = await db("cargos").orderBy("id");

    expect(inUse.success).toBe(false);
    expect(inUse.error).toContain("Cargo em uso");
    expect(free.success).toBe(true);
    expect(roles.map((role) => role.id)).toEqual([1]);
  });

  it("impede cargo duplicado ignorando maiusculas e espacos", async () => {
    await loginAdmin();
    await db("cargos").insert({ id: 1, nome: "Vendedor" });

    const duplicate = await ipc.invoke("save-role", mainEvent, " vendedor ");
    const valid = await ipc.invoke("save-role", mainEvent, "Trocador");

    expect(duplicate.success).toBe(false);
    expect(duplicate.error).toContain("Cargo ja cadastrado");
    expect(valid.success).toBe(true);
  });
});
