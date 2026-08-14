/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  await knex.schema.createTable("produtos", (table) => {
    table.increments("id").primary();
    table.integer("loja_id").notNullable().references("id").inTable("lojas").onDelete("CASCADE");
    table.string("codigo");
    table.string("descricao").notNullable();
    table.text("detalhes_ia");
    table.decimal("custo", 10, 2).notNullable().defaultTo(0);
    table.decimal("preco_venda", 10, 2).notNullable().defaultTo(0);
    table.integer("estoque_atual").notNullable().defaultTo(0);
    table.string("tipo").notNullable().defaultTo("novo");
    table.boolean("ativo").defaultTo(true);
    table.timestamps(true, true);
    table.unique(["loja_id", "codigo"]);
  });

  await knex.schema.createTable("historico_produtos", (table) => {
    table.increments("id").primary();
    table.integer("loja_id").notNullable().references("id").inTable("lojas").onDelete("CASCADE");
    table.integer("produto_id").notNullable().references("id").inTable("produtos").onDelete("CASCADE");
    table.decimal("preco_antigo", 10, 2);
    table.decimal("preco_novo", 10, 2);
    table.integer("estoque_antigo");
    table.integer("estoque_novo");
    table.string("tipo_alteracao").notNullable();
    table.bigInteger("data_alteracao").notNullable();
    table.timestamps(true, true);
  });

  await knex.schema.createTable("event_logs", (table) => {
    table.increments("id").primary();
    table.integer("loja_id").notNullable().references("id").inTable("lojas").onDelete("CASCADE");
    table.bigInteger("occurred_at_ms").notNullable();
    table.string("event_category", 40).notNullable();
    table.string("event_type", 80).notNullable();
    table.string("screen", 120);
    table.string("component", 120);
    table.string("action", 80);
    table.string("target_id", 160);
    table.string("entity_type", 80);
    table.string("entity_id", 80);
    table.integer("user_id");
    table.string("user_name", 120);
    table.string("session_id", 80);
    table.string("correlation_id", 80);
    table.string("severity", 20).notNullable().defaultTo("info");
    table.text("message");
    table.jsonb("payload_json").defaultTo("{}");
    table.string("source", 40).defaultTo("system");
  });

  await knex.schema.raw("CREATE INDEX idx_produtos_loja_ativo ON produtos(loja_id, ativo)");
  await knex.schema.raw("CREATE INDEX idx_produtos_loja_codigo ON produtos(loja_id, codigo)");
  await knex.schema.raw("CREATE INDEX idx_historico_produtos_loja_data ON historico_produtos(loja_id, data_alteracao DESC)");
  await knex.schema.raw("CREATE INDEX idx_event_logs_loja_data ON event_logs(loja_id, occurred_at_ms DESC)");
  await knex.schema.raw("CREATE INDEX idx_event_logs_loja_type ON event_logs(loja_id, event_type)");
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  await knex.schema.dropTableIfExists("event_logs");
  await knex.schema.dropTableIfExists("historico_produtos");
  await knex.schema.dropTableIfExists("produtos");
};
