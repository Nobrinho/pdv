/**
 * Handlers de Configurações e Backup/Restore
 */
const fs = require("fs");
const { dialog } = require("electron");
const { requireAdmin } = require("../lib/authSession");

const ALLOWED_CONFIG_KEYS = new Set([
  "loja_nome",
  "loja_subtitulo",
  "loja_endereco",
  "loja_cidade",
  "loja_telefone",
  "loja_documento",
  "loja_logo_base64",
  "loja_bg_base64",
  "cor_primaria",
  "cor_secundaria",
  "dev_nome",
  "dev_link",
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
    return Object.fromEntries(rows.map((r) => [r.chave, r.valor]));
  });

  safeHandle("save-config", async (event, k, v) => {
    if (!ALLOWED_CONFIG_KEYS.has(k)) {
      return { success: false, error: "Configuracao nao permitida." };
    }
    const authError = await requireAdmin(event, knex, authSession, { allowBootstrap: true });
    if (authError) return authError;

    const ex = await knex("configuracoes").where("chave", k).first();
    ex
      ? await knex("configuracoes").where("chave", k).update({ valor: v })
      : await knex("configuracoes").insert({ chave: k, valor: v });
    return { success: true };
  });

  safeHandle("backup-database", async (event) => {
    const authError = await requireAdmin(event, knex, authSession);
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
    const authError = await requireAdmin(event, knex, authSession);
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
