// =============================================================
// importService.js - Importa um backup do PDV local (SQLite) para
// uma loja online. Recebe um dump JSON no formato local (tabelas ->
// linhas), remapeia os IDs (os PKs online sao globais) e reescreve
// as chaves estrangeiras, tudo dentro de uma transacao.
// =============================================================

// Ordem de importacao: pais antes de filhos.
// fks: coluna no destino -> tabela pai cujo mapa de ids sera usado.
const IMPORT_PLAN = [
  { table: "configuracoes", pk: false, fks: {} },
  // uniqueBy: reaproveita linhas ja existentes (semeadas na criacao da loja)
  // em vez de duplicar e violar a constraint unica.
  { table: "cargos", pk: true, fks: {}, uniqueBy: ["nome"] },
  { table: "pessoas", pk: true, fks: { cargo_id: "cargos" } },
  { table: "clientes", pk: true, fks: {} },
  { table: "produtos", pk: true, fks: {} },
  { table: "usuarios", pk: true, fks: {}, uniqueBy: ["username"] },
  {
    table: "vendas",
    pk: true,
    fks: { vendedor_id: "pessoas", trocador_id: "pessoas", cliente_id: "clientes" },
  },
  { table: "venda_itens", pk: false, fks: { venda_id: "vendas", produto_id: "produtos" } },
  { table: "venda_pagamentos", pk: false, fks: { venda_id: "vendas" } },
  { table: "contas_receber", pk: false, fks: { cliente_id: "clientes", venda_id: "vendas" } },
  { table: "historico_produtos", pk: false, fks: { produto_id: "produtos" } },
  { table: "servicos_avulsos", pk: false, fks: { trocador_id: "pessoas" } },
  {
    table: "orcamentos",
    pk: true,
    fks: {
      cliente_id: "clientes",
      vendedor_id: "pessoas",
      trocador_id: "pessoas",
      venda_id_gerada: "vendas",
    },
  },
  { table: "orcamento_itens", pk: false, fks: { orcamento_id: "orcamentos", produto_id: "produtos" } },
  { table: "event_logs", pk: false, fks: { user_id: "usuarios" } },
  { table: "despesas", pk: false, fks: { criado_por: "usuarios" } },
];

// Colunas que nunca devem vir do dump (o destino gera/gerencia).
const SKIP_COLUMNS = new Set(["id", "loja_id", "created_at", "updated_at"]);

function extractTables(payload = {}) {
  if (payload.tables && typeof payload.tables === "object") return payload.tables;
  if (payload.backup && payload.backup.tables) return payload.backup.tables;
  // Aceita tambem o objeto plano { produtos: [...], vendas: [...] }.
  if (payload && typeof payload === "object") return payload;
  return {};
}

