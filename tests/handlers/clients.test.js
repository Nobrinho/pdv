import { describe, it, expect, beforeEach, afterEach } from "vitest";
import Knex from "knex";

const createDb = () => Knex({
  client: "sqlite3",
  connection: { filename: ":memory:" },
  useNullAsDefault: true,
});

async function criarSchema(db) {
  await db.schema.createTable("clientes", (t) => {
    t.increments("id").primary();
    t.string("nome").notNullable();
    t.string("telefone").nullable();
    t.string("documento").nullable();
    t.string("endereco").nullable();
    t.decimal("limite_credito", 10, 2).defaultTo(0);
    t.boolean("ativo").defaultTo(true);
  });
  await db.schema.createTable("vendas", (t) => {
    t.increments("id").primary();
    t.decimal("total_final", 10, 2);
    t.integer("cliente_id").references("id").inTable("clientes").nullable();
  });
  await db.schema.createTable("contas_receber", (t) => {
    t.increments("id").primary();
    t.integer("cliente_id").references("id").inTable("clientes").notNullable();
    t.integer("venda_id").references("id").inTable("vendas").nullable();
    t.string("descricao").notNullable();
    t.decimal("valor_total", 10, 2).notNullable();
    t.decimal("valor_pago", 10, 2).defaultTo(0);
    t.string("status").defaultTo("PENDENTE");
  });
}

async function seedDados(db) {
  await db("clientes").insert([
    { id: 1, nome: "Maria", documento: "123.456.789-00", ativo: true },
    { id: 2, nome: "José", documento: "987.654.321-00", ativo: true },
  ]);
}

// ============================
// Funções de negócio (portadas do main.js)
// ============================

async function salvarCliente(db, client) {
  if (client.documento) {
    if (client.id) {
      const existing = await db("clientes")
        .where("documento", client.documento)
        .where("ativo", true)
        .whereNot("id", client.id)
        .first();
      if (existing) {
        return { success: false, error: "CPF/CNPJ já cadastrado para outro cliente." };
      }
    } else {
      const existing = await db("clientes")
        .where("documento", client.documento)
        .where("ativo", true)
        .first();
      if (existing) {
        return { success: false, error: "CPF/CNPJ já cadastrado para outro cliente." };
      }
    }
  }

  if (client.id) {
    await db("clientes").where("id", client.id).update(client);
    return { success: true };
  } else {
    const [id] = await db("clientes").insert({ ...client, ativo: true });
    return { success: true, id };
  }
}

async function deletarCliente(db, id) {
  const dividas = await db("contas_receber")
    .where("cliente_id", id)
    .whereNot("status", "PAGO")
    .first();

  if (dividas) {
    return { success: false, error: "Cliente possui débitos pendentes." };
  }

  await db("clientes").where("id", id).update({ ativo: false });
  return { success: true };
}

async function buscarClientePorDoc(db, documento) {
  const clean = documento ? documento.replace(/\D/g, "") : "";
  if (!clean) return { success: false, client: null };

  // Versão otimizada (Fase 5)
  const found = await db("clientes")
    .where("ativo", true)
    .whereRaw("REPLACE(REPLACE(REPLACE(documento, '.', ''), '-', ''), '/', '') = ?", [clean])
    .first();

  return { success: true, client: found || null };
}

// ============================
// Testes
// ============================

let db;

beforeEach(async () => {
  db = createDb();
  await criarSchema(db);
  await seedDados(db);
});

afterEach(async () => {
  await db.destroy();
});

describe("Clientes - Validação de CPF/CNPJ", () => {
  it("rejeita CPF duplicado na inserção", async () => {
    const result = await salvarCliente(db, {
      nome: "Duplicado",
      documento: "123.456.789-00",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("já cadastrado");
  });

  it("rejeita CPF duplicado na edição (pertence a outro)", async () => {
    const result = await salvarCliente(db, {
      id: 2,
      nome: "José",
      documento: "123.456.789-00",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("já cadastrado");
  });

  it("permite editar mantendo o próprio CPF", async () => {
    const result = await salvarCliente(db, {
      id: 1,
      nome: "Maria Atualizada",
      documento: "123.456.789-00",
    });

    expect(result.success).toBe(true);
  });
});

describe("Clientes - Deleção com Dívida", () => {
  it("bloqueia deleção de cliente com dívida pendente", async () => {
    await db("contas_receber").insert({
      cliente_id: 1,
      descricao: "Teste",
      valor_total: 100,
      valor_pago: 0,
      status: "PENDENTE",
    });

    const result = await deletarCliente(db, 1);

    expect(result.success).toBe(false);
    expect(result.error).toContain("débitos pendentes");
  });

  it("permite deleção se dívida está paga", async () => {
    await db("contas_receber").insert({
      cliente_id: 1,
      descricao: "Teste",
      valor_total: 100,
      valor_pago: 100,
      status: "PAGO",
    });

    const result = await deletarCliente(db, 1);

    expect(result.success).toBe(true);
  });
});

describe("Clientes - Busca por Documento", () => {
  it("encontra cliente por CPF com máscara", async () => {
    const result = await buscarClientePorDoc(db, "123.456.789-00");
    expect(result.success).toBe(true);
    expect(result.client).toBeDefined();
    expect(result.client.nome).toBe("Maria");
  });

  it("encontra cliente por CPF limpo (sem máscara)", async () => {
    const result = await buscarClientePorDoc(db, "12345678900");
    expect(result.success).toBe(true);
    expect(result.client).toBeDefined();
    expect(result.client.nome).toBe("Maria");
  });
});
