// =============================================================
// smoke-local.mjs - Roda o smoke test E2E sem PostgreSQL instalado.
// Sobe um Postgres embarcado (PGlite/WASM), aplica as migrations,
// inicia a API em processo e executa o smoke completo.
//
// Uso:  npm run server:smoke:local
// Requer devDeps: @electric-sql/pglite, @electric-sql/pglite-socket
// =============================================================
import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";
import knexFactory from "knex";
import http from "http";
import path from "path";
import os from "os";
import { fileURLToPath } from "url";
import { rmSync } from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BACK_ROOT = path.join(__dirname, "..");
const PORT = Number(process.env.SMOKE_PORT || 3333);
const PG_PORT = Number(process.env.SMOKE_PG_PORT || 54329);
const DB_URL = `postgres://postgres:postgres@127.0.0.1:${PG_PORT}/postgres`;
const DATA_DIR = path.join(os.tmpdir(), `syscontrol-pglite-${Date.now()}`);

// Configura ambiente ANTES de importar a app (db.js le no require).
Object.assign(process.env, {
  DATABASE_URL: DB_URL,
  DATABASE_POOL_MIN: "0",
  DATABASE_POOL_MAX: "1", // PGlite atende uma conexao por vez.
  SERVER_PORT: String(PORT),
  SERVER_TOKEN_SECRET: process.env.SERVER_TOKEN_SECRET || "smoke-local-secret",
  PLATFORM_ADMIN_EMAIL: process.env.PLATFORM_ADMIN_EMAIL || "admin@syscontrol.local",
  PLATFORM_ADMIN_PASSWORD: process.env.PLATFORM_ADMIN_PASSWORD || "admin123",
  PLATFORM_ADMIN_NAME: process.env.PLATFORM_ADMIN_NAME || "Administrador",
  SMOKE_BASE_URL: `http://127.0.0.1:${PORT}`,
});

let db;
let socket;
let server;

async function shutdown(code) {
  try { server && server.close(); } catch {}
  try { socket && (await socket.stop()); } catch {}
  try { db && (await db.close()); } catch {}
  try { rmSync(DATA_DIR, { recursive: true, force: true }); } catch {}
  process.exit(code);
}

async function run() {
  console.log("[smoke-local] iniciando PostgreSQL embarcado (PGlite)...");
  db = await PGlite.create({ dataDir: DATA_DIR });
  await db.waitReady;
  socket = new PGLiteSocketServer({ db, port: PG_PORT, host: "127.0.0.1" });
  await socket.start();

  console.log("[smoke-local] aplicando migrations...");
  const migrator = knexFactory({
    client: "pg",
    connection: DB_URL,
    pool: { min: 0, max: 1 },
    migrations: {
      directory: path.join(BACK_ROOT, "migrations"),
      tableName: "server_knex_migrations",
    },
  });
  await migrator.migrate.latest();
  await migrator.destroy();

  console.log("[smoke-local] subindo API...");
  const { handleRequest } = await import(path.join(BACK_ROOT, "src", "app.js"));
  server = http.createServer((req, res) => handleRequest(req, res));
  await new Promise((resolve) => server.listen(PORT, "127.0.0.1", resolve));

  console.log("[smoke-local] executando smoke...\n");
  const { main } = await import(path.join(BACK_ROOT, "scripts", "smoke.js"));
  await main();

  console.log("\n[smoke-local] OK");
  await shutdown(0);
}

run().catch(async (error) => {
  console.error("[smoke-local] FALHOU:", error);
  await shutdown(1);
});
