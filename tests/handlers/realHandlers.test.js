import { describe, it, expect, beforeEach, afterEach } from "vitest";
import Knex from "knex";
import { createAuthSession } from "../../electron/lib/authSession.js";
import { hashPassword } from "../../electron/services/auth.js";
import { createIpcHarness, eventFor } from "../helpers/ipc.js";
import { register as registerAuth } from "../../electron/handlers/auth.js";
import { register as registerClients } from "../../electron/handlers/clients.js";
import { register as registerConfig } from "../../electron/handlers/config.js";

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

  await db.schema.createTable("configuracoes", (t) => {
    t.string("chave").primary();
    t.string("valor");
  });

  await db.schema.createTable("clientes", (t) => {
    t.increments("id").primary();
    t.string("nome").notNullable();
    t.string("telefone").nullable();
    t.string("documento").nullable();
    t.string("endereco").nullable();
    t.text("observacoes").nullable();
    t.decimal("limite_credito", 10, 2).defaultTo(0);
    t.boolean("ativo").defaultTo(true);
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
}

async function seedUser(db, { id, username, password, cargo }) {
  const { salt, hash } = hashPassword(password);
  await db("usuarios").insert({
    id,
    nome: username,
    username,
    password_hash: hash,
    salt,
    cargo,
    ativo: 1,
  });
}

describe("Handlers reais - autorizacao e contratos IPC", () => {
  let db;
  let authSession;
  let ipc;
  let mainEvent;

  beforeEach(async () => {
    db = createDb();
    await createSchema(db);
    authSession = createAuthSession();
    ipc = createIpcHarness();
    mainEvent = eventFor(10);

    registerAuth(ipc.safeHandle, db, authSession);
    registerClients(ipc.safeHandle, db, authSession);
    registerConfig(ipc.safeHandle, db, {}, authSession);
  });

  afterEach(async () => {
    await db.destroy();
  });

  it("permite register-user sem sessao apenas no bootstrap inicial", async () => {
    const first = await ipc.invoke("register-user", mainEvent, {
      nome: "Admin",
      username: "admin",
      password: "1234",
      cargo: "admin",
    });
    const second = await ipc.invoke("register-user", mainEvent, {
      nome: "Outro",
      username: "outro",
      password: "1234",
      cargo: "admin",
    });

    expect(first.success).toBe(true);
    expect(second.success).toBe(false);
    expect(second.error).toContain("administrador");
  });

  it("valida dados de register-user sem quebrar bootstrap", async () => {
    const missingName = await ipc.invoke("register-user", mainEvent, {
      nome: "",
      username: "admin",
      password: "1234",
      cargo: "admin",
    });
    const weakPassword = await ipc.invoke("register-user", mainEvent, {
      nome: "Admin",
      username: "admin",
      password: "123",
      cargo: "admin",
    });
    const invalidRole = await ipc.invoke("register-user", mainEvent, {
      nome: "Admin",
      username: "admin",
      password: "1234",
      cargo: "root",
    });
    const valid = await ipc.invoke("register-user", mainEvent, {
      nome: "Admin",
      username: " admin ",
      password: "1234",
      cargo: "ADMIN",
    });
    const user = await db("usuarios").where("username", "admin").first();

    expect(missingName.success).toBe(false);
    expect(weakPassword.success).toBe(false);
    expect(invalidRole.success).toBe(false);
    expect(valid.success).toBe(true);
    expect(user.nome).toBe("Admin");
    expect(user.cargo).toBe("admin");
  });

  it("login-attempt cria sessao e logout-session remove acesso admin", async () => {
    await seedUser(db, { id: 1, username: "admin", password: "1234", cargo: "admin" });

    const login = await ipc.invoke("login-attempt", mainEvent, {
      username: "admin",
      password: "1234",
    });
    const saveBeforeLogout = await ipc.invoke("save-config", mainEvent, "comissao_padrao", "0.3");
    const logout = await ipc.invoke("logout-session", mainEvent);
    const saveAfterLogout = await ipc.invoke("save-config", mainEvent, "comissao_padrao", "0.25");

    expect(login.success).toBe(true);
    expect(saveBeforeLogout.success).toBe(true);
    expect(logout.success).toBe(true);
    expect(saveAfterLogout.success).toBe(false);
    expect(saveAfterLogout.error).toContain("administrador");
  });

  it("delete-user bloqueia ultimo admin e permite remover admin excedente", async () => {
    await seedUser(db, { id: 1, username: "admin", password: "1234", cargo: "admin" });
    await seedUser(db, { id: 2, username: "admin2", password: "1234", cargo: "admin" });

    await ipc.invoke("login-attempt", mainEvent, {
      username: "admin",
      password: "1234",
    });
    const removeSecond = await ipc.invoke("delete-user", mainEvent, 2);
    const removeLast = await ipc.invoke("delete-user", mainEvent, 1);
    const users = await db("usuarios").orderBy("id");

    expect(removeSecond.success).toBe(true);
    expect(removeLast.success).toBe(false);
    expect(removeLast.error).toContain("ultimo administrador");
    expect(users[0].ativo).toBe(1);
    expect(users[1].ativo).toBe(0);
  });

  it("verify-admin concede autorizacao temporaria sem trocar usuario original", async () => {
    await seedUser(db, { id: 1, username: "admin", password: "1234", cargo: "admin" });
    await seedUser(db, { id: 2, username: "caixa", password: "1234", cargo: "caixa" });

    await ipc.invoke("login-attempt", mainEvent, {
      username: "caixa",
      password: "1234",
    });
    const verify = await ipc.invoke("verify-admin", mainEvent, {
      username: "admin",
      password: "1234",
    });
    const saveConfig = await ipc.invoke("save-config", mainEvent, "comissao_padrao", "0.3");

    expect(verify.success).toBe(true);
    expect(authSession.getUser(mainEvent).cargo).toBe("caixa");
    expect(saveConfig.success).toBe(true);
  });

  it("pay-debt usa handler real e exige autorizacao admin", async () => {
    await seedUser(db, { id: 1, username: "admin", password: "1234", cargo: "admin" });
    await db("clientes").insert({ id: 1, nome: "Maria", ativo: 1 });
    const [contaId] = await db("contas_receber").insert({
      cliente_id: 1,
      descricao: "Venda #1",
      valor_total: 100,
      valor_pago: 0,
      status: "PENDENTE",
    });

    const blocked = await ipc.invoke("pay-debt", mainEvent, { contaId, valorPago: 40 });
    await ipc.invoke("login-attempt", mainEvent, {
      username: "admin",
      password: "1234",
    });
    const paid = await ipc.invoke("pay-debt", mainEvent, { contaId, valorPago: 40 });
    const conta = await db("contas_receber").where("id", contaId).first();

    expect(blocked.success).toBe(false);
    expect(blocked.error).toContain("administrador");
    expect(paid.success).toBe(true);
    expect(Number(conta.valor_pago)).toBe(40);
    expect(conta.status).toBe("PARCIAL");
  });

  it("save-client normaliza documento duplicado e preserva atualizacao parcial", async () => {
    await db("clientes").insert({
      id: 1,
      nome: "Maria",
      telefone: "(11) 99999-9999",
      documento: "123.456.789-00",
      endereco: "Rua A",
      ativo: 1,
    });

    const duplicate = await ipc.invoke("save-client", mainEvent, {
      nome: "Outra Maria",
      documento: "12345678900",
    });
    const partial = await ipc.invoke("save-client", mainEvent, {
      id: 1,
      documento: "111.222.333-44",
    });
    const client = await db("clientes").where("id", 1).first();

    expect(duplicate.success).toBe(false);
    expect(duplicate.error).toContain("CPF/CNPJ");
    expect(partial.success).toBe(true);
    expect(client.nome).toBe("Maria");
    expect(client.telefone).toBe("(11) 99999-9999");
    expect(client.endereco).toBe("Rua A");
    expect(client.documento).toBe("111.222.333-44");
  });

  it("cliente ignora contas canceladas como saldo aberto e pagamento", async () => {
    await seedUser(db, { id: 1, username: "admin", password: "1234", cargo: "admin" });
    await db("clientes").insert({ id: 1, nome: "Maria", ativo: 1 });
    const [contaId] = await db("contas_receber").insert({
      cliente_id: 1,
      descricao: "Venda cancelada",
      valor_total: 100,
      valor_pago: 0,
      status: "CANCELADO",
    });

    const clients = await ipc.invoke("get-clients", mainEvent);
    await ipc.invoke("login-attempt", mainEvent, {
      username: "admin",
      password: "1234",
    });
    const pay = await ipc.invoke("pay-debt", mainEvent, { contaId, valorPago: 10 });
    const remove = await ipc.invoke("delete-client", mainEvent, 1);
    const client = await db("clientes").where("id", 1).first();

    expect(Number(clients[0].saldo_devedor)).toBe(0);
    expect(pay.success).toBe(false);
    expect(pay.error).toContain("nao esta aberta");
    expect(remove.success).toBe(true);
    expect(client.ativo).toBe(0);
  });
});
