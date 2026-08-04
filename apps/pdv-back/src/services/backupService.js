const { importSqliteBackup } = require("./importService");
const { createStore } = require("./storeService");

const BACKUP_VERSION = 1;

const STORE_TABLES = [
  "configuracoes",
  "usuarios",
  "cargos",
  "pessoas",
  "clientes",
  "contas_receber",
  "produtos",
  "historico_produtos",
  "vendas",
  "venda_itens",
  "venda_pagamentos",
  "servicos_avulsos",
  "orcamentos",
  "orcamento_itens",
  "event_logs",
];

const DELETE_ORDER = [
  "orcamento_itens",
  "orcamentos",
  "venda_pagamentos",
  "venda_itens",
  "contas_receber",
  "vendas",
  "servicos_avulsos",
  "historico_produtos",
  "produtos",
  "clientes",
  "pessoas",
  "cargos",
  "event_logs",
  "usuarios",
  "configuracoes",
];

const SERIAL_TABLES = STORE_TABLES.filter((table) => table !== "configuracoes");

function countBackupRows(backup) {
  return Object.values(backup?.tables || {}).reduce(
    (total, rows) => total + (Array.isArray(rows) ? rows.length : 0),
    0,
  );
}

async function buildStoreBackup(db, lojaId) {
  const loja = await db("lojas").where("id", lojaId).select("id", "nome", "status").first();
  const tables = {};
  for (const table of STORE_TABLES) {
    tables[table] = await db(table).where("loja_id", lojaId).select("*");
  }
  return {
    version: BACKUP_VERSION,
    type: "syscontrol-store-backup",
    exportedAt: new Date().toISOString(),
    loja,
    tables,
  };
}

async function persistSnapshot(db, lojaId, tipo, backup, descricao) {
  const [row] = await db("store_backups")
    .insert({
      loja_id: lojaId,
      tipo,
      descricao: descricao || null,
      total_registros: countBackupRows(backup),
      payload_json: JSON.stringify(backup),
    })
    .returning(["id", "criado_em"]);
  return row;
}

async function exportStoreBackup(knex, lojaId, options = {}) {
  const backup = await buildStoreBackup(knex, lojaId);
  let snapshot = null;
  if (options.persist) {
    snapshot = await persistSnapshot(knex, lojaId, "manual", backup, options.descricao);
  }
  return { success: true, backup, snapshot };
}

async function listStoreBackups(knex, lojaId) {
  const backups = await knex("store_backups")
    .where({ loja_id: lojaId })
    .select("id", "tipo", "descricao", "total_registros", "criado_em")
    .orderBy("criado_em", "desc")
    .limit(50);
  return { success: true, backups };
}

async function getStoreBackup(knex, lojaId, backupId) {
  const row = await knex("store_backups").where({ id: backupId, loja_id: lojaId }).first();
  if (!row) return { success: false, error: "Backup nao encontrado." };
  const payload = typeof row.payload_json === "string" ? JSON.parse(row.payload_json) : row.payload_json;
  return { success: true, backup: payload };
}

function normalizeBackupPayload(payload = {}) {
  const backup = payload.backup || payload;
  if (backup?.type !== "syscontrol-store-backup" || !backup.tables) {
    return { error: "Arquivo de backup online invalido." };
  }
  if (Number(backup.version) !== BACKUP_VERSION) {
    return { error: "Versao de backup incompativel." };
  }
  return { backup };
}

async function resetSerialSequence(trx, table) {
  const hasRows = await trx(table).first("id");
  if (!hasRows) return;
  await trx.raw(
    `SELECT setval(pg_get_serial_sequence(?, 'id'), COALESCE((SELECT MAX(id) FROM ??), 1), true)`,
    [table, table],
  );
}

async function restoreStoreBackup(knex, lojaId, payload = {}) {
  const normalized = normalizeBackupPayload(payload);
  if (normalized.error) return { success: false, error: normalized.error };

  const { tables } = normalized.backup;

  return await knex.transaction(async (trx) => {
    // Backup automatico de seguranca ANTES de qualquer escrita destrutiva.
    const safety = await buildStoreBackup(trx, lojaId);
    const savedSafety = await persistSnapshot(
      trx,
      lojaId,
      "pre_restore",
      safety,
      "Snapshot automatico antes do restore",
    );

    for (const table of DELETE_ORDER) {
      await trx(table).where("loja_id", lojaId).del();
    }

    for (const table of STORE_TABLES) {
      const rows = Array.isArray(tables[table]) ? tables[table] : [];
      if (!rows.length) continue;

      await trx(table).insert(
        rows.map((row) => ({
          ...row,
          loja_id: lojaId,
        })),
      );
    }

    for (const table of SERIAL_TABLES) {
      await resetSerialSequence(trx, table);
    }

    return {
      success: true,
      restored: countBackupRows(normalized.backup),
      safetyBackupId: savedSafety.id,
    };
  }).catch((error) => ({ success: false, error: error.message }));
}

// Restaura um backup em uma LOJA NOVA. Como os PKs online sao globais,
// os ids do backup nao podem ser reaproveitados: delegamos ao importService,
// que remapeia ids e reescreve as chaves estrangeiras.
async function restoreBackupToNewStore(knex, payload = {}) {
  const normalized = normalizeBackupPayload(payload);
  if (normalized.error) return { success: false, error: normalized.error };

  const storeInput = payload.store || {};
  const adminInput = payload.admin || {};
  if (!storeInput.nome) {
    storeInput.nome = normalized.backup.loja?.nome
      ? `${normalized.backup.loja.nome} (restaurada)`
      : "Loja restaurada";
  }

  const created = await createStore(knex, { store: storeInput, admin: adminInput, device: payload.device });
  if (!created.success) return created;

  const imported = await importSqliteBackup(
    knex,
    created.loja.id,
    { backup: normalized.backup },
    { force: true },
  );
  if (!imported.success) return { success: false, error: imported.error };

  return { success: true, loja: created.loja, summary: imported.summary };
}

module.exports = {
  exportStoreBackup,
  restoreStoreBackup,
  listStoreBackups,
  getStoreBackup,
  restoreBackupToNewStore,
};
