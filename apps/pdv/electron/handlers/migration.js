/**
 * Handler de migracao: exporta todo o banco local (SQLite) em um dump
 * JSON no formato consumido pelo endpoint online POST /store/import-sqlite.
 */
const { requireAdmin } = require("../lib/authSession");

// Tabelas do banco local que fazem parte dos dados de uma loja.
const LOCAL_TABLES = [
  "configuracoes",
  "cargos",
  "pessoas",
  "clientes",
  "contas_receber",
  "produtos",
  "historico_produtos",
  "usuarios",
  "vendas",
  "venda_itens",
  "venda_pagamentos",
  "servicos_avulsos",
  "orcamentos",
  "orcamento_itens",
  "event_logs",
];

function register(safeHandle, knex, authSession) {
  safeHandle("export-local-data", async (event) => {
    const authError = await requireAdmin(event, knex, authSession);
    if (authError) return authError;

    const tables = {};
    for (const table of LOCAL_TABLES) {
      const exists = await knex.schema.hasTable(table);
      tables[table] = exists ? await knex(table).select("*") : [];
    }

    return {
      success: true,
      backup: {
        version: 1,
        type: "syscontrol-local-export",
        exportedAt: new Date().toISOString(),
        tables,
      },
    };
  });
}

module.exports = { register };
