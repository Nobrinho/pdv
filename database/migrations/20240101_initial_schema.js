/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function (knex) {
  return knex.schema
    .createTable("cargos", (table) => {
      table.increments("id").primary();
      table.string("nome").notNullable();
    })
    .createTable("pessoas", (table) => {
      table.increments("id").primary();
      table.string("nome").notNullable();
      table.decimal("comissao_fixa", 10, 2).nullable();
      table
        .integer("cargo_id")
        .references("id")
        .inTable("cargos")
        .onDelete("SET NULL");
      table.boolean("ativo").defaultTo(true);
    })
    .createTable("produtos", (table) => {
      table.increments("id").primary();
      table.string("codigo").unique();
      table.string("descricao").notNullable();
      table.text("detalhes_ia").nullable();
      table.decimal("custo", 10, 2).notNullable();
      table.decimal("preco_venda", 10, 2).notNullable();
      table.integer("estoque_atual").defaultTo(0);
      table.boolean("ativo").defaultTo(true);
    })
    .createTable("vendas", (table) => {
      table.increments("id").primary();
      table.integer("vendedor_id").references("id").inTable("pessoas");
      table
        .integer("trocador_id")
        .references("id")
        .inTable("pessoas")
        .nullable();
      table.decimal("subtotal", 10, 2).notNullable();
      table.decimal("mao_de_obra", 10, 2).defaultTo(0);
      table.decimal("desconto_valor", 10, 2).defaultTo(0);
      table.string("desconto_tipo").defaultTo("fixed");
      table.decimal("total_final", 10, 2).notNullable();
      table.string("forma_pagamento").notNullable();
      table.datetime("data_venda").defaultTo(knex.fn.now());
    })
    .createTable("venda_itens", (table) => {
      table.increments("id").primary();
      table
        .integer("venda_id")
        .references("id")
        .inTable("vendas")
        .onDelete("CASCADE");
      table.integer("produto_id").references("id").inTable("produtos");
      table.integer("quantidade").notNullable();
      table.decimal("preco_unitario", 10, 2).notNullable();
      table.decimal("custo_unitario", 10, 2).notNullable();
    })
    .createTable("servicos_avulsos", (table) => {
      table.increments("id").primary();
      table.integer("trocador_id").references("id").inTable("pessoas");
      table.string("descricao").notNullable();
      table.decimal("valor", 10, 2).notNullable();
      table.string("forma_pagamento");
      table.datetime("data_servico").defaultTo(knex.fn.now());
    })
    .createTable("configuracoes", (table) => {
      table.string("chave").primary();
      table.string("valor");
    })
    .createTable("usuarios", (table) => {
      table.increments("id").primary();
      table.string("nome").notNullable();
      table.string("username").unique().notNullable();
      table.string("password_hash").notNullable();
      table.string("salt").notNullable();
      table.string("cargo").defaultTo("admin");
      table.boolean("ativo").defaultTo(true);
      table.datetime("criado_em").defaultTo(knex.fn.now());
    })
    .then(() => {
      // Dados Iniciais (Seeds)
      return knex("cargos").insert([
        { id: 1, nome: "Vendedor" },
        { id: 2, nome: "Trocador" },
      ]);
    })
    .then(() => {
      return knex("configuracoes").insert([
        { chave: "comissao_padrao", valor: "0.04" },
      ]);
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function (knex) {
  return knex.schema
    .dropTableIfExists("usuarios")
    .dropTableIfExists("configuracoes")
    .dropTableIfExists("servicos_avulsos")
    .dropTableIfExists("venda_itens")
    .dropTableIfExists("vendas")
    .dropTableIfExists("produtos")
    .dropTableIfExists("pessoas")
    .dropTableIfExists("cargos");
};
