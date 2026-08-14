/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  await knex.schema.createTable("servicos_avulsos", (table) => {
    table.increments("id").primary();
    table.integer("loja_id").notNullable().references("id").inTable("lojas").onDelete("CASCADE");
    table.integer("trocador_id").references("id").inTable("pessoas").onDelete("SET NULL");
    table.string("descricao").notNullable();
    table.decimal("valor", 10, 2).notNullable();
    table.string("forma_pagamento");
    table.timestamp("data_servico").defaultTo(knex.fn.now());
    table.timestamps(true, true);
  });

  await knex.schema.createTable("orcamentos", (table) => {
    table.increments("id").primary();
    table.integer("loja_id").notNullable().references("id").inTable("lojas").onDelete("CASCADE");
    table.integer("cliente_id").references("id").inTable("clientes").onDelete("SET NULL");
    table.integer("vendedor_id").references("id").inTable("pessoas").onDelete("SET NULL");
    table.integer("trocador_id").references("id").inTable("pessoas").onDelete("SET NULL");
    table.string("codigo").notNullable();
    table.decimal("subtotal", 10, 2).notNullable().defaultTo(0);
    table.decimal("mao_de_obra", 10, 2).notNullable().defaultTo(0);
    table.decimal("acrescimo_valor", 10, 2).notNullable().defaultTo(0);
    table.decimal("desconto_valor", 10, 2).notNullable().defaultTo(0);
    table.string("desconto_tipo").notNullable().defaultTo("fixed");
    table.decimal("total_final", 10, 2).notNullable().defaultTo(0);
    table.text("observacoes");
    table.string("status").notNullable().defaultTo("ABERTO");
    table.bigInteger("validade_em");
    table.bigInteger("data_criacao").notNullable();
    table.bigInteger("data_atualizacao").notNullable();
    table.bigInteger("data_conversao");
    table.integer("venda_id_gerada").references("id").inTable("vendas").onDelete("SET NULL");
    table.timestamps(true, true);
    table.unique(["loja_id", "codigo"]);
  });

  await knex.schema.createTable("orcamento_itens", (table) => {
    table.increments("id").primary();
    table.integer("loja_id").notNullable().references("id").inTable("lojas").onDelete("CASCADE");
    table.integer("orcamento_id").notNullable().references("id").inTable("orcamentos").onDelete("CASCADE");
    table.integer("produto_id").references("id").inTable("produtos").onDelete("SET NULL");
    table.string("codigo_snapshot");
    table.string("descricao_snapshot").notNullable();
    table.string("tipo_snapshot");
    table.integer("quantidade").notNullable();
    table.decimal("preco_unitario", 10, 2).notNullable();
    table.decimal("custo_unitario", 10, 2).notNullable();
    table.timestamps(true, true);
  });

  await knex.schema.raw("CREATE INDEX idx_servicos_loja_data ON servicos_avulsos(loja_id, data_servico DESC)");
  await knex.schema.raw("CREATE INDEX idx_orcamentos_loja_data ON orcamentos(loja_id, data_criacao DESC)");
  await knex.schema.raw("CREATE INDEX idx_orcamentos_loja_status ON orcamentos(loja_id, status)");
  await knex.schema.raw("CREATE INDEX idx_orcamento_itens_loja_orcamento ON orcamento_itens(loja_id, orcamento_id)");
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  await knex.schema.dropTableIfExists("orcamento_itens");
  await knex.schema.dropTableIfExists("orcamentos");
  await knex.schema.dropTableIfExists("servicos_avulsos");
};
