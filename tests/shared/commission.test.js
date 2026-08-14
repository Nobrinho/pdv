import { describe, it, expect } from "vitest";
import { createRequire } from "module";

// commission é CommonJS (usado por Node/Electron); carrega via require.
const require = createRequire(import.meta.url);
const { calcularComissaoItem, calcularComissaoVenda } = require("../../packages/shared/domain/commission.js");

describe("comissão (packages/shared)", () => {
  const venda = { subtotal: 100, desconto_valor: 0 };

  it("item NOVO: % sobre faturamento líquido", () => {
    const item = { preco_unitario: 100, quantidade: 1, tipo: "novo" };
    expect(calcularComissaoItem(item, venda, 0.3, 0.25)).toBe(30);
  });

  it("item USADO: % sobre o lucro (receita - custo)", () => {
    const item = { preco_unitario: 100, quantidade: 1, custo_unitario: 60, tipo: "usado" };
    expect(calcularComissaoItem(item, venda, 0.3, 0.25)).toBe(10);
  });

  it("usado com prejuízo não gera comissão negativa", () => {
    const item = { preco_unitario: 100, quantidade: 1, custo_unitario: 120, tipo: "usado" };
    expect(calcularComissaoItem(item, venda, 0.3, 0.25)).toBe(0);
  });

  it("rateia o desconto da venda proporcionalmente ao item", () => {
    const v = { subtotal: 200, desconto_valor: 20 };
    const item = { preco_unitario: 100, quantidade: 1, tipo: "novo" };
    expect(calcularComissaoItem(item, v, 0.3, 0.25)).toBe(27);
  });

  it("soma a comissão de todos os itens da venda", () => {
    const v = { subtotal: 150, desconto_valor: 0 };
    const itens = [
      { preco_unitario: 100, quantidade: 1, tipo: "novo" },
      { preco_unitario: 50, quantidade: 1, custo_unitario: 30, tipo: "usado" },
    ];
    expect(calcularComissaoVenda(itens, v, 0.3, 0.25)).toBe(35);
  });

  it("tolera valores não numéricos (coerção segura)", () => {
    const item = { preco_unitario: "100", quantidade: "1", tipo: "novo" };
    expect(calcularComissaoItem(item, venda, 0.3, 0.25)).toBe(30);
  });
});
