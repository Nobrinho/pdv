import React from "react";
import { formatCurrency } from "../../utils/format";

const SaleCartPanel = ({ cart = [], totals, onQuantityChange, onRemoveItem }) => {
  const step = (item, delta) =>
    onQuantityChange(item.id, String(Math.max(1, Number(item.qty || 1) + delta)));

  return (
    <div className="bg-surface-100 rounded-xl shadow-sm flex-1 overflow-hidden flex flex-col z-10 border border-surface-200">
      <div className="overflow-y-auto flex-1">
        {/* ===== Desktop: tabela ===== */}
        <table className="hidden md:table min-w-full divide-y divide-gray-100">
          <thead className="bg-surface-50 sticky top-0">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-bold text-surface-500 uppercase">Item</th>
              <th className="px-4 py-2 text-center text-xs font-bold text-surface-500 uppercase w-24">Qtd</th>
              <th className="px-4 py-2 text-right text-xs font-bold text-surface-500 uppercase">Unit.</th>
              <th className="px-4 py-2 text-right text-xs font-bold text-surface-500 uppercase">Total</th>
              <th className="px-4 py-2 w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {cart.map((item) => (
              <tr key={item.id} className="hover:bg-surface-50 transition">
                <td className="px-4 py-3 text-sm text-surface-800 font-medium">{item.descricao}</td>
                <td className="px-4 py-3 text-center">
                  <input
                    type="number"
                    min="1"
                    inputMode="numeric"
                    className="w-16 text-center border rounded p-1 text-sm font-bold bg-surface-50 focus:bg-surface-100 outline-none"
                    value={item.qty}
                    onChange={(e) => onQuantityChange(item.id, e.target.value)}
                  />
                </td>
                <td className="px-4 py-3 text-right text-sm text-surface-500">{formatCurrency(item.preco_venda)}</td>
                <td className="px-4 py-3 text-right text-sm font-medium text-surface-900">
                  {formatCurrency(item.preco_venda * item.qty)}
                </td>
                <td className="px-4 py-3 text-center">
                  <button onClick={() => onRemoveItem(item.id)} className="text-red-400 hover:text-red-600 p-1">
                    <i className="fas fa-trash-alt"></i>
                  </button>
                </td>
              </tr>
            ))}
            {cart.length === 0 && (
              <tr>
                <td colSpan="5" className="text-center py-20 text-surface-400">Carrinho Vazio</td>
              </tr>
            )}
          </tbody>
        </table>

        {/* ===== Mobile: cards ===== */}
        <div className="md:hidden p-2 space-y-2">
          {cart.map((item) => (
            <div key={item.id} className="bg-surface-50 border border-surface-200 rounded-xl p-3">
              <div className="flex items-start justify-between gap-2">
                <span className="text-sm font-bold text-surface-800 flex-1">{item.descricao}</span>
                <button onClick={() => onRemoveItem(item.id)} className="text-red-400 hover:text-red-600 p-1 -mt-1">
                  <i className="fas fa-trash-alt"></i>
                </button>
              </div>
              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => step(item, -1)}
                    className="w-9 h-9 rounded-lg bg-surface-200 text-surface-700 font-black text-lg active:scale-95 flex items-center justify-center"
                    aria-label="Diminuir"
                  >
                    −
                  </button>
                  <input
                    type="number"
                    min="1"
                    inputMode="numeric"
                    className="w-12 h-9 text-center border rounded-lg text-sm font-bold bg-surface-100 outline-none"
                    value={item.qty}
                    onChange={(e) => onQuantityChange(item.id, e.target.value)}
                  />
                  <button
                    onClick={() => step(item, 1)}
                    className="w-9 h-9 rounded-lg bg-surface-200 text-surface-700 font-black text-lg active:scale-95 flex items-center justify-center"
                    aria-label="Aumentar"
                  >
                    +
                  </button>
                </div>
                <div className="text-right">
                  <div className="text-[11px] text-surface-400">{formatCurrency(item.preco_venda)} un.</div>
                  <div className="text-sm font-black text-surface-900">{formatCurrency(item.preco_venda * item.qty)}</div>
                </div>
              </div>
            </div>
          ))}
          {cart.length === 0 && <div className="text-center py-16 text-surface-400">Carrinho Vazio</div>}
        </div>
      </div>

      <div className="p-4 bg-surface-50 border-t border-surface-200 flex justify-between items-center">
        <span className="text-surface-500 font-medium">Subtotal Itens:</span>
        <span className="text-xl font-bold text-surface-800">{formatCurrency(totals.subtotal)}</span>
      </div>
    </div>
  );
};

export default SaleCartPanel;
