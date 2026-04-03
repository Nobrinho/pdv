import { describe, it, expect, beforeEach, afterEach } from "vitest";
import Knex from "knex";

const createDb = () => Knex({
  client: "sqlite3",
  connection: { filename: ":memory:" },
  useNullAsDefault: true,
});


async function criarSchema(db) {
  await db.schema.createTable("configuracoes", (t) => {
    t.string("chave").primary();
    t.string("valor");
  });
  await db.schema.createTable("cargos", (t) => {
    t.increments("id").primary();
    t.string("nome").notNullable();
  });
  await db.schema.createTable("pessoas", (t) => {
    t.increments("id").primary();
    t.string("nome").notNullable();
    t.decimal("comissao_fixa", 10, 2).nullable();
    t.integer("cargo_id").references("id").inTable("cargos");
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
  await db.schema.createTable("clientes", (t) => {
    t.increments("id").primary();
    t.string("nome").notNullable();
    t.string("telefone").nullable();
    t.string("documento").nullable();
    t.boolean("ativo").defaultTo(true);
  });
  await db.schema.createTable("vendas", (t) => {
    t.increments("id").primary();
    t.integer("vendedor_id").references("id").inTable("pessoas");
    t.integer("trocador_id").references("id").inTable("pessoas").nullable();
    t.integer("cliente_id").references("id").inTable("clientes").nullable();
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
  });
  await db.schema.createTable("venda_itens", (t) => {
    t.increments("id").primary();
    t.integer("venda_id").references("id").inTable("vendas");
    t.integer("produto_id").references("id").inTable("produtos");
    t.integer("quantidade").notNullable();
    t.decimal("preco_unitario", 10, 2).notNullable();
    t.decimal("custo_unitario", 10, 2).notNullable();
  });
  await db.schema.createTable("venda_pagamentos", (t) => {
    t.increments("id").primary();
    t.integer("venda_id").references("id").inTable("vendas");
    t.string("metodo").notNullable();
    t.decimal("valor", 10, 2).notNullable();
    t.string("detalhes").nullable();
  });
  await db.schema.createTable("contas_receber", (t) => {
    t.increments("id").primary();
    t.integer("cliente_id").references("id").inTable("clientes").notNullable();
    t.integer("venda_id").references("id").inTable("vendas").nullable();
    t.string("descricao").notNullable();
    t.decimal("valor_total", 10, 2).notNullable();
    t.decimal("valor_pago", 10, 2).defaultTo(0);
    t.datetime("data_lancamento");
    t.string("status").defaultTo("PENDENTE");
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
  await db("configuracoes").insert([
    { chave: "comissao_padrao", valor: "0.30" },
    { chave: "comissao_usados", valor: "0.25" },
  ]);
  await db("cargos").insert({ id: 1, nome: "Vendedor" });
  await db("pessoas").insert({ id: 1, nome: "João Vendedor", cargo_id: 1, ativo: true });
  await db("clientes").insert({ id: 1, nome: "Maria Cliente", documento: "123.456.789-00", ativo: true });
  await db("produtos").insert([
    { id: 1, codigo: "P001", descricao: "Produto Teste A", custo: 50, preco_venda: 100, estoque_atual: 10, tipo: "novo", ativo: true },
    { id: 2, codigo: "P002", descricao: "Produto Teste B", custo: 30, preco_venda: 80, estoque_atual: 5, tipo: "usado", ativo: true },
  ]);
}

// ============================
// Funções de negócio (portadas do main.js — serão substituídas pelos handlers na Fase 3)
// ============================

async function criarVenda(db, saleData) {
  const trx = await db.transaction();
  try {
    const formaPagamentoResumo =
      saleData.pagamentos.length > 1
        ? "Múltiplos"
        : saleData.pagamentos[0].metodo;

    // Verificar estoque (MELHORIA Fase 4)
    for (const item of saleData.itens) {
      const produto = await trx("produtos").where("id", item.id).first();
      if (!produto) throw new Error(`Produto #${item.id} não encontrado.`);
      if (produto.estoque_atual < item.qty) {
        throw new Error(
          `Estoque insuficiente: "${produto.descricao}" tem ${produto.estoque_atual} unidades, pedido: ${item.qty}`
        );
      }
    }

    const [saleId] = await trx("vendas").insert({
      vendedor_id: saleData.vendedor_id,
      trocador_id: null,
      cliente_id: saleData.cliente_id || null,
      subtotal: saleData.subtotal,
      mao_de_obra: 0,
      acrescimo: saleData.acrescimo_valor || 0,
      desconto_valor: saleData.desconto_valor || 0,
      desconto_tipo: saleData.desconto_tipo || "percent",
      total_final: saleData.total_final,
      forma_pagamento: formaPagamentoResumo,
      data_venda: Date.now(),
    });

    const items = saleData.itens.map((item) => ({
      venda_id: saleId,
      produto_id: item.id,
      quantidade: item.qty,
      preco_unitario: item.preco_venda,
      custo_unitario: item.custo,
    }));

    if (items.length > 0) {
      await trx("venda_itens").insert(items);
      for (const item of items) {
        await trx("produtos")
          .where("id", item.produto_id)
          .decrement("estoque_atual", item.quantidade);
      }
    }

    const pagamentos = saleData.pagamentos.map((p) => ({
      venda_id: saleId,
      metodo: p.metodo,
      valor: p.valor,
      detalhes: p.detalhes || "",
    }));

    if (pagamentos.length > 0) {
      await trx("venda_pagamentos").insert(pagamentos);
      for (const pg of pagamentos) {
        if (pg.metodo === "Fiado") {
          if (!saleData.cliente_id)
            throw new Error("Venda Fiado exige um cliente selecionado.");
          await trx("contas_receber").insert({
            cliente_id: saleData.cliente_id,
            venda_id: saleId,
            descricao: `Venda #${saleId}`,
            valor_total: pg.valor,
            valor_pago: 0,
            status: "PENDENTE",
            data_lancamento: Date.now(),
          });
        }
      }
    }

    await trx.commit();
    return { success: true, id: saleId };
  } catch (error) {
    await trx.rollback();
    return { success: false, error: error.message };
  }
}

async function cancelarVenda(db, vendaId, motivo) {
  const trx = await db.transaction();
  try {
    const itens = await trx("venda_itens").where("venda_id", vendaId);
    for (const item of itens) {
      await trx("produtos")
        .where("id", item.produto_id)
        .increment("estoque_atual", item.quantidade);
    }
    await trx("vendas").where("id", vendaId).update({
      cancelada: true,
      motivo_cancelamento: motivo,
      data_cancelamento: Date.now(),
    });
    // MELHORIA Fase 4: Cancelar contas a receber associadas
    await trx("contas_receber")
      .where("venda_id", vendaId)
      .update({ status: "CANCELADO" });

    await trx.commit();
    return { success: true };
  } catch (error) {
    await trx.rollback();
    return { success: false, error: error.message };
  }
}

async function getSales(db, filters = {}) {
  const query = db("vendas")
    .leftJoin("pessoas as vendedor", "vendas.vendedor_id", "vendedor.id")
    .leftJoin("clientes", "vendas.cliente_id", "clientes.id")
    .select(
      "vendas.*",
      "vendedor.nome as vendedor_nome",
      "vendedor.comissao_fixa",
      "clientes.documento as cliente_documento",
      "clientes.telefone as cliente_telefone",
      "clientes.nome as cliente_nome"
    )
    .orderBy("data_venda", "desc");

  const vendas = await query;
  const vendaIds = vendas.map((v) => v.id);

  const allItems = await db("venda_itens")
    .leftJoin("produtos", "venda_itens.produto_id", "produtos.id")
    .whereIn("venda_id", vendaIds)
    .select("venda_itens.*", "produtos.tipo");

  const allPayments = await db("venda_pagamentos")
    .whereIn("venda_id", vendaIds)
    .select("*");

  // Taxas mockadas (simulando services/commission.js)
  const comissaoPadrao = 0.30;
  const comissaoUsados = 0.25;

  const vendasProcessadas = vendas.map((venda) => {
    const itensVenda = allItems.filter((i) => i.venda_id === venda.id);
    const pagamentosVenda = allPayments.filter((p) => p.venda_id === venda.id);
    const custoTotal = itensVenda.reduce(
      (acc, item) => acc + item.custo_unitario * item.quantidade,
      0,
    );

    const taxaVendedorNovos = venda.comissao_fixa
      ? parseFloat(venda.comissao_fixa) / 100
      : comissaoPadrao;

    let comissaoTotal = 0;
    for (const item of itensVenda) {
      const lucroItem = (item.preco_unitario - item.custo_unitario) * item.quantidade;
      const calcVal = lucroItem > 0 ? lucroItem : 0;
      if (item.tipo === "novo") {
        comissaoTotal += calcVal * taxaVendedorNovos;
      } else {
        comissaoTotal += calcVal * comissaoUsados;
      }
    }

    return {
      ...venda,
      custo_total_real: custoTotal,
      comissao_real: comissaoTotal,
      lista_pagamentos: pagamentosVenda,
      itens: itensVenda,
    };
  });

  return vendasProcessadas;
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

describe("Vendas - Fluxo Completo", () => {
  function vendaSimples() {
    return {
      vendedor_id: 1,
      cliente_id: null,
      subtotal: 100,
      total_final: 100,
      desconto_valor: 0,
      desconto_tipo: "percent",
      itens: [{ id: 1, qty: 2, preco_venda: 100, custo: 50 }],
      pagamentos: [{ metodo: "Pix", valor: 100 }],
    };
  }

  it("criar venda decrementa estoque", async () => {
    const result = await criarVenda(db, vendaSimples());

    expect(result.success).toBe(true);

    const produto = await db("produtos").where("id", 1).first();
    expect(produto.estoque_atual).toBe(8);
  });

  it("cancelar venda reverte estoque", async () => {
    const { id } = await criarVenda(db, vendaSimples());
    const result = await cancelarVenda(db, id, "Teste de cancelamento");

    expect(result.success).toBe(true);

    const produto = await db("produtos").where("id", 1).first();
    expect(produto.estoque_atual).toBe(10);
  });

  it("venda Fiado cria conta a receber", async () => {
    const data = {
      vendedor_id: 1,
      cliente_id: 1,
      subtotal: 80,
      total_final: 80,
      desconto_valor: 0,
      desconto_tipo: "percent",
      itens: [{ id: 2, qty: 1, preco_venda: 80, custo: 30 }],
      pagamentos: [{ metodo: "Fiado", valor: 80 }],
    };

    const result = await criarVenda(db, data);
    expect(result.success).toBe(true);

    const conta = await db("contas_receber").where("venda_id", result.id).first();
    expect(conta).toBeDefined();
    expect(conta.status).toBe("PENDENTE");
    expect(conta.valor_total).toBe(80);
  });

  it("cancelar venda Fiado cancela conta a receber", async () => {
    const data = {
      vendedor_id: 1,
      cliente_id: 1,
      subtotal: 80,
      total_final: 80,
      desconto_valor: 0,
      desconto_tipo: "percent",
      itens: [{ id: 2, qty: 1, preco_venda: 80, custo: 30 }],
      pagamentos: [{ metodo: "Fiado", valor: 80 }],
    };

    const { id } = await criarVenda(db, data);
    await cancelarVenda(db, id, "Cancelamento Fiado");

    const conta = await db("contas_receber").where("venda_id", id).first();
    expect(conta.status).toBe("CANCELADO");
  });

  it("venda com estoque insuficiente retorna erro", async () => {
    const data = {
      vendedor_id: 1,
      cliente_id: null,
      subtotal: 100,
      total_final: 100,
      desconto_valor: 0,
      desconto_tipo: "percent",
      itens: [{ id: 1, qty: 99, preco_venda: 100, custo: 50 }],
      pagamentos: [{ metodo: "Pix", valor: 100 }],
    };

    const result = await criarVenda(db, data);

    expect(result.success).toBe(false);
    expect(result.error).toContain("Estoque insuficiente");

    const produto = await db("produtos").where("id", 1).first();
    expect(produto.estoque_atual).toBe(10);
  });
});

describe("Vendas - Listagem e Comissões (get-sales)", () => {
  it("carrega vendas com dados do cliente inclusos", async () => {
    // Insere uma venda com cliente vinculado
    const data = {
      vendedor_id: 1,
      cliente_id: 1,
      subtotal: 100,
      total_final: 100,
      desconto_valor: 0,
      desconto_tipo: "percent",
      itens: [{ id: 1, qty: 1, preco_venda: 100, custo: 50 }], // Produto Teste A (novo)
      pagamentos: [{ metodo: "Pix", valor: 100 }],
    };

    await criarVenda(db, data);

    const vendas = await getSales(db);
    expect(vendas.length).toBe(1);
    
    const venda = vendas[0];
    // Verifica vinculo com cliente
    expect(venda.cliente_nome).toBe("Maria Cliente");
    expect(venda.cliente_documento).toBe("123.456.789-00");
  });

  it("calcula corretamente comissão diferenciada para produtos usados", async () => {
    const data = {
      vendedor_id: 1,
      cliente_id: null,
      subtotal: 180,
      total_final: 180,
      desconto_valor: 0,
      desconto_tipo: "percent",
      itens: [
        { id: 1, qty: 1, preco_venda: 100, custo: 50 }, // novo: lucro de $50
        { id: 2, qty: 1, preco_venda: 80, custo: 30 }   // usado: lucro de $50
      ],
      pagamentos: [{ metodo: "Pix", valor: 180 }],
    };

    await criarVenda(db, data);

    const vendas = await getSales(db);
    const venda = vendas[0];

    // O Mock está simulando comissaoPadrao = 0.30 e comissaoUsados = 0.25
    // Taxa do vendedor está nula, então comissao de Novos é 0.30
    // Lucro Novo = 50 * 0.30 = 15
    // Lucro Usado = 50 * 0.25 = 12.50
    // Total esperado: 27.50
    expect(venda.comissao_real).toBeCloseTo(27.50);
  });
});
