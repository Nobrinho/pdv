import { ipcMain, BrowserWindow } from "electron";

export function registerPrintHandlers(mainWindow: BrowserWindow) {
  ipcMain.handle("print-silent", async (_event, contentHtml: string, printerName: string) => {
    console.log(`🖨️ Tentando imprimir: "${printerName}"`);

    if (printerName && printerName !== "Padrão do Windows") {
      const printers = await mainWindow.webContents.getPrintersAsync();
      const exists = printers.find((p) => p.name === printerName);
      if (!exists) return { success: false, error: "Impressora não encontrada." };
    }

    let printWindow = new BrowserWindow({
      show: false,
      width: 300,
      height: 600,
      webPreferences: { nodeIntegration: false },
    });

    const fullHtml = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
          <meta charset="UTF-8">
          <style>
              @page { margin: 0; size: auto; }
              * {
                  box-sizing: border-box;
                  color: #000 !important;
                  text-shadow: 0 0 0 #000;
              }
              body {
                  font-family: 'Courier New', Courier, monospace;
                  font-size: 13px;
                  font-weight: 700;
                  margin: 0;
                  padding: 5px;
                  width: 280px;
                  background-color: #fff;
              }
              .flex { display: flex; }
              .justify-between { justify-content: space-between; }
              .text-center { text-align: center; }
              .text-right { text-align: right; }
              .font-bold { font-weight: 900; }
              .border-b { border-bottom: 2px dashed #000; padding-bottom: 5px; margin-bottom: 5px; }
              .border-t { border-top: 2px dashed #000; padding-top: 5px; margin-top: 5px; }
              .mb-2 { margin-bottom: 5px; }
              .mb-4 { margin-bottom: 10px; }
              .mt-2 { margin-top: 5px; }
              .mt-4 { margin-top: 10px; }
              .uppercase { text-transform: uppercase; }
              .text-xs { font-size: 11px; }
              .text-sm { font-size: 13px; }
              img { max-width: 100%; height: auto; display: block; margin: 0 auto; image-rendering: crisp-edges; }
              table { width: 100%; border-collapse: collapse; }
              td, th { padding: 2px 0; vertical-align: top; }
          </style>
      </head>
      <body>
          ${contentHtml}
      </body>
      </html>
    `;

    try {
      await printWindow.loadURL(
        `data:text/html;charset=utf-8,${encodeURIComponent(fullHtml)}`,
      );

      // Aumentado para 1000ms para garantir carregamento de imagens base64
      await new Promise((r) => setTimeout(r, 1000));

      const options: Electron.WebContentsPrintOptions = {
        silent: true,
        printBackground: false,
        color: false,
        margins: { marginType: "none" },
        landscape: false,
        scaleFactor: 100,
        copies: 1,
      };

      if (printerName && printerName !== "Padrão do Windows") {
        options.deviceName = printerName;
      }

      await printWindow.webContents.print(options);

      setTimeout(() => {
        if (!printWindow.isDestroyed()) printWindow.close();
      }, 2000);

      return { success: true };
    } catch (error: any) {
      console.error("Erro print:", error);
      if (!printWindow.isDestroyed()) printWindow.close();
      return { success: false, error: error.message };
    }
  });
}
