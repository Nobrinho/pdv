/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  await knex.schema.createTable("cargos", (table) => {
    table.increments("id").primary();
    table.integer("loja_id").notNullable().references("id").inTable("lojas").onDelete("CASCADE");
    table.string("nome").notNullable();
    table.timestamps(true, true);
    table.unique(["loja_id", "nome"]);
  });

  await knex.schema.createTable("pessoas", (table) => {
    table.increments("id").primary();
    table.integer("loja_id").notNullable().references("id").inTable("lojas").onDelete("CASCADE");
    table.string("nome").notNullable();
    table.decimal("comissao_fixa", 10, 2);
    table.integer("cargo_id").references("id").inTable("cargos").onDelete("SET NULL");
    table.boolean("ativo").defaultTo(true);
    table.timestamps(true, true);
  });

  await knex.schema.createTable("vendas", (table) => {
    table.increments("id").primary();
    table.integer("loja_id").notNullable().references("id").inTable("lojas").onDelete("CASCADE");
    table.integer("vendedor_id").references("id").inTable("pessoas").onDelete("SET NULL");
    table.integer("trocador_id").references("id").inTable("pessoas").onDelete("SET NULL");
    table.integer("cliente_id").references("id").inTable("clientes").onDelete("SET NULL");
    table.decimal("subtotal", 10, 2).notNullable();
    table.decimal("mao_de_obra", 10, 2).defaultTo(0);
    table.decimal("acrescimo", 10, 2).defaultTo(0);
    table.decimal("desconto_valor", 10, 2).defaultTo(0);
    table.string("desconto_tipo").defaultTo("fixed");
    table.decimal("total_final", 10, 2).notNullable();
    table.string("forma_pagamento").notNullable();
    table.timestamp("data_venda").defaultTo(knex.fn.now());
    table.boolean("cancelada").defaultTo(false);
    table.string("motivo_cancelamento");
    table.bigInteger("data_cancelamento");
    table.boolean("comissao_paga").defaultTo(false);
    table.bigInteger("data_pagamento_comissao");
    table.timestamps(true, true);
  });

  await knex.schema.createTable("venda_itens", (table) => {
    table.increments("id").primary();
    table.integer("loja_id").notNullable().references("id").inTable("lojas").onDelete("CASCADE");
    table.integer("venda_id").notNullable().references("id").inTable("vendas").onDelete("CASCADE");
    table.integer("produto_id").references("id").inTable("produtos").onDelete("SET NULL");
    table.integer("quantidade").notNullable();
    table.decimal("preco_unitario", 10, 2).notNullable();
    table.decimal("custo_unitario", 10, 2).notNullable();
    table.timestamps(true, true);
  });

  await knex.schema.createTable("venda_pagamentos", (table) => {
    table.increments("id").primary();
    table.integer("loja_id").notNullable().references("id").inTable("lojas").onDelete("CASCADE");
    table.integer("venda_id").notNullable().references("id").inTable("vendas").onDelete("CASCADE");
    table.string("metodo").notNullable();
    table.decimal("valor", 10, 2).notNullable();
    table.string("detalhes");
    table.timestamps(true, true);
  });

  await knex.schema.raw("CREATE INDEX idx_pessoas_loja_ativo ON pessoas(loja_id, ativo)");
  await knex.schema.raw("CREATE INDEX idx_vendas_loja_data ON vendas(loja_id, data_venda DESC)");
  await knex.schema.raw("CREATE INDEX idx_vendas_loja_cancelada ON vendas(loja_id, cancelada)");
  await knex.schema.raw("CREATE INDEX idx_venda_itens_loja_venda ON venda_itens(loja_id, venda_id)");
  await knex.schema.raw("CREATE INDEX idx_venda_pagamentos_loja_venda ON venda_pagamentos(loja_id, venda_id)");
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  await knex.schema.dropTableIfExists("venda_pagamentos");
  await knex.schema.dropTableIfExists("venda_itens");
  await knex.schema.dropTableIfExists("vendas");
  await knex.schema.dropTableIfExists("pessoas");
  await knex.schema.dropTableIfExists("cargos");
};
