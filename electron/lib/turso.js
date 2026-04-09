const { createClient } = require("@libsql/client");
const path = require("path");
require("dotenv").config();

let client = null;
let lastSync = null;
let syncStatus = "idle"; // idle | syncing | error
let onSyncChange = null;

function setOnSyncChange(cb) {
  onSyncChange = cb;
}

function getSyncStatus() {
  return { lastSync, syncStatus };
}

function notifyStatus(status, time = lastSync) {
  syncStatus = status;
  if (status === "success") lastSync = new Date().toISOString();
  if (onSyncChange) onSyncChange({ syncStatus, lastSync });
}

function initTurso(dbPath, customConfig = null) {
  if (client && !customConfig) return client;

  const config = customConfig || {
    url: process.env.TURSO_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  };

  if (!config.url || !config.authToken) {
    console.warn("⚠️ Configurações Turso não encontradas. Sincronização desativada.");
    client = null;
    return null;
  }

  // O Turso precisa do prefixo 'file:' para o caminho local
  const localUrl = `file:${dbPath}`;

  try {
    client = createClient({
      url: localUrl,
      syncUrl: config.url,
      authToken: config.authToken,
    });

    console.log("✅ Cliente Turso inicializado para réplica em:", dbPath);
    notifyStatus("idle");
    return client;
  } catch (error) {
    console.error("❌ Erro ao criar cliente Turso:", error);
    notifyStatus("error");
    return null;
  }
}

async function reinitTurso(dbPath, config) {
  console.log("🔄 Reinicializando Turso com nova configuração...");
  initTurso(dbPath, config);
  return await syncData();
}


async function syncData() {
  if (!client) return { success: false, error: "Cliente Turso não inicializado" };

  try {
    console.log("🔄 Sincronizando dados com Turso...");
    notifyStatus("syncing");
    
    await client.sync();
    
    notifyStatus("success");
    console.log("✨ Sincronização concluída com sucesso.");
    return { success: true };
  } catch (error) {
    notifyStatus("error");
    console.error("❌ Erro na sincronização Turso:", error);
    return { success: false, error: error.message };
  }
}

module.exports = { initTurso, syncData, getSyncStatus, setOnSyncChange, reinitTurso };

