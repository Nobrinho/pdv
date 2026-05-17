import React from "react";
import { formatCurrency } from "../../utils/format";

const SaleCartPanel = ({
  cart = [],
  totals,
  onQuantityChange,
  onRemoveItem,
}) => {
  return (
    <div className="bg-surface-100 rounded-xl shadow-sm flex-1 overflow-hidden flex flex-col z-10 border border-surface-200">
      <div className="overflow-y-auto flex-1 p-2">
        <table className="min-w-full divide-y divide-gray-100">
          <thead className="bg-surface-50 sticky top-0">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-bold text-surface-500 uppercase">
                Item
              </th>
              <th className="px-4 py-2 text-center text-xs font-bold text-surface-500 uppercase w-24">
                Qtd
              </th>
              <th className="px-4 py-2 text-right text-xs font-bold text-surface-500 uppercase">
                Unit.
              </th>
              <th className="px-4 py-2 text-right text-xs font-bold text-surface-500 uppercase">
                Total
              </th>
              <th className="px-4 py-2 w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {cart.map((item) => (
              <tr key={item.id} className="hover:bg-surface-50 transition">
                <td className="px-4 py-3 text-sm text-surface-800 font-medium">
                  {item.descricao}
                </td>
                <td className="px-4 py-3 text-center">
                  <input
                    type="number"
                    min="1"
                    className="w-16 text-center border rounded p-1 text-sm font-bold bg-surface-50 focus:bg-surface-100 outline-none"
                    value={item.qty}
                    onChange={(e) => onQuantityChange(item.id, e.target.value)}
                  />
                </td>
                <td className="px-4 py-3 text-right text-sm text-surface-500">
                  {formatCurrency(item.preco_venda)}
                </td>
                <td className="px-4 py-3 text-right text-sm font-medium text-surface-900">
                  {formatCurrency(item.preco_venda * item.qty)}
                </td>
                <td className="px-4 py-3 text-center">
                  <button
                    onClick={() => onRemoveItem(item.id)}
                    className="text-red-400 hover:text-red-600 p-1"
                  >
                    <i className="fas fa-trash-alt"></i>
                  </button>
                </td>
              </tr>
            ))}
            {cart.length === 0 && (
              <tr>
                <td colSpan="5" className="text-center py-20 text-surface-400">
                  Carrinho Vazio
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="p-4 bg-surface-50 border-t border-surface-200 flex justify-between items-center">
        <span className="text-surface-500 font-medium">Subtotal Itens:</span>
        <span className="text-xl font-bold text-surface-800">
          {formatCurrency(totals.subtotal)}
        </span>
      </div>
    </div>
  );
};

export default SaleCartPanel;
