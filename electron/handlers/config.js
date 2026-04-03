/**
 * Handlers de Configurações e Backup/Restore
 */
const fs = require("fs");
const { dialog } = require("electron");

function register(safeHandle, knex, mainWindow) {
  const { dbPath } = require("../lib/db");

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
    const ex = await knex("configuracoes").where("chave", k).first();
    ex
      ? await knex("configuracoes").where("chave", k).update({ valor: v })
      : await knex("configuracoes").insert({ chave: k, valor: v });
    return { success: true };
  });

  safeHandle("backup-database", async () => {
    const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
      defaultPath: `backup_${Date.now()}.sqlite3`,
    });
    if (canceled) return { success: false };
    await fs.promises.copyFile(dbPath, filePath);
    return { success: true };
  });

  safeHandle("restore-database", async () => {
    const { app } = require("electron");
    const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
      properties: ["openFile"],
      filters: [{ extensions: ["sqlite3"] }],
    });
    if (canceled) return { success: false };
    await fs.promises.copyFile(filePaths[0], dbPath);
    app.relaunch();
    app.exit(0);
  });
}

module.exports = { register };
