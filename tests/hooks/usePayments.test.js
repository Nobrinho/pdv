import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import usePayments from "../../src/hooks/usePayments";

// Mock do hook useAlert que é usado dentro de usePayments
vi.mock("../../src/context/AlertSystem", () => ({
  useAlert: () => ({
    showAlert: vi.fn(),
  }),
}));

describe("usePayments Hook", () => {
  const cart = [
    { id: 1, preco_venda: 100, qty: 2 }, // 200
  ];
  const subtotal = 200;

  it("deve calcular o total inicial corretamente sem descontos", () => {
    const { result } = renderHook(() => usePayments({ 
      subtotal, 
      discountValue: 0, 
      discountType: "fixed", 
      surchargeValue: 0, 
      surchargeType: "fixed", 
      laborInput: 0 
    }));
    
    expect(result.current.totals.subtotal).toBe(200);
    expect(result.current.totals.total).toBe(200);
    expect(result.current.totals.remaining).toBe(200);
  });

  it("deve aplicar desconto em porcentagem", () => {
    const { result } = renderHook(() => usePayments({ 
      subtotal, 
      discountValue: 10, 
      discountType: "percent", 
      surchargeValue: 0, 
      surchargeType: "fixed", 
      laborInput: 0 
    }));
    
    expect(result.current.totals.discountAmount).toBe(20);
    expect(result.current.totals.total).toBe(180);
  });

  it("deve aplicar acréscimo em porcentagem", () => {
    const { result } = renderHook(() => usePayments({ 
      subtotal, 
      discountValue: 0, 
      discountType: "fixed", 
      surchargeValue: 5, 
      surchargeType: "percent", 
      laborInput: 0 
    }));
    
    expect(result.current.totals.surchargeAmount).toBe(10);
    expect(result.current.totals.total).toBe(210);
  });

  it("deve gerenciar múltiplos pagamentos", () => {
    const { result } = renderHook(() => usePayments({ 
      subtotal, 
      discountValue: 0, 
      discountType: "fixed", 
      surchargeValue: 0, 
      surchargeType: "fixed", 
      laborInput: 0 
    }));

    act(() => { result.current.setCurrentPaymentMethod("Dinheiro"); });
    act(() => { result.current.setCurrentPaymentValue("50"); });
    act(() => { result.current.addPayment(); });

    expect(result.current.payments).toHaveLength(1);
    expect(result.current.totals.remaining).toBe(150);

    act(() => { result.current.setCurrentPaymentMethod("Cartão Débito"); });
    act(() => { result.current.setCurrentPaymentValue("100"); });
    act(() => { result.current.addPayment(); });

    expect(result.current.payments).toHaveLength(2);
    expect(result.current.totals.remaining).toBe(50);
  });

  it("deve calcular troco quando pagamento excede o total", () => {
    const { result } = renderHook(() => usePayments({ 
      subtotal, 
      discountValue: 0, 
      discountType: "fixed", 
      surchargeValue: 0, 
      surchargeType: "fixed", 
      laborInput: 0 
    }));

    act(() => { result.current.setCurrentPaymentMethod("Dinheiro"); });
    act(() => { result.current.setCurrentPaymentValue("250"); });
    act(() => { result.current.addPayment(); });

    expect(result.current.totals.remaining).toBe(0);
    expect(result.current.totals.change).toBe(50);
  });

  it("deve remover um pagamento", () => {
    const { result } = renderHook(() => usePayments({ 
      subtotal, 
      discountValue: 0, 
      discountType: "fixed", 
      surchargeValue: 0, 
      surchargeType: "fixed", 
      laborInput: 0 
    }));

    act(() => { result.current.setCurrentPaymentValue("100"); });
    act(() => { result.current.addPayment(); });

    expect(result.current.payments).toHaveLength(1);

    act(() => { result.current.removePayment(0); });

    expect(result.current.payments).toHaveLength(0);
    expect(result.current.totals.remaining).toBe(200);
  });

  it("deve preencher valor restante automaticamente", () => {
    const { result } = renderHook(() => usePayments({ 
      subtotal, 
      discountValue: 10, 
      discountType: "percent", 
      surchargeValue: 0, 
      surchargeType: "fixed", 
      laborInput: 0 
    }));

    act(() => { result.current.autoFillRemaining(); });

    expect(result.current.currentPaymentValue).toBe("180.00");
  });
});
