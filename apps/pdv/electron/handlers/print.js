/**
 * Handler de impressao silenciosa.
 */
const { BrowserWindow } = require("electron");

function sanitizeReceiptHtml(contentHtml = "") {
  return String(contentHtml)
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/<iframe[\s\S]*?>[\s\S]*?<\/iframe>/gi, "")
    .replace(/<object[\s\S]*?>[\s\S]*?<\/object>/gi, "")
    .replace(/<embed[\s\S]*?>/gi, "")
    .replace(/<link[\s\S]*?>/gi, "")
    .replace(/<meta[\s\S]*?>/gi, "")
    .replace(/\son\w+="[^"]*"/gi, "")
    .replace(/\son\w+='[^']*'/gi, "")
    .replace(/\son\w+=\S+/gi, "")
    .replace(/\s(src|href)\s*=\s*["']?\s*javascript:[^"'\s>]*/gi, "")
    .replace(/javascript:/gi, "");
}

function buildPrintShell(contentHtml, isDocumentLayout) {
  const bodyStyle = isDocumentLayout
    ? `
        font-family: Arial, sans-serif;
        font-size: 14px;
        font-weight: 400;
        margin: 0;
        padding: 24px;
        width: 100%;
        max-width: 900px;
        background-color: #fff;
      `
    : `
        font-family: 'Courier New', Courier, monospace;
        font-size: 13px;
        font-weight: 700;
        margin: 0;
        padding: 5px;
        width: 280px;
        background-color: #fff;
      `;

  return `
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
        body { ${bodyStyle} }
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
        table { width: 100%; border-collapse: collapse; }
        td, th { padding: 2px 0; vertical-align: top; }
      </style>
    </head>
    <body>
      ${contentHtml}
    </body>
    </html>
  `;
}

function register(safeHandle, knex, mainWindow) {
  const isDefaultPrinter = (printerName) =>
    !printerName || printerName === "Padrao do Windows" || printerName === "Padrão do Windows";

  safeHandle("get-printers", async () => {
    return mainWindow.webContents.getPrintersAsync();
  });

  safeHandle("print-silent", async (event, contentHtml, printerName, printOptions = {}) => {
    console.log(`Tentando imprimir: "${printerName}"`);

    if (!isDefaultPrinter(printerName)) {
      const printers = await mainWindow.webContents.getPrintersAsync();
      const exists = printers.find((printer) => printer.name === printerName);
      if (!exists) return { success: false, error: "Impressora nao encontrada." };
    }

    const safeContentHtml = sanitizeReceiptHtml(contentHtml);
    const isDocumentLayout = printOptions?.layout === "document";
    const fullHtml = buildPrintShell(safeContentHtml, isDocumentLayout);

    const printWindow = new BrowserWindow({
      show: false,
      width: isDocumentLayout ? 1000 : 300,
      height: isDocumentLayout ? 1200 : 600,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true,
      },
    });

    try {
      await printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(fullHtml)}`);
      await new Promise((resolve) => setTimeout(resolve, 500));

      const options = {
        silent: true,
        printBackground: isDocumentLayout,
        color: false,
        margins: { marginType: "none" },
        landscape: Boolean(printOptions?.landscape),
        scaleFactor: 100,
        copies: 1,
      };

      if (!isDefaultPrinter(printerName)) {
        options.deviceName = printerName;
      }

      await printWindow.webContents.print(options);

      setTimeout(() => {
        if (!printWindow.isDestroyed()) printWindow.close();
      }, 2000);

      return { success: true };
    } catch (error) {
      console.error("Erro print:", error);
      if (!printWindow.isDestroyed()) printWindow.close();
      return { success: false, error: error.message };
    }
  });
}

module.exports = { register, sanitizeReceiptHtml };
