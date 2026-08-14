const fs = require("fs");
const path = require("path");

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;

  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const cleanLine = line.trim();
    if (!cleanLine || cleanLine.startsWith("#")) continue;

    const separatorIndex = cleanLine.indexOf("=");
    if (separatorIndex === -1) continue;

    const key = cleanLine.slice(0, separatorIndex).trim();
    const value = cleanLine.slice(separatorIndex + 1).trim();
    if (key && process.env[key] === undefined) {
      process.env[key] = value.replace(/^["']|["']$/g, "");
    }
  }
}

loadEnvFile(path.join(__dirname, "../.env"));
loadEnvFile(path.join(__dirname, "../../.env"));

const config = {
  nodeEnv: process.env.NODE_ENV || "development",
  isProduction: process.env.NODE_ENV === "production",
  databaseUrl: process.env.DATABASE_URL,
  // PaaS (Koyeb/Render/Railway) injetam a porta via PORT.
  port: Number(process.env.PORT || process.env.SERVER_PORT || 3333),
  tokenSecret: process.env.SERVER_TOKEN_SECRET || "dev-only-token-secret",
  // Allowlist de CORS (origens separadas por virgula). Vazio = "*" (dev).
  corsOrigins: String(process.env.CORS_ORIGINS || "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean),
  // Swagger /docs: habilitado em dev; em prod so se ENABLE_DOCS=1.
  enableDocs: process.env.ENABLE_DOCS
    ? ["1", "true", "yes"].includes(String(process.env.ENABLE_DOCS).toLowerCase())
    : process.env.NODE_ENV !== "production",
  authRateLimit: {
    windowMs: Number(process.env.AUTH_RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000),
    max: Number(process.env.AUTH_RATE_LIMIT_MAX || 20),
  },
  platformAdmin: {
    email: process.env.PLATFORM_ADMIN_EMAIL || "admin@syscontrol.local",
    password: process.env.PLATFORM_ADMIN_PASSWORD || "admin123",
    name: process.env.PLATFORM_ADMIN_NAME || "Administrador",
  },
};

// Em producao, falha se segredos essenciais estiverem ausentes ou nos defaults.
function validateConfig() {
  if (!config.isProduction) return;
  const problems = [];
  if (!process.env.SERVER_TOKEN_SECRET || config.tokenSecret === "dev-only-token-secret") {
    problems.push("SERVER_TOKEN_SECRET ausente ou usando o valor padrao de desenvolvimento.");
  }
  if (config.tokenSecret && config.tokenSecret.length < 24) {
    problems.push("SERVER_TOKEN_SECRET muito curto (use 24+ caracteres aleatorios).");
  }
  if (!process.env.PLATFORM_ADMIN_PASSWORD || config.platformAdmin.password === "admin123") {
    problems.push("PLATFORM_ADMIN_PASSWORD ausente ou usando o valor padrao 'admin123'.");
  }
  if (!config.databaseUrl) {
    problems.push("DATABASE_URL ausente.");
  }
  if (problems.length) {
    throw new Error(`Configuracao de producao invalida:\n - ${problems.join("\n - ")}`);
  }
}

module.exports = { config, validateConfig };
