import * as XLSX from "xlsx";

const TEMPLATE_ROWS = [
  ["Codigo", "Descricao", "Custo", "Preco Venda", "Estoque", "Tipo"],
  ["P001", "Pneu 195/65 R15", 80.0, 120.0, 10, "novo"],
  ["P002", "Oleo Motor 5W30 1L", 25.0, 45.0, 50, "novo"],
];

const TEMPLATE_COLUMNS = [
  { wch: 12 },
  { wch: 25 },
  { wch: 10 },
  { wch: 12 },
  { wch: 10 },
  { wch: 8 },
];

const EXPORT_COLUMNS = [
  { wch: 14 },
  { wch: 30 },
  { wch: 10 },
  { wch: 12 },
  { wch: 10 },
  { wch: 8 },
];

export function mapProductsToSpreadsheetRows(products = []) {
  return products.map((product) => ({
    Codigo: product.codigo,
    Descricao: product.descricao,
    Custo: product.custo,
    "Preco Venda": product.preco_venda,
    Estoque: product.estoque_atual,
    Tipo: product.tipo || "novo",
  }));
}

export function buildProductTemplateWorkbook() {
  const worksheet = XLSX.utils.aoa_to_sheet(TEMPLATE_ROWS);
  worksheet["!cols"] = TEMPLATE_COLUMNS;
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Produtos");
  return workbook;
}

export function buildProductExportWorkbook(products = []) {
  const worksheet = XLSX.utils.json_to_sheet(
    mapProductsToSpreadsheetRows(products),
  );
  worksheet["!cols"] = EXPORT_COLUMNS;
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Produtos");
  return workbook;
}

export function getProductExportFilename(extension, date = new Date()) {
  return `produtos_${date.toISOString().slice(0, 10)}.${extension}`;
}

export function downloadProductTemplate() {
  XLSX.writeFile(buildProductTemplateWorkbook(), "modelo_importacao_produtos.xlsx");
}

export function exportProductsToExcel(products = [], date = new Date()) {
  XLSX.writeFile(
    buildProductExportWorkbook(products),
    getProductExportFilename("xlsx", date),
  );
}

export function exportProductsToCsv(products = [], date = new Date()) {
  XLSX.writeFile(
    buildProductExportWorkbook(products),
    getProductExportFilename("csv", date),
    { bookType: "csv", FS: ";" },
  );
}
