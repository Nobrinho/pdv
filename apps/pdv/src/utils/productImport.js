const COLUMN_NAME_MAP = {
  descricao: "descricao",
  nome: "descricao",
  produto: "descricao",
  codigo: "codigo",
  cod: "codigo",
  barcode: "codigo",
  "codigo de barras": "codigo",
  custo: "custo",
  "preco custo": "custo",
  "preco de custo": "custo",
  preco: "preco_venda",
  preco_venda: "preco_venda",
  valor: "preco_venda",
  "preco venda": "preco_venda",
  estoque: "estoque_atual",
  estoque_atual: "estoque_atual",
  qtd: "estoque_atual",
  quantidade: "estoque_atual",
  tipo: "tipo",
  condicao: "tipo",
};

export function normalizeImportHeader(header) {
  return (header || "")
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function mapProductImportColumn(header) {
  return COLUMN_NAME_MAP[normalizeImportHeader(header)] || null;
}

export function buildProductImportPreviewRows(rawRows, existingProducts = []) {
  const headers = Object.keys(rawRows[0] || {});
  const columnMap = {};

  headers.forEach((header) => {
    const mappedColumn = mapProductImportColumn(header);
    if (mappedColumn) {
      columnMap[header] = mappedColumn;
    }
  });

  const existingCodes = new Set(
    existingProducts
      .map((product) => product.codigo)
      .filter(Boolean)
      .map((code) => String(code)),
  );

  const rows = rawRows.map((row, index) => {
    const product = { _row: index + 2 };

    Object.entries(columnMap).forEach(([originalColumn, mappedColumn]) => {
      product[mappedColumn] = row[originalColumn];
    });

    if (!product.descricao || !String(product.descricao).trim()) {
      product._status = "error";
      product._statusMsg = "Descricao vazia";
      return product;
    }

    const hasDuplicateCode =
      product.codigo && existingCodes.has(String(product.codigo));

    product._status = hasDuplicateCode ? "duplicate" : "new";
    product._statusMsg = hasDuplicateCode
      ? "Codigo ja cadastrado"
      : "Novo produto";

    return product;
  });

  return {
    columnMap,
    hasDescriptionColumn: Object.values(columnMap).includes("descricao"),
    rows,
  };
}
