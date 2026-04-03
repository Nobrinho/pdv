import { describe, it, expect } from "vitest";
import {
  calcularComissaoItem,
  calcularComissaoVenda,
} from "../../electron/services/commission.js";

// ============================
// Helpers
// ============================

function criarVenda(overrides = {}) {
  return {
    subtotal: 300,
    desconto_valor: 0,
    desconto_tipo: "percent",
    ...overrides,
  };
}

function criarItem(overrides = {}) {
  return {
    preco_unitario: 100,
    quantidade: 1,
    custo_unitario: 60,
    tipo: "novo",
    ...overrides,
  };
}

// ============================
// Testes
// ============================

describe("calcularComissaoItem", () => {
  it("produto NOVO sem desconto — comissão sobre faturamento", () => {
    const item = criarItem({ preco_unitario: 100, quantidade: 1, tipo: "novo" });
    const venda = criarVenda({ subtotal: 100, desconto_valor: 0 });

    const comissao = calcularComissaoItem(item, venda, 0.30, 0.25);

    expect(comissao).toBeCloseTo(30, 2);
  });

  it("produto USADO com lucro — comissão sobre lucro", () => {
    const item = criarItem({
      preco_unitario: 100,
      quantidade: 1,
      custo_unitario: 60,
      tipo: "usado",
    });
    const venda = criarVenda({ subtotal: 100, desconto_valor: 0 });

    const comissao = calcularComissaoItem(item, venda, 0.30, 0.25);

    expect(comissao).toBeCloseTo(10, 2);
  });

  it("produto USADO sem lucro — comissão zero", () => {
    const item = criarItem({
      preco_unitario: 50,
      quantidade: 1,
      custo_unitario: 60,
      tipo: "usado",
    });
    const venda = criarVenda({ subtotal: 50, desconto_valor: 0 });

    const comissao = calcularComissaoItem(item, venda, 0.30, 0.25);

    expect(comissao).toBe(0);
  });

  it("desconto percentual rateado corretamente", () => {
    const venda = criarVenda({
      subtotal: 300,
      desconto_valor: 30, // O frontend já envia o valor em R$ calculado. 10% de 300 = 30.
      desconto_tipo: "percent",
    });

    const item1 = criarItem({ preco_unitario: 100, quantidade: 1, tipo: "novo" });
    const item2 = criarItem({ preco_unitario: 200, quantidade: 1, tipo: "novo" });

    const c1 = calcularComissaoItem(item1, venda, 0.30, 0.25);
    const c2 = calcularComissaoItem(item2, venda, 0.30, 0.25);

    expect(c1).toBeCloseTo(27, 2);
    expect(c2).toBeCloseTo(54, 2);
  });

  it("desconto fixo rateado proporcionalmente", () => {
    const venda = criarVenda({
      subtotal: 300,
      desconto_valor: 30,
      desconto_tipo: "fixed",
    });

    const item1 = criarItem({ preco_unitario: 100, quantidade: 1, tipo: "novo" });
    const item2 = criarItem({ preco_unitario: 200, quantidade: 1, tipo: "novo" });

    const c1 = calcularComissaoItem(item1, venda, 0.30, 0.25);
    const c2 = calcularComissaoItem(item2, venda, 0.30, 0.25);

    expect(c1).toBeCloseTo(27, 2);
    expect(c2).toBeCloseTo(54, 2);
  });

  it("vendedor com comissão fixa (taxa personalizada)", () => {
    const item = criarItem({ preco_unitario: 100, quantidade: 1, tipo: "novo" });
    const venda = criarVenda({ subtotal: 100, desconto_valor: 0 });

    const comissao = calcularComissaoItem(item, venda, 0.05, 0.25);

    expect(comissao).toBeCloseTo(5, 2);
  });
});

describe("calcularComissaoVenda", () => {
  it("soma comissões de múltiplos itens", () => {
    const venda = criarVenda({ subtotal: 300, desconto_valor: 0 });
    const itens = [
      criarItem({ preco_unitario: 100, quantidade: 1, tipo: "novo" }),
      criarItem({ preco_unitario: 200, quantidade: 1, custo_unitario: 120, tipo: "usado" }),
    ];

    const total = calcularComissaoVenda(itens, venda, 0.30, 0.25);

    expect(total).toBeCloseTo(50, 2);
  });
});
