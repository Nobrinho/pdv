exports.up = async function (knex) {
  const hasBudgetsTable = await knex.schema.hasTable("orcamentos");
  if (!hasBudgetsTable) {
    await knex.schema.createTable("orcamentos", (table) => {
      table.increments("id").primary();
      table.integer("cliente_id").nullable().references("id").inTable("clientes").onDelete("SET NULL");
      table.integer("vendedor_id").notNullable().references("id").inTable("pessoas");
      table.integer("trocador_id").nullable().references("id").inTable("pessoas").onDelete("SET NULL");
      table.string("codigo").notNullable().unique();
      table.decimal("subtotal", 10, 2).notNullable().defaultTo(0);
      table.decimal("mao_de_obra", 10, 2).notNullable().defaultTo(0);
      table.decimal("acrescimo_valor", 10, 2).notNullable().defaultTo(0);
      table.decimal("desconto_valor", 10, 2).notNullable().defaultTo(0);
      table.string("desconto_tipo").notNullable().defaultTo("fixed");
      table.decimal("total_final", 10, 2).notNullable().defaultTo(0);
      table.text("observacoes").nullable();
      table.string("status").notNullable().defaultTo("ABERTO");
      table.bigInteger("validade_em").nullable();
      table.bigInteger("data_criacao").notNullable();
      table.bigInteger("data_atualizacao").notNullable();
      table.bigInteger("data_conversao").nullable();
      table.integer("venda_id_gerada").nullable().references("id").inTable("vendas").onDelete("SET NULL");
      table.index(["status"], "idx_orcamentos_status");
      table.index(["data_criacao"], "idx_orcamentos_data_criacao");
      table.index(["cliente_id"], "idx_orcamentos_cliente_id");
      table.index(["vendedor_id"], "idx_orcamentos_vendedor_id");
      table.index(["codigo"], "idx_orcamentos_codigo");
    });
  }

  const hasBudgetItemsTable = await knex.schema.hasTable("orcamento_itens");
  if (!hasBudgetItemsTable) {
    await knex.schema.createTable("orcamento_itens", (table) => {
      table.increments("id").primary();
      table.integer("orcamento_id").notNullable().references("id").inTable("orcamentos").onDelete("CASCADE");
      table.integer("produto_id").notNullable().references("id").inTable("produtos");
      table.string("codigo_snapshot").nullable();
      table.string("descricao_snapshot").notNullable();
      table.string("tipo_snapshot").nullable();
      table.integer("quantidade").notNullable();
      table.decimal("preco_unitario", 10, 2).notNullable();
      table.decimal("custo_unitario", 10, 2).notNullable();
      table.index(["orcamento_id"], "idx_orcamento_itens_orcamento_id");
      table.index(["produto_id"], "idx_orcamento_itens_produto_id");
    });
  }
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists("orcamento_itens");
  await knex.schema.dropTableIfExists("orcamentos");
};
