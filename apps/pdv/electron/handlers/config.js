/**
 * Handlers de Configurações e Backup/Restore
 */
const fs = require("fs");
const { dialog } = require("electron");
const { requirePerm, hasUsers } = require("../lib/authSession");
const {
  TENANT_CONFIG_KEYS,
  buildTenantResponse,
} = require("../../../../packages/shared/domain/tenant");

const ALLOWED_CONFIG_KEYS = new Set([
  ...TENANT_CONFIG_KEYS,
  "comissao_padrao",
  "comissao_usados",
  "impressora_padrao",
]);

function register(safeHandle, knex, mainWindow, authSession) {
  safeHandle("get-config", async (event, k) => {
    return (await knex("configuracoes").where("chave", k).first())?.valor;
  });

  // --- WHITE LABEL: Retorna todas as configurações de identidade da loja ---
  safeHandle("get-tenant-config", async () => {
    const rows = await knex("configuracoes")
      .whereRaw("chave LIKE 'loja_%' OR chave LIKE 'cor_%' OR chave LIKE 'dev_%'");
    const map = Object.fromEntries(rows.map((r) => [r.chave, r.valor]));
    // Mesmo contrato do backend online (packages/shared).
    return buildTenantResponse(map);
  });

  safeHandle("save-config", async (event, k, v) => {
    if (!ALLOWED_CONFIG_KEYS.has(k)) {
      return { success: false, error: "Configuracao nao permitida." };
    }
    // Bootstrap (onboarding, ainda sem usuários) é liberado. Depois disso,
    // chaves de comissão exigem config.commissions; demais, config.identity.
    if (await hasUsers(knex)) {
      const cap = String(k).startsWith("comissao") ? "config.commissions" : "config.identity";
      const authError = await requirePerm(event, knex, authSession, cap);
      if (authError) return authError;
    }

    const ex = await knex("configuracoes").where("chave", k).first();
    ex
      ? await knex("configuracoes").where("chave", k).update({ valor: v })
      : await knex("configuracoes").insert({ chave: k, valor: v });
    return { success: true };
  });

  safeHandle("backup-database", async (event) => {
    const authError = await requirePerm(event, knex, authSession, "backup.run");
    if (authError) return authError;

    const { dbPath } = require("../lib/db");
    const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
      defaultPath: `backup_${Date.now()}.sqlite3`,
    });
    if (canceled) return { success: false };
    await fs.promises.copyFile(dbPath, filePath);
    return { success: true };
  });

  safeHandle("restore-database", async (event) => {
    const authError = await requirePerm(event, knex, authSession, "backup.run");
    if (authError) return authError;

    const { app } = require("electron");
    const { dbPath } = require("../lib/db");
    const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
      properties: ["openFile"],
      filters: [{ extensions: ["sqlite3"] }],
    });
    if (canceled) return { success: false };
    await fs.promises.copyFile(filePaths[0], dbPath);
    app.relaunch();
    app.exit(0);
  });

  safeHandle("save-generated-file", async (event, options = {}) => {
    const { defaultPath = `arquivo_${Date.now()}`, filters = [], dataBase64 = "" } = options;
    if (!dataBase64 || typeof dataBase64 !== "string") {
      return { success: false, error: "Arquivo gerado invalido." };
    }

    const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
      defaultPath,
      filters,
    });

    if (canceled || !filePath) {
      return { success: false, canceled: true };
    }

    await fs.promises.writeFile(filePath, Buffer.from(dataBase64, "base64"));
    return { success: true, filePath };
  });
}

module.exports = { register };
