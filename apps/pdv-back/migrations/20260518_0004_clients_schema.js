/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  await knex.schema.createTable("clientes", (table) => {
    table.increments("id").primary();
    table.integer("loja_id").notNullable().references("id").inTable("lojas").onDelete("CASCADE");
    table.string("nome").notNullable();
    table.string("telefone");
    table.string("documento");
    table.string("endereco");
    table.text("observacoes");
    table.decimal("limite_credito", 10, 2).defaultTo(0);
    table.boolean("ativo").defaultTo(true);
    table.timestamp("criado_em").defaultTo(knex.fn.now());
    table.timestamps(true, true);
  });

  await knex.schema.createTable("contas_receber", (table) => {
    table.increments("id").primary();
    table.integer("loja_id").notNullable().references("id").inTable("lojas").onDelete("CASCADE");
    table.integer("cliente_id").notNullable().references("id").inTable("clientes").onDelete("RESTRICT");
    table.integer("venda_id");
    table.string("descricao").notNullable();
    table.decimal("valor_total", 10, 2).notNullable();
    table.decimal("valor_pago", 10, 2).defaultTo(0);
    table.timestamp("data_lancamento").defaultTo(knex.fn.now());
    table.timestamp("data_vencimento");
    table.string("status").defaultTo("PENDENTE");
    table.timestamps(true, true);
  });

  await knex.schema.raw("CREATE INDEX idx_clientes_loja_ativo ON clientes(loja_id, ativo)");
  await knex.schema.raw("CREATE INDEX idx_clientes_loja_nome ON clientes(loja_id, nome)");
  await knex.schema.raw("CREATE INDEX idx_contas_receber_loja_cliente_status ON contas_receber(loja_id, cliente_id, status)");
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  await knex.schema.dropTableIfExists("contas_receber");
  await knex.schema.dropTableIfExists("clientes");
};
