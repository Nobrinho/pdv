import { describe, it, expect, beforeEach, afterEach } from "vitest";
import Knex from "knex";

const createDb = () => Knex({
  client: "sqlite3",
  connection: { filename: ":memory:" },
  useNullAsDefault: true,
});

async function criarSchema(db) {
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
    t.integer("produto_id").references("id").inTable("produtos");
    t.decimal("preco_antigo", 10, 2).nullable();
    t.decimal("preco_novo", 10, 2).nullable();
    t.integer("estoque_antigo").nullable();
    t.integer("estoque_novo").nullable();
    t.string("tipo_alteracao");
    t.datetime("data_alteracao");
  });
}

async function seedDados(db) {
  await db("produtos").insert([
    { id: 1, codigo: "P001", descricao: "Produto Teste A", custo: 50, preco_venda: 100, estoque_atual: 10, tipo: "novo", ativo: true },
    { id: 2, codigo: "P002", descricao: "Produto Teste B", custo: 30, preco_venda: 80, estoque_atual: 5, tipo: "usado", ativo: true },
    { id: 3, codigo: "P003", descricao: "Produto Excluido", custo: 10, preco_venda: 20, estoque_atual: 0, tipo: "novo", ativo: false },
  ]);
}

// ============================
// Funções de negócio (portadas de products.js)
// ============================

async function saveProduct(db, product) {
  if (product.id) {
    const atual = await db("produtos").where("id", product.id).first();
    await db("produtos").where("id", product.id).update(product);

    if (
      parseFloat(atual.preco_venda) !== parseFloat(product.preco_venda) ||
      parseInt(atual.estoque_atual) !== parseInt(product.estoque_atual)
    ) {
      await db("historico_produtos").insert({
        produto_id: product.id,
        preco_antigo: atual.preco_venda,
        preco_novo: product.preco_venda,
        estoque_antigo: atual.estoque_atual,
        estoque_novo: product.estoque_atual,
        tipo_alteracao: "atualizacao",
        data_alteracao: Date.now(),
      });
    }
    return { id: product.id, success: true };
  } else {
    if (!product.codigo) product.codigo = "AUTO-" + Date.now();
    const [id] = await db("produtos").insert({ ...product, ativo: true });

    await db("historico_produtos").insert({
      produto_id: id,
      preco_novo: product.preco_venda,
      estoque_novo: product.estoque_atual,
      tipo_alteracao: "cadastro_inicial",
      data_alteracao: Date.now(),
    });
    return { id, success: true };
  }
}

