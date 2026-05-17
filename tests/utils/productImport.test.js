import { describe, expect, it } from "vitest";
import {
  buildProductImportPreviewRows,
  mapProductImportColumn,
  normalizeImportHeader,
} from "../../src/utils/productImport";

describe("productImport utils", () => {
  it("normaliza cabecalhos com acentos e espacos", () => {
    expect(normalizeImportHeader("  Descrição  ")).toBe("descricao");
    expect(normalizeImportHeader("Preço Venda")).toBe("preco venda");
  });

  it("mapeia nomes flexiveis de colunas", () => {
    expect(mapProductImportColumn("Descrição")).toBe("descricao");
    expect(mapProductImportColumn("Cod")).toBe("codigo");
    expect(mapProductImportColumn("Preço Venda")).toBe("preco_venda");
    expect(mapProductImportColumn("Quantidade")).toBe("estoque_atual");
    expect(mapProductImportColumn("Ignorar")).toBe(null);
  });

  it("gera preview com status de novo, duplicado e erro", () => {
    const rawRows = [
      { "Código": "P001", "Descrição": "Produto Existente", "Preço Venda": 10 },
      { "Código": "P002", "Descrição": "Produto Novo", "Preço Venda": 20 },
      { "Código": "P003", "Descrição": "", "Preço Venda": 30 },
    ];

    const result = buildProductImportPreviewRows(rawRows, [{ codigo: "P001" }]);

    expect(result.hasDescriptionColumn).toBe(true);
    expect(result.rows).toHaveLength(3);
    expect(result.rows[0]._status).toBe("duplicate");
    expect(result.rows[1]._status).toBe("new");
    expect(result.rows[2]._status).toBe("error");
    expect(result.rows[0].preco_venda).toBe(10);
  });

  it("detecta ausencia da coluna obrigatoria de descricao", () => {
    const result = buildProductImportPreviewRows(
      [{ Codigo: "P001", Valor: 10 }],
      [],
    );

    expect(result.hasDescriptionColumn).toBe(false);
  });
});
