/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  // 1. Criar tabela de empresas
  await knex.schema.createTable("empresas", (table) => {
    table.string("id").primary();
    table.string("nome").notNullable();
    table.bigInteger("created_at").notNullable();
    table.bigInteger("updated_at").notNullable();
  });

  // Inserir empresa padrão para retrocompatibilidade
  const now = Date.now();
  await knex("empresas").insert({
    id: "EMPRESA_LOCAL_001",
    nome: "Empresa Local",
    created_at: now,
    updated_at: now,
  });

  // 2. Criar tabelas de suporte SaaS
  await knex.schema.createTable("saas_config", (table) => {
    table.increments("id").primary();
    table.string("empresa_id").references("id").inTable("empresas");
    table.string("license_key").nullable();
    table.string("license_status").defaultTo("offline");
    table.string("device_id").nullable();
    table.bigInteger("last_sync_at").nullable();
    table.bigInteger("created_at").notNullable();
  });

  await knex("saas_config").insert({
    id: 1,
    empresa_id: "EMPRESA_LOCAL_001",
    license_status: "offline",
    created_at: now,
  });

  await knex.schema.createTable("sync_queue", (table) => {
    table.string("id").primary();
    table.string("table_name").notNullable();
    table.string("record_id").notNullable();
    table.string("action").notNullable(); // 'INSERT', 'UPDATE', 'DELETE'
    table.text("payload").nullable();
    table.bigInteger("created_at").notNullable();
    table.boolean("processed").defaultTo(false);
    table.string("empresa_id").notNullable().defaultTo("EMPRESA_LOCAL_001");
  });

  await knex.schema.createTable("usuarios_empresas", (table) => {
    table.string("id").primary();
    table.integer("usuario_id").references("id").inTable("usuarios");
    table.string("empresa_id").references("id").inTable("empresas");
    table.string("role").defaultTo("owner");
    table.bigInteger("created_at").notNullable();
  });
  
  // Vínculo padrão para o usuário admin (id: 1 geralmente)
  // Nota: Isso assume que o usuário 1 existe. Se não existir, não quebra nada, mas é bom ter.
  const user = await knex("usuarios").first();
  if (user) {
    await knex("usuarios_empresas").insert({
      id: "REL_LOCAL_001",
      usuario_id: user.id,
      empresa_id: "EMPRESA_LOCAL_001",
      role: "owner",
      created_at: now,
    });
  }

  // 3. Adicionar empresa_id e colunas de sync em todas as tabelas multi-tenant
  const tables = [
    "vendas",
    "venda_itens",
    "venda_pagamentos",
    "produtos",
    "clientes",
    "contas_receber",
    "servicos_avulsos",
    "historico_produtos",
    "usuarios",
    "pessoas",
    "configuracoes",
  ];

  for (const tableName of tables) {
    await knex.schema.table(tableName, (table) => {
      // Adicionar empresa_id com default para dados antigos
      if (tableName !== "configuracoes") {
        table.string("empresa_id").defaultTo("EMPRESA_LOCAL_001").references("id").inTable("empresas");
      } else {
        table.string("empresa_id").defaultTo("EMPRESA_LOCAL_001");
      }
      
      // Colunas de sync
      table.boolean("synced").defaultTo(false);
      table.bigInteger("updated_at").nullable();
      table.bigInteger("deleted_at").nullable();
    });

    // Inicializar updated_at para registros existentes
    await knex(tableName).update({ updated_at: now });
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  const tables = [
    "vendas",
    "venda_itens",
    "venda_pagamentos",
    "produtos",
    "clientes",
    "contas_receber",
    "servicos_avulsos",
    "historico_produtos",
    "usuarios",
    "pessoas",
    "configuracoes",
  ];

  for (const tableName of tables) {
    await knex.schema.table(tableName, (table) => {
      table.dropColumn("deleted_at");
      table.dropColumn("updated_at");
      table.dropColumn("synced");
      table.dropColumn("empresa_id");
    });
  }

  await knex.schema.dropTableIfExists("usuarios_empresas");
  await knex.schema.dropTableIfExists("sync_queue");
  await knex.schema.dropTableIfExists("saas_config");
  await knex.schema.dropTableIfExists("empresas");
};
