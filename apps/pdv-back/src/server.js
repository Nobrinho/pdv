const http = require("http");
const { config, validateConfig } = require("./config");
const { knex } = require("./db");
const { handleRequest } = require("./app");
const logger = require("./logger");

try {
  validateConfig();
} catch (error) {
  logger.error("config_invalid", { message: error.message });
  console.error(error.message);
  process.exit(1);
}

const server = http.createServer(handleRequest);

// Aplica as migrations pendentes no boot (release-phase). Assim um deploy
// (Render/etc.) mantém o schema do banco (Neon) em dia sem passo manual.
// Desative com AUTO_MIGRATE=false se preferir migrar por fora.
// Fail-fast: se a migration falhar, o processo não sobe — no Render a versão
// anterior continua no ar em vez de servir com schema incompatível.
async function applyMigrations() {
  if (String(process.env.AUTO_MIGRATE || "true") === "false") {
    logger.info("migrations_skipped", { reason: "AUTO_MIGRATE=false" });
    return;
  }
  try {
    const [batch, applied] = await knex.migrate.latest();
    if (applied.length) {
      logger.info("migrations_applied", { batch, count: applied.length, files: applied });
    } else {
      logger.info("migrations_up_to_date", {});
    }
  } catch (error) {
    logger.error("migrations_failed", { message: error.message });
    console.error("Falha ao aplicar migrations:", error.message);
    process.exit(1);
  }
}

applyMigrations().then(() => {
  server.listen(config.port, () => {
    logger.info("server_started", {
      port: config.port,
      env: config.nodeEnv,
      docs: config.enableDocs,
      corsMode: config.corsOrigins.length ? "allowlist" : "*",
    });
  });
});