// Converte datas do banco local para colunas timestamp do Postgres.
// O local guarda epoca em ms (Date.now()); colunas bigInteger no online
// continuam recebendo o numero cru (nao passam por aqui).
function coerceTimestamp(value) {
  if (value === null || value === undefined || value === "") return null;
  const asNumber =
    typeof value === "number"
      ? value
      : /^\d{10,}$/.test(String(value).trim())
        ? Number(String(value).trim())
        : null;
  if (asNumber !== null && Number.isFinite(asNumber)) {
    const ms = asNumber < 1e12 ? asNumber * 1000 : asNumber; // 10 digitos=seg, 13=ms
    const date = new Date(ms);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function coerceBoolean(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") return ["1", "true", "t", "yes", "sim"].includes(value.toLowerCase());
  return !!value;
}

async function importSqliteBackup(knex, lojaId, payload = {}, options = {}) {
  const tables = extractTables(payload);
  if (!tables || typeof tables !== "object") {
    return { success: false, error: "Backup invalido: nenhuma tabela encontrada." };
  }

  // Protege contra importacao duplicada: exige loja "vazia" (sem produtos/vendas).
  if (!options.force) {
    const [prod, vendas] = await Promise.all([
      knex("produtos").where({ loja_id: lojaId }).count("id as t").first(),
      knex("vendas").where({ loja_id: lojaId }).count("id as t").first(),
    ]);
    if (Number(prod?.t || 0) > 0 || Number(vendas?.t || 0) > 0) {
      return {
        success: false,
        error: "A loja ja possui produtos ou vendas. Importe apenas em uma loja nova (ou use force).",
      };
    }
  }

  const summary = {};

  const result = await knex.transaction(async (trx) => {
    const idMaps = {}; // tabela -> { oldId: newId }

    for (const step of IMPORT_PLAN) {
      const { table, pk, fks } = step;
      const rows = Array.isArray(tables[table]) ? tables[table] : [];
      if (!rows.length) {
        summary[table] = 0;
        continue;
      }

      const columnInfo = await trx(table).columnInfo();
      const validColumns = new Set(Object.keys(columnInfo));
      const booleanColumns = new Set(
        Object.keys(columnInfo).filter((c) => columnInfo[c].type === "boolean"),
      );
      const dateColumns = new Set(
        Object.keys(columnInfo).filter((c) => /timestamp|date/i.test(columnInfo[c].type)),
      );
      if (pk) idMaps[table] = {};

      const buildMapped = (row) => {
        const mapped = {};
        for (const [key, value] of Object.entries(row)) {
          if (SKIP_COLUMNS.has(key)) continue;
          if (!validColumns.has(key)) continue; // ignora colunas locais que nao existem online
          mapped[key] = booleanColumns.has(key)
            ? coerceBoolean(value)
            : dateColumns.has(key)
              ? coerceTimestamp(value)
              : value;
        }
        // Reescreve as FKs usando os mapas dos pais ja importados.
        for (const [fkColumn, parentTable] of Object.entries(fks)) {
          if (!validColumns.has(fkColumn)) continue;
          const oldValue = row[fkColumn];
          if (oldValue === null || oldValue === undefined || oldValue === "") {
            mapped[fkColumn] = null;
            continue;
          }
          mapped[fkColumn] = (idMaps[parentTable] || {})[oldValue] ?? null;
        }
        mapped.loja_id = lojaId;
        return mapped;
      };

      let inserted = 0;

      // configuracoes: upsert por (loja_id, chave) — poucas linhas.
      if (table === "configuracoes") {
        for (const row of rows) {
          await trx(table).insert(buildMapped(row)).onConflict(["loja_id", "chave"]).merge();
          inserted += 1;
        }
        summary[table] = inserted;
        continue;
      }

      // cargos/usuarios: reaproveita existentes (poucas linhas) — individual.
      if (pk && step.uniqueBy) {
        for (const row of rows) {
          const mapped = buildMapped(row);
          const where = { loja_id: lojaId };
          for (const col of step.uniqueBy) where[col] = mapped[col];
          const existing = await trx(table).where(where).first();
          if (existing) {
            if (row.id !== undefined && row.id !== null) idMaps[table][row.id] = existing.id;
            continue;
          }
          const [created] = await trx(table).insert(mapped).returning(["id"]);
          if (row.id !== undefined && row.id !== null) idMaps[table][row.id] = created.id;
          inserted += 1;
        }
        summary[table] = inserted;
        continue;
      }

      // Demais tabelas: insercao em LOTE (chunks) — muito mais rapido no banco remoto.
      const CHUNK = 500;
      for (let i = 0; i < rows.length; i += CHUNK) {
        const slice = rows.slice(i, i + CHUNK);
        const mappedChunk = slice.map(buildMapped);
        if (pk) {
          // Postgres retorna os ids na mesma ordem das linhas inseridas.
          const created = await trx(table).insert(mappedChunk).returning(["id"]);
          for (let j = 0; j < created.length; j += 1) {
            const oldId = slice[j].id;
            if (oldId !== undefined && oldId !== null) idMaps[table][oldId] = created[j].id;
          }
        } else {
          await trx(table).insert(mappedChunk);
        }
        inserted += mappedChunk.length;
      }
      summary[table] = inserted;
    }

    return { success: true, summary };
  });

  return result;
}

module.exports = { importSqliteBackup, IMPORT_PLAN };
