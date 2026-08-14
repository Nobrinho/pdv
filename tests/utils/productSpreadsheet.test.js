import { describe, expect, it } from "vitest";
import {
  buildProductExportWorkbook,
  buildProductTemplateWorkbook,
  getProductExportFilename,
  mapProductsToSpreadsheetRows,
} from "../../apps/pdv/src/utils/productSpreadsheet";

describe("productSpreadsheet utils", () => {
  it("mapeia produtos para linhas de exportacao", () => {
    const rows = mapProductsToSpreadsheetRows([
      {
        codigo: "P001",
        descricao: "Produto A",
        custo: 10,
        preco_venda: 20,
        estoque_atual: 5,
        tipo: "usado",
      },
    ]);

    expect(rows).toEqual([
      {
        Codigo: "P001",
        Descricao: "Produto A",
        Custo: 10,
        "Preco Venda": 20,
        Estoque: 5,
        Tipo: "usado",
      },
    ]);
  });

  it("gera workbook de modelo com aba de produtos", () => {
    const workbook = buildProductTemplateWorkbook();

    expect(workbook.SheetNames).toEqual(["Produtos"]);
    expect(workbook.Sheets.Produtos.A1.v).toBe("Codigo");
    expect(workbook.Sheets.Produtos.B2.v).toBe("Pneu 195/65 R15");
  });

  it("gera workbook de exportacao com os dados do produto", () => {
    const workbook = buildProductExportWorkbook([
      {
        codigo: "P001",
        descricao: "Produto A",
        custo: 10,
        preco_venda: 20,
        estoque_atual: 5,
        tipo: "novo",
      },
    ]);

    expect(workbook.SheetNames).toEqual(["Produtos"]);
    expect(workbook.Sheets.Produtos.A2.v).toBe("P001");
    expect(workbook.Sheets.Produtos.B2.v).toBe("Produto A");
  });

  it("monta nome de arquivo com data previsivel", () => {
    const filename = getProductExportFilename(
      "xlsx",
      new Date("2026-05-16T12:00:00.000Z"),
    );

    expect(filename).toBe("produtos_2026-05-16.xlsx");
  });
});
