/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  // Índices para vendas (melhora get-sales, get-dashboard-stats, get-weekly-sales)
  await knex.schema.table("vendas", (table) => {
    table.index(["data_venda", "cancelada"], "idx_vendas_data_cancelada");
  });

  // Índices para venda_itens (melhora JOIN com vendas)
  await knex.schema.table("venda_itens", (table) => {
    table.index("venda_id", "idx_venda_itens_venda_id");
  });

  // Índices para venda_pagamentos (melhora JOIN com vendas)
  await knex.schema.table("venda_pagamentos", (table) => {
    table.index("venda_id", "idx_venda_pagamentos_venda_id");
  });

  // Índice para histórico de produtos (melhora ordenação por data)
  await knex.schema.table("historico_produtos", (table) => {
    table.index("data_alteracao", "idx_historico_data");
  });

  // Índice para produtos (melhora filtro por ativo)
  await knex.schema.table("produtos", (table) => {
    table.index("ativo", "idx_produtos_ativo");
  });

  // Índice para contas_receber (melhora cálculo de saldo devedor)
  await knex.schema.table("contas_receber", (table) => {
    table.index(["cliente_id", "status"], "idx_contas_receber_cliente_status");
  });

  // Índice para servicos_avulsos (melhora filtro por data)
  await knex.schema.table("servicos_avulsos", (table) => {
    table.index("data_servico", "idx_servicos_data");
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  await knex.schema.table("vendas", (table) => {
    table.dropIndex([], "idx_vendas_data_cancelada");
  });
  await knex.schema.table("venda_itens", (table) => {
    table.dropIndex([], "idx_venda_itens_venda_id");
  });
  await knex.schema.table("venda_pagamentos", (table) => {
    table.dropIndex([], "idx_venda_pagamentos_venda_id");
  });
  await knex.schema.table("historico_produtos", (table) => {
    table.dropIndex([], "idx_historico_data");
  });
  await knex.schema.table("produtos", (table) => {
    table.dropIndex([], "idx_produtos_ativo");
  });
  await knex.schema.table("contas_receber", (table) => {
    table.dropIndex([], "idx_contas_receber_cliente_status");
  });
  await knex.schema.table("servicos_avulsos", (table) => {
    table.dropIndex([], "idx_servicos_data");
  });
};
