import React from "react";
import { Product } from "../../types";

interface CartTableProps {
  cart: (Product & { qty: number })[];
  onQuantityChange: (id: number, newQty: string) => void;
  onRemove: (id: number) => void;
  subtotal: number;
}

const CartTable: React.FC<CartTableProps> = ({
  cart,
  onQuantityChange,
  onRemove,
  subtotal,
}) => {
  const formatCurrency = (val: number) =>
    `R$ ${val.toFixed(2).replace(".", ",")}`;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm flex-1 overflow-hidden flex flex-col z-10 border border-gray-100 dark:border-slate-800">
      <div className="overflow-y-auto flex-1 p-2">
        <table className="min-w-full divide-y divide-gray-100 dark:divide-slate-800">
          <thead className="bg-gray-50 dark:bg-slate-800/50 sticky top-0">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-bold text-gray-500 dark:text-slate-400 uppercase">
                Item
              </th>
              <th className="px-4 py-2 text-center text-xs font-bold text-gray-500 dark:text-slate-400 uppercase w-24">
                Qtd
              </th>
              <th className="px-4 py-2 text-right text-xs font-bold text-gray-500 dark:text-slate-400 uppercase">
                Unit.
              </th>
              <th className="px-4 py-2 text-right text-xs font-bold text-gray-500 dark:text-slate-400 uppercase">
                Total
              </th>
              <th className="px-4 py-2 w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
            {cart.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50 dark:bg-slate-800/50 transition">
                <td className="px-4 py-3 text-sm text-gray-800 dark:text-slate-100 font-medium">
                  {item.descricao}
                </td>
                <td className="px-4 py-3 text-center">
                  <input
                    type="number"
                    min="1"
                    className="w-16 text-center border rounded p-1 text-sm font-bold bg-gray-50 dark:bg-slate-800/50 focus:bg-white dark:bg-slate-900 outline-none"
                    value={item.qty}
                    onChange={(e) =>
                      item.id && onQuantityChange(item.id, e.target.value)
                    }
                  />
                </td>
                <td className="px-4 py-3 text-right text-sm text-gray-500 dark:text-slate-400">
                  {formatCurrency(item.preco_venda)}
                </td>
                <td className="px-4 py-3 text-right text-sm font-medium text-gray-900 dark:text-slate-100">
                  {formatCurrency(item.preco_venda * item.qty)}
                </td>
                <td className="px-4 py-3 text-center">
                  <button
                    onClick={() => item.id && onRemove(item.id)}
                    className="text-red-400 hover:text-red-600 p-1"
                  >
                    <i className="fas fa-trash-alt"></i>
                  </button>
                </td>
              </tr>
            ))}
            {cart.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center py-20 text-gray-400">
                  Carrinho Vazio
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="p-4 bg-gray-50 dark:bg-slate-800/50 border-t border-gray-200 dark:border-slate-700 flex justify-between items-center">
        <span className="text-gray-500 dark:text-slate-400 font-medium">Subtotal Itens:</span>
        <span className="text-xl font-bold text-gray-800 dark:text-slate-100">
          {formatCurrency(subtotal)}
        </span>
      </div>
    </div>
  );
};

export default CartTable;
