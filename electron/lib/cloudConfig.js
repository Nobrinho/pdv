const path = require("path");
const fs = require("fs");
const { app } = require("electron");

const CONFIG_PATH = path.join(app.getPath("userData"), "turso-config.json");

function getCloudConfig() {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const data = fs.readFileSync(CONFIG_PATH, "utf8");
      return JSON.parse(data);
    }
  } catch (error) {
    console.error("Erro ao ler turso-config.json:", error);
  }
  
  // Fallback para variáveis de ambiente (mantém compatibilidade dev)
  return {
    url: process.env.TURSO_URL || "",
    authToken: process.env.TURSO_AUTH_TOKEN || "",
  };
}

function saveCloudConfig(config) {
  try {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), "utf8");
    return { success: true };
  } catch (error) {
    console.error("Erro ao salvar turso-config.json:", error);
    return { success: false, error: error.message };
  }
}

module.exports = { getCloudConfig, saveCloudConfig };
