/**
 * Handler de migracao: exporta todo o banco local (SQLite) em um dump
 * JSON no formato consumido pelo endpoint online POST /store/import-sqlite.
 */

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
  "despesas",
];

function register(safeHandle, knex, authSession) {
  safeHandle("export-local-data", async (event) => {
    // No modo online nao ha login local (a autorizacao acontece na API, que
    // exige admin da loja online). So exigimos admin local se houver um usuario
    // local logado e ele nao for admin (ex.: caixa no modo local).
    const localUser = authSession?.getUser?.(event);
    if (localUser && !authSession.isAdmin(event)) {
      return { success: false, error: "Permissao de administrador necessaria." };
    }

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
