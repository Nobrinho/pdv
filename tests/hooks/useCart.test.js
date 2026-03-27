import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import useCart from "../../src/hooks/useCart";

// Mock do hook useAlert
vi.mock("../../src/context/AlertSystem", () => ({
  useAlert: () => ({
    showAlert: vi.fn(),
  }),
}));

describe("useCart Hook", () => {
  const products = [
    { id: 1, nome: "Produto 1", preco_venda: 100, estoque_atual: 10 },
    { id: 2, nome: "Produto 2", preco_venda: 20, estoque_atual: 5 },
  ];

  it("deve iniciar com carrinho vazio", () => {
    const { result } = renderHook(() => useCart(products));
    expect(result.current.cart).toEqual([]);
    expect(result.current.subtotal).toBe(0);
  });

  it("deve adicionar item ao carrinho", () => {
    const { result } = renderHook(() => useCart(products));
    const product = products[0];

    act(() => {
      result.current.addToCart(product);
    });

    expect(result.current.cart).toHaveLength(1);
    expect(result.current.cart[0].nome).toBe("Produto 1");
    expect(result.current.cart[0].qty).toBe(1);
    expect(result.current.subtotal).toBe(100);
  });

  it("deve incrementar quantidade ao adicionar produto repetido", () => {
    const { result } = renderHook(() => useCart(products));
    const product = products[0];

    act(() => { result.current.addToCart(product); });
    act(() => { result.current.addToCart(product); });

    expect(result.current.cart).toHaveLength(1);
    expect(result.current.cart[0].qty).toBe(2);
    expect(result.current.subtotal).toBe(200);
  });

  it("deve remover item do carrinho", () => {
    const { result } = renderHook(() => useCart(products));
    const product = products[0];

    act(() => { result.current.addToCart(product); });
    expect(result.current.cart).toHaveLength(1);

    act(() => { result.current.removeFromCart(1); });
    expect(result.current.cart).toHaveLength(0);
  });

  it("deve alterar quantidade manualmente", () => {
    const { result } = renderHook(() => useCart(products));
    const product = products[0];

    act(() => { result.current.addToCart(product); });
    act(() => { result.current.handleQuantityChange(1, "5"); });

    expect(result.current.cart[0].qty).toBe(5);
    expect(result.current.subtotal).toBe(500);
  });

  it("deve limpar o carrinho", () => {
    const { result } = renderHook(() => useCart(products));
    act(() => { result.current.addToCart(products[0]); });
    act(() => { result.current.addToCart(products[1]); });

    expect(result.current.cart).toHaveLength(2);

    act(() => { result.current.clearCart(); });

    expect(result.current.cart).toHaveLength(0);
    expect(result.current.subtotal).toBe(0);
  });
});
