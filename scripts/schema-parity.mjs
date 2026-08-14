// =============================================================
// schema-parity.mjs — Garante paridade entre o schema LOCAL (SQLite, app
// desktop) e o schema ONLINE (Postgres, API). Sobe os dois de verdade,
// aplica as migrations e compara as colunas das tabelas compartilhadas.
//
// Uso:  node scripts/schema-parity.mjs   (ou  npm run schema:parity)
// Requer, sob demanda (não ficam no package.json de produção):
//   npm i -D @electric-sql/pglite @electric-sql/pglite-socket knex better-sqlite3
//
// Sai com código != 0 se houver divergência de colunas nas tabelas comuns.
// =============================================================
import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";
import knexFactory from "knex";
import path from "path";
import os from "os";
import { fileURLToPath } from "url";
import { rmSync } from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// PARITY_ROOT permite rodar o script a partir de outro diretório (ex.: um
// node_modules isolado em CI), apontando para a raiz real do repo.
const ROOT = process.env.PARITY_ROOT || path.join(__dirname, "..");
const ONLINE_MIGRATIONS = path.join(ROOT, "apps/pdv-back/migrations");
const LOCAL_MIGRATIONS = path.join(ROOT, "apps/pdv/database/migrations");

// Colunas de infraestrutura (multi-loja / auditoria) presentes só no online.
// Não são dado de negócio, então não contam como divergência de paridade.
const IGNORE_COLUMNS = new Set(["loja_id", "created_at", "updated_at"]);

// Tabelas de bookkeeping das migrations — nunca comparadas.
const KNEX_TABLES = new Set([
  "knex_migrations",
  "knex_migrations_lock",
  "server_knex_migrations",
  "server_knex_migrations_lock",
]);

// Exceções documentadas (diferenças legítimas). Preencher conforme necessário:
//   ALLOWLIST["produtos"] = { onlyOnline: ["algo"], onlyLocal: [] };
const ALLOWLIST = {};

function diffCols(onlineCols, localCols, table) {
  const allow = ALLOWLIST[table] || { onlyOnline: [], onlyLocal: [] };
  const onlyOnline = [...onlineCols].filter(
    (c) => !localCols.has(c) && !IGNORE_COLUMNS.has(c) && !(allow.onlyOnline || []).includes(c),
  );
  const onlyLocal = [...localCols].filter(
    (c) => !onlineCols.has(c) && !IGNORE_COLUMNS.has(c) && !(allow.onlyLocal || []).includes(c),
  );
  return { onlyOnline, onlyLocal };
}

async function introspectOnline() {
  const PG_PORT = Number(process.env.PARITY_PG_PORT || 54331);
  const DB_URL = `postgres://postgres:postgres@127.0.0.1:${PG_PORT}/postgres`;
  Object.assign(process.env, {
    DATABASE_URL: DB_URL,
    SERVER_TOKEN_SECRET: process.env.SERVER_TOKEN_SECRET || "parity-secret",
    PLATFORM_ADMIN_EMAIL: process.env.PLATFORM_ADMIN_EMAIL || "admin@syscontrol.local",
    PLATFORM_ADMIN_PASSWORD: process.env.PLATFORM_ADMIN_PASSWORD || "admin123",
    PLATFORM_ADMIN_NAME: process.env.PLATFORM_ADMIN_NAME || "Admin",
  });
  const dataDir = path.join(os.tmpdir(), `parity-pg-${Date.now()}`);
  const db = await PGlite.create({ dataDir });
  await db.waitReady;
  const socket = new PGLiteSocketServer({ db, port: PG_PORT, host: "127.0.0.1" });
  await socket.start();

  const knex = knexFactory({
    client: "pg",
    connection: DB_URL,
    pool: { min: 0, max: 1 },
    migrations: { directory: ONLINE_MIGRATIONS, tableName: "server_knex_migrations" },
  });

  const map = new Map();
  try {
    await knex.migrate.latest();
    const res = await knex.raw(
      "SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = 'public'",
    );
    for (const row of res.rows) {
      const t = row.table_name;
      if (KNEX_TABLES.has(t)) continue;
      if (!map.has(t)) map.set(t, new Set());
      map.get(t).add(row.column_name);
    }
  } finally {
    await knex.destroy();
    await socket.stop();
    await db.close();
    rmSync(dataDir, { recursive: true, force: true });
  }
  return map;
}

async function introspectLocal() {
  const file = path.join(os.tmpdir(), `parity-sqlite-${Date.now()}.sqlite3`);
  const knex = knexFactory({
    client: "better-sqlite3",
    connection: { filename: file },
    useNullAsDefault: true,
    migrations: { directory: LOCAL_MIGRATIONS },
  });

  const map = new Map();
  try {
    await knex.migrate.latest();
    const tables = await knex.raw(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'",
    );
    for (const { name } of tables) {
      if (KNEX_TABLES.has(name)) continue;
      const cols = await knex.raw(`PRAGMA table_info('${name}')`);
      map.set(name, new Set(cols.map((c) => c.name)));
    }
  } finally {
    await knex.destroy();
    rmSync(file, { force: true });
  }
  return map;
}

async function main() {
  console.log("[parity] subindo schema ONLINE (PGlite) e LOCAL (SQLite)...");
  const [online, local] = await Promise.all([introspectOnline(), introspectLocal()]);

  const onlineTables = new Set(online.keys());
  const localTables = new Set(local.keys());
  const shared = [...onlineTables].filter((t) => localTables.has(t)).sort();
  const onlyOnlineTables = [...onlineTables].filter((t) => !localTables.has(t)).sort();
  const onlyLocalTables = [...localTables].filter((t) => !onlineTables.has(t)).sort();

  let divergences = 0;
  console.log(`\n[parity] tabelas compartilhadas: ${shared.length}`);
  for (const t of shared) {
    const { onlyOnline, onlyLocal } = diffCols(online.get(t), local.get(t), t);
    if (onlyOnline.length || onlyLocal.length) {
      divergences++;
      console.log(`\n  ✗ ${t}`);
      if (onlyOnline.length) console.log(`      só no ONLINE: ${onlyOnline.join(", ")}`);
      if (onlyLocal.length) console.log(`      só no LOCAL : ${onlyLocal.join(", ")}`);
    }
  }
  if (!divergences) console.log("  ✓ todas as colunas de negócio batem (ignorando loja_id).");

  console.log(`\n[parity] só no ONLINE (esperado: plataforma/billing): ${onlyOnlineTables.join(", ") || "—"}`);
  console.log(`[parity] só no LOCAL: ${onlyLocalTables.join(", ") || "—"}`);

  if (divergences) {
    console.error(`\n[parity] FALHOU: ${divergences} tabela(s) com colunas divergentes.`);
    process.exit(1);
  }
  console.log("\n[parity] OK: schemas em paridade.");
  process.exit(0);
}

main().catch((err) => {
  console.error("[parity] erro:", err.message);
  process.exit(2);
});
