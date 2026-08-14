/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  await knex.schema.createTable("planos", (table) => {
    table.increments("id").primary();
    table.string("nome").notNullable();
    table.decimal("preco_mensal", 10, 2).defaultTo(0);
    table.integer("limite_usuarios").defaultTo(3);
    table.integer("limite_dispositivos").defaultTo(1);
    table.integer("limite_vendas_mes").nullable();
    table.jsonb("recursos_json").defaultTo("{}");
    table.boolean("ativo").defaultTo(true);
    table.timestamps(true, true);
  });

  await knex.schema.createTable("lojas", (table) => {
    table.increments("id").primary();
    table.string("nome").notNullable();
    table.string("documento");
    table.string("telefone");
    table.string("email");
    table.string("cidade");
    table.string("status").notNullable().defaultTo("trial");
    table.integer("plano_id").references("id").inTable("planos").onDelete("SET NULL");
    table.timestamp("trial_ends_at");
    table.timestamp("bloqueada_em");
    table.text("bloqueio_motivo");
    table.timestamps(true, true);
  });

  await knex.schema.createTable("assinaturas", (table) => {
    table.increments("id").primary();
    table.integer("loja_id").notNullable().references("id").inTable("lojas").onDelete("CASCADE");
    table.integer("plano_id").references("id").inTable("planos").onDelete("SET NULL");
    table.string("status").notNullable().defaultTo("trial");
    table.decimal("valor", 10, 2).defaultTo(0);
    table.date("vencimento");
    table.timestamp("ultimo_pagamento_em");
    table.timestamp("cancelada_em");
    table.timestamps(true, true);
  });

  await knex.schema.createTable("dispositivos", (table) => {
    table.increments("id").primary();
    table.integer("loja_id").notNullable().references("id").inTable("lojas").onDelete("CASCADE");
    table.string("nome_maquina").notNullable();
    table.string("device_id").notNullable();
    table.boolean("autorizado").defaultTo(true);
    table.timestamp("ultimo_acesso_em");
    table.timestamps(true, true);
    table.unique(["loja_id", "device_id"]);
  });

  await knex.schema.createTable("platform_users", (table) => {
    table.increments("id").primary();
    table.string("nome").notNullable();
    table.string("email").notNullable().unique();
    table.string("password_hash").notNullable();
    table.string("salt").notNullable();
    table.string("role").notNullable().defaultTo("platform_admin");
    table.boolean("ativo").defaultTo(true);
    table.timestamps(true, true);
  });

  await knex.schema.createTable("platform_audit_logs", (table) => {
    table.increments("id").primary();
    table.integer("platform_user_id").references("id").inTable("platform_users").onDelete("SET NULL");
    table.integer("loja_id").references("id").inTable("lojas").onDelete("SET NULL");
    table.string("acao").notNullable();
    table.string("entidade");
    table.string("entidade_id");
    table.jsonb("metadata_json").defaultTo("{}");
    table.string("ip");
    table.string("user_agent");
    table.timestamp("criado_em").defaultTo(knex.fn.now());
  });

  await knex.schema.createTable("store_invites", (table) => {
    table.increments("id").primary();
    table.integer("loja_id").notNullable().references("id").inTable("lojas").onDelete("CASCADE");
    table.string("codigo").notNullable().unique();
    table.integer("criado_por_usuario_id");
    table.timestamp("expira_em");
    table.timestamp("usado_em");
    table.boolean("ativo").defaultTo(true);
    table.timestamps(true, true);
  });

  await knex.schema.createTable("usuarios", (table) => {
    table.increments("id").primary();
    table.integer("loja_id").notNullable().references("id").inTable("lojas").onDelete("CASCADE");
    table.string("nome").notNullable();
    table.string("username").notNullable();
    table.string("password_hash").notNullable();
    table.string("salt").notNullable();
    table.string("cargo").notNullable().defaultTo("admin");
    table.boolean("ativo").defaultTo(true);
    table.timestamp("criado_em").defaultTo(knex.fn.now());
    table.timestamps(true, true);
    table.unique(["loja_id", "username"]);
  });

  await knex.schema.createTable("configuracoes", (table) => {
    table.integer("loja_id").notNullable().references("id").inTable("lojas").onDelete("CASCADE");
    table.string("chave").notNullable();
    table.text("valor");
    table.timestamps(true, true);
    table.primary(["loja_id", "chave"]);
  });

  await knex.schema.raw("CREATE INDEX idx_lojas_status ON lojas(status)");
  await knex.schema.raw("CREATE INDEX idx_usuarios_loja_ativo ON usuarios(loja_id, ativo)");
  await knex.schema.raw("CREATE INDEX idx_dispositivos_loja_device ON dispositivos(loja_id, device_id)");
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  await knex.schema.dropTableIfExists("configuracoes");
  await knex.schema.dropTableIfExists("usuarios");
  await knex.schema.dropTableIfExists("store_invites");
  await knex.schema.dropTableIfExists("platform_audit_logs");
  await knex.schema.dropTableIfExists("platform_users");
  await knex.schema.dropTableIfExists("dispositivos");
  await knex.schema.dropTableIfExists("assinaturas");
  await knex.schema.dropTableIfExists("lojas");
  await knex.schema.dropTableIfExists("planos");
};
