exports.up = function (knex) {
  return knex.schema
    .createTable("clientes", (table) => {
      table.increments("id").primary();
      table.string("nome").notNullable();
      table.string("telefone").nullable();
      table.string("documento").nullable();
      table.string("endereco").nullable();
      table.text("observacoes").nullable();
      table.decimal("limite_credito", 10, 2).defaultTo(0);
      table.boolean("ativo").defaultTo(true);
      table.datetime("criado_em").defaultTo(knex.fn.now());
    })
    .createTable("contas_receber", (table) => {
      table.increments("id").primary();
      table
        .integer("cliente_id")
        .references("id")
        .inTable("clientes")
        .notNullable();
      table.integer("venda_id").references("id").inTable("vendas").nullable();
      table.string("descricao").notNullable();
      table.decimal("valor_total", 10, 2).notNullable();
      table.decimal("valor_pago", 10, 2).defaultTo(0);
      table.datetime("data_lancamento").defaultTo(knex.fn.now());
      table.datetime("data_vencimento").nullable();
      table.string("status").defaultTo("PENDENTE");
    })
    .table("vendas", (table) => {

      table
        .integer("cliente_id")
        .references("id")
        .inTable("clientes")
        .nullable();
    });
};

exports.down = function (knex) {
  return knex.schema
    .table("vendas", (table) => table.dropColumn("cliente_id"))
    .dropTableIfExists("contas_receber")
    .dropTableIfExists("clientes");
};
