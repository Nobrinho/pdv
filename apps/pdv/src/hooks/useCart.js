// =============================================================
// useCart.js — Hook de gerenciamento do carrinho de vendas
// =============================================================
import { useState, useCallback, useMemo } from "react";
import { useAlert } from "../context/AlertSystem";

const useCart = (products) => {
  const { showAlert } = useAlert();
  const [cart, setCart] = useState([]);

  const addToCart = useCallback(
    (product) => {
      if (product.estoque_atual <= 0) {
        return showAlert(
          `Produto sem estoque: ${product.descricao}`,
          "Erro",
          "error",
        );
      }

      setCart((prev) => {
        const existing = prev.find((item) => item.id === product.id);
        if (existing) {
          if (existing.qty < product.estoque_atual) {
            return prev.map((item) =>
              item.id === product.id ? { ...item, qty: item.qty + 1 } : item,
            );
          } else {
            showAlert("Estoque máximo atingido.", "Aviso", "warning");
            return prev;
          }
        }
        return [...prev, { ...product, qty: 1 }];
      });
    },
    [showAlert],
  );

  const removeFromCart = useCallback(
    (id) => setCart((prev) => prev.filter((item) => item.id !== id)),
    [],
  );

  const handleQuantityChange = useCallback(
    (id, newQtyStr) => {
      const newQty = parseInt(newQtyStr);
      if (isNaN(newQty) || newQty < 1) return;
      const originalProduct = products.find((p) => p.id === id);
      if (!originalProduct) return;

      if (newQty > originalProduct.estoque_atual) {
        showAlert(
          `Estoque insuficiente. Máximo: ${originalProduct.estoque_atual}`,
          "Aviso",
          "warning",
        );
        setCart((prev) =>
          prev.map((item) =>
            item.id === id
              ? { ...item, qty: originalProduct.estoque_atual }
              : item,
          ),
        );
      } else {
        setCart((prev) =>
          prev.map((item) =>
            item.id === id ? { ...item, qty: newQty } : item,
          ),
        );
      }
    },
    [products, showAlert],
  );

  const clearCart = useCallback(() => setCart([]), []);

  const subtotal = useMemo(
    () => cart.reduce((acc, item) => acc + item.preco_venda * item.qty, 0),
    [cart],
  );

  return {
    cart,
    addToCart,
    removeFromCart,
    handleQuantityChange,
    clearCart,
    subtotal,
  };
};

export default useCart;
