import { ipcMain, dialog, app, BrowserWindow } from "electron";
import { SystemRepository } from "../database/repositories/SystemRepository";
import fs from "fs";
import path from "path";
import sharp from "sharp";

const systemRepo = new SystemRepository();

export function registerCompanyHandlers(mainWindow: BrowserWindow) {
  ipcMain.handle("get-company-info", async () => {
    try {
      const keys = [
        "empresa_nome",
        "empresa_endereco",
        "empresa_telefone",
        "empresa_cnpj",
        "empresa_logo",
      ];
      
      const result: any = {};
      for (const key of keys) {
        result[key] = await systemRepo.getConfig(key);
      }

      if (result.empresa_logo) {
        try {
          if (fs.existsSync(result.empresa_logo)) {
            const fileBuffer = fs.readFileSync(result.empresa_logo);
            const ext = path.extname(result.empresa_logo).replace(".", "");
            const base64 = fileBuffer.toString("base64");
            const base64Img = `data:image/${ext};base64,${base64}`;
            result.empresa_logo = base64Img;
            result.empresa_logo_url = base64Img;
          } else {
            result.empresa_logo = null;
          }
        } catch (err) {
          console.error("Erro ao ler arquivo de logo:", err);
          result.empresa_logo = null;
        }
      }

      return result;
    } catch (error) {
      console.error("Erro get-company-info:", error);
      return {};
    }
  });

  ipcMain.handle("save-company-info", async (_event, data: any) => {
    try {
      for (const [key, value] of Object.entries(data)) {
        if (key === "empresa_logo_url") continue;

        if (key === "empresa_logo") {
          if (typeof value === "string" && value.startsWith("data:image")) {
            continue;
          }
        }

        await systemRepo.saveConfig(key, value);
      }
      return { success: true };
    } catch (error: any) {
      console.error("Erro save-company-info:", error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("select-logo-file", async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
      properties: ["openFile"],
      filters: [{ name: "Imagens", extensions: ["jpg", "png", "jpeg"] }],
    });

    if (canceled || filePaths.length === 0) return null;

    const sourcePath = filePaths[0];
    const ext = path.extname(sourcePath);
    const destFileName = `logo_empresa${ext}`;
    const destPath = path.join(app.getPath("userData"), destFileName);

    try {
      // Processar com Sharp
      await sharp(sourcePath)
        .resize(300)
        .grayscale()
        .toFile(destPath);

      await systemRepo.saveConfig("empresa_logo", destPath);

      const fileBuffer = await fs.promises.readFile(destPath);
      const base64 = fileBuffer.toString("base64");
      const extName = path.extname(destPath).replace(".", "");
      return {
        path: destPath,
        base64: `data:image/${extName};base64,${base64}`,
      };
    } catch (error) {
      console.error("Erro ao salvar logo:", error);
      return null;
    }
  });
}