async function importProductsBatch(db, products, conflictMode) {
  const trx = await db.transaction();
  const results = { created: 0, updated: 0, skipped: 0, errors: [] };

  try {
    for (const [index, product] of products.entries()) {
      try {
        if (!product.descricao || !String(product.descricao).trim()) {
          results.errors.push({ row: index + 1, error: "Descrição obrigatória" });
          continue;
        }

        const safeDesc = String(product.descricao).trim();
        const safeCod = product.codigo ? String(product.codigo).trim() : null;

        const existing = safeCod
          ? await trx("produtos").where("codigo", safeCod).first()
          : null;

        if (existing && conflictMode === "skip") {
          results.skipped++;
          continue;
        }

        if (existing) {
          const updates = {
            descricao: safeDesc,
            custo: parseFloat(product.custo || existing.custo),
            preco_venda: parseFloat(product.preco_venda || existing.preco_venda),
            estoque_atual: parseInt(product.estoque_atual ?? existing.estoque_atual),
            tipo: product.tipo || existing.tipo,
            ativo: true,
          };
          await trx("produtos").where("id", existing.id).update(updates);

          if (
            parseFloat(existing.preco_venda) !== updates.preco_venda ||
            parseInt(existing.estoque_atual) !== updates.estoque_atual
          ) {
            await trx("historico_produtos").insert({
              produto_id: existing.id,
              preco_antigo: existing.preco_venda,
              preco_novo: updates.preco_venda,
              estoque_antigo: existing.estoque_atual,
              estoque_novo: updates.estoque_atual,
              tipo_alteracao: "atualizacao_lote",
              data_alteracao: Date.now(),
            });
          }
          results.updated++;
        } else {
          const codigo = safeCod || ("AUTO-" + Date.now() + "-" + index);
          const [id] = await trx("produtos").insert({
            codigo,
            descricao: safeDesc,
            custo: parseFloat(product.custo || 0),
            preco_venda: parseFloat(product.preco_venda || 0),
            estoque_atual: parseInt(product.estoque_atual || 0),
            tipo: product.tipo || "novo",
            ativo: true,
          });

          await trx("historico_produtos").insert({
            produto_id: id,
            preco_novo: parseFloat(product.preco_venda || 0),
            estoque_novo: parseInt(product.estoque_atual || 0),
            tipo_alteracao: "cadastro_lote",
            data_alteracao: Date.now(),
          });
          results.created++;
        }
      } catch (rowError) {
        results.errors.push({ row: index + 1, error: rowError.message });
      }
    }

    await trx.commit();
    return { success: true, ...results };
  } catch (error) {
    await trx.rollback();
    return { success: false, error: error.message };
  }
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

describe("Produtos - CRUD Básico", () => {
  it("cadastrar um produto gera histórico", async () => {
    const p = { codigo: "P999", descricao: "Produto Novo", custo: 10, preco_venda: 25, estoque_atual: 100, tipo: "novo" };
    const res = await saveProduct(db, p);
    
    expect(res.success).toBe(true);

    const checkP = await db("produtos").where("id", res.id).first();
    expect(checkP.codigo).toBe("P999");

    const hist = await db("historico_produtos").where("produto_id", res.id).first();
    expect(hist.tipo_alteracao).toBe("cadastro_inicial");
    expect(hist.preco_novo).toBe(25);
  });

  it("editar preço/estoque de produto gera histórico de atualização", async () => {
    const pt = { id: 1, descricao: "Produto Teste A", custo: 50, preco_venda: 150, estoque_atual: 12, tipo: "novo" };
    await saveProduct(db, pt);
    
    const hist = await db("historico_produtos").where("produto_id", 1).first();
    
    expect(hist).toBeDefined();
    expect(hist.tipo_alteracao).toBe("atualizacao");
    expect(hist.preco_antigo).toBe(100);
    expect(hist.preco_novo).toBe(150);
    expect(hist.estoque_antigo).toBe(10);
    expect(hist.estoque_novo).toBe(12);
  });
  
  it("editar apenas a descrição não gera histórico", async () => {
    const pt = { id: 1, descricao: "Descricao Modificada", custo: 50, preco_venda: 100, estoque_atual: 10, tipo: "novo" };
    await saveProduct(db, pt);
    
    const hist = await db("historico_produtos").where("produto_id", 1).first();
    
    expect(hist).toBeUndefined(); // Nenhum histórico deve ter sido gerado
  });
});

describe("Produtos - Importação em Lote", () => {
  it("falha validando descricao em obrigatoria", async () => {
    const lote = [{ codigo: "X1", custo: 10, preco_venda: 20 }];
    const result = await importProductsBatch(db, lote, "update");
    
    expect(result.success).toBe(true);
    expect(result.errors.length).toBe(1);
    expect(result.errors[0].error).toContain("Descrição obrigatória");
  });

  it("conflito 'skip': não atualiza produto existente", async () => {
    const lote = [
      { codigo: "P001", descricao: "Produto A - Tentativa Lote", custo: 60, preco_venda: 120, estoque_atual: 20, tipo: "novo" }
    ];
    const result = await importProductsBatch(db, lote, "skip");

    expect(result.success).toBe(true);
    expect(result.skipped).toBe(1);
    expect(result.updated).toBe(0);

    const p = await db("produtos").where("id", 1).first();
    expect(p.descricao).toBe("Produto Teste A"); // Continua original
  });

  it("conflito 'update': sobrescreve produto existente e gera histórico", async () => {
    const lote = [
      { codigo: "P001", descricao: "Produto Teste A", custo: 50, preco_venda: 150, estoque_atual: 30, tipo: "novo" }
    ];
    const result = await importProductsBatch(db, lote, "update");

    expect(result.success).toBe(true);
    expect(result.updated).toBe(1);
    expect(result.skipped).toBe(0);

    const p = await db("produtos").where("id", 1).first();
    expect(p.preco_venda).toBe(150);
    expect(p.estoque_atual).toBe(30);

    const hist = await db("historico_produtos").where("produto_id", 1).first();
    expect(hist.tipo_alteracao).toBe("atualizacao_lote");
  });

  it("conflito 'update': reativa produto inativo", async () => {
    // P003 é id 3 e está inativo
    const lote = [
      { codigo: "P003", descricao: "Produto Reativado", custo: 10, preco_venda: 25, estoque_atual: 5, tipo: "novo" }
    ];
    const result = await importProductsBatch(db, lote, "update");

    expect(result.success).toBe(true);
    expect(result.updated).toBe(1);

    const p = await db("produtos").where("id", 3).first();
    expect(p.ativo).toBe(1); // Foi reativado
    expect(p.descricao).toBe("Produto Reativado");
  });
  
  it("lote numerico e espacos: trata trim() corretamente", async () => {
    const lote = [
      { codigo: 12345, descricao: 76543, custo: 10, preco_venda: 25, estoque_atual: 5, tipo: "novo" }
    ];
    const result = await importProductsBatch(db, lote, "update");

    expect(result.success).toBe(true);
    expect(result.created).toBe(1);

    const p = await db("produtos").where("codigo", "12345").first();
    expect(p.descricao).toBe("76543");
  });
});
