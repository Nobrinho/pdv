import React, { useState } from "react";
import { Product } from "../../types";

interface StockModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  onConfirm: (id: number, quantity: number) => Promise<void>;
}

const StockModal: React.FC<StockModalProps> = ({
  isOpen,
  onClose,
  product,
  onConfirm,
}) => {
  const [quantityToAdd, setQuantityToAdd] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !product) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseInt(quantityToAdd);
    if (isNaN(qty) || qty <= 0) return;

    setIsSubmitting(true);
    try {
      if (product.id) {
        await onConfirm(product.id, qty);
        setQuantityToAdd("");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50 animate-fade-in backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl p-6 w-full max-w-sm transform transition-all scale-100">
        <h2 className="text-lg font-bold mb-1 text-green-700 flex items-center">
          <i className="fas fa-plus-circle mr-2"></i> Entrada de Estoque
        </h2>
        <p className="text-sm text-gray-500 dark:text-slate-400 mb-4 border-b pb-2 truncate">
          Produto: <strong>{product.descricao}</strong>
        </p>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <div className="flex justify-between text-xs text-gray-500 dark:text-slate-400 mb-1">
              <span>Atual</span>
              <span>Novo Total</span>
            </div>
            <div className="flex items-center gap-2 mb-3">
              <span className="bg-gray-100 dark:bg-slate-800 px-3 py-1 rounded font-bold text-gray-600 dark:text-slate-300">
                {product.estoque_atual || 0}
              </span>
              <i className="fas fa-arrow-right text-gray-400 text-xs"></i>
              <span className="bg-green-50 dark:bg-green-900/40 px-3 py-1 rounded font-bold text-green-700">
                {(product.estoque_atual || 0) + (parseInt(quantityToAdd) || 0)}
              </span>
            </div>
            <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase mb-1">
              Quantidade a Adicionar
            </label>
            <input
              type="number"
              min="1"
              className="block w-full border-2 border-green-100 rounded-lg p-3 text-xl font-bold text-center text-green-700 focus:border-green-500 focus:ring-0 outline-none transition"
              value={quantityToAdd}
              onChange={(e) => setQuantityToAdd(e.target.value)}
              disabled={isSubmitting}
              autoFocus
              placeholder="0"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-200 rounded-lg font-medium text-sm"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 font-bold text-sm shadow-md"
            >
              {isSubmitting ? <i className="fas fa-circle-notch fa-spin"></i> : "Confirmar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default StockModal;
