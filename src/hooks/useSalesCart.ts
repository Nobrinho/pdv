import { useState, useCallback } from "react";
import { Product } from "../types";
import { useAlert } from "../context/AlertSystem";

export const useSalesCart = (products: Product[]) => {
  const [cart, setCart] = useState<(Product & { qty: number })[]>([]);
  const { showAlert } = useAlert();

  const addToCart = useCallback((product: Product) => {
    if ((product.estoque_atual || 0) <= 0) {
      showAlert(`Produto sem estoque: ${product.descricao}`, "Erro", "error");
      return;
    }

    setCart((prevCart) => {
      const existing = prevCart.find((item) => item.id === product.id);
      if (existing) {
        if (existing.qty < (product.estoque_atual || 0)) {
          return prevCart.map((item) =>
            item.id === product.id ? { ...item, qty: item.qty + 1 } : item
          );
        } else {
          showAlert("Estoque máximo atingido.", "Aviso", "warning");
          return prevCart;
        }
      } else {
        return [...prevCart, { ...product, qty: 1 }];
      }
    });
  }, [showAlert]);

  const handleQuantityChange = useCallback((id: number, newQty: number) => {
    if (isNaN(newQty) || newQty < 1) return;
    
    const originalProduct = products.find((p) => p.id === id);
    if (!originalProduct) return;

    setCart((prevCart) => {
      if (newQty > (originalProduct.estoque_atual || 0)) {
        showAlert(
          `Estoque insuficiente. Máximo: ${originalProduct.estoque_atual}`,
          "Aviso",
          "warning"
        );
        return prevCart.map((item) =>
          item.id === id
            ? { ...item, qty: originalProduct.estoque_atual || 0 }
            : item
        );
      } else {
        return prevCart.map((item) =>
          item.id === id ? { ...item, qty: newQty } : item
        );
      }
    });
  }, [products, showAlert]);

  const removeFromCart = useCallback((id: number) => {
    setCart((prevCart) => prevCart.filter((item) => item.id !== id));
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
  }, []);

  return {
    cart,
    addToCart,
    handleQuantityChange,
    removeFromCart,
    clearCart,
  };
};
