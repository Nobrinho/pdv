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
  databaseUrl: process.env.DATABASE_URL,
  port: Number(process.env.SERVER_PORT || 3333),
  tokenSecret: process.env.SERVER_TOKEN_SECRET || "dev-only-token-secret",
  platformAdmin: {
    email: process.env.PLATFORM_ADMIN_EMAIL || "admin@syscontrol.local",
    password: process.env.PLATFORM_ADMIN_PASSWORD || "admin123",
    name: process.env.PLATFORM_ADMIN_NAME || "Administrador",
  },
};

module.exports = { config };
