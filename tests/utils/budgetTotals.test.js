import { describe, expect, it } from "vitest";
import { calculateBudgetTotals, toBudgetNumber } from "../../apps/pdv/src/utils/budgetTotals";

describe("budgetTotals", () => {
  it("normaliza valores invalidos para zero", () => {
    expect(toBudgetNumber("10.5")).toBe(10.5);
    expect(toBudgetNumber("abc")).toBe(0);
    expect(toBudgetNumber(undefined)).toBe(0);
  });

  it("calcula subtotal e total final sem permitir negativo", () => {
    const totals = calculateBudgetTotals({
      cart: [
        { preco_venda: 50, qty: 2 },
        { preco_venda: 10, qty: 1 },
      ],
      laborInput: "20",
      surchargeValue: "5",
      discountValue: "200",
    });

    expect(totals.subtotal).toBe(110);
    expect(totals.labor).toBe(20);
    expect(totals.surcharge).toBe(5);
    expect(totals.discount).toBe(200);
    expect(totals.total).toBe(0);
  });
});
