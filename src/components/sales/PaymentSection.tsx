import React, { useState } from "react";
import { SalePayment } from "../../types";

interface PaymentSectionProps {
  payments: SalePayment[];
  onAddPayment: (payment: SalePayment) => void;
  onRemovePayment: (index: number) => void;
  remaining: number;
  total: number;
}

const PaymentSection: React.FC<PaymentSectionProps> = ({
  payments,
  onAddPayment,
  onRemovePayment,
  remaining,
  total,
}) => {
  const [currentMethod, setCurrentMethod] = useState("Dinheiro");
  const [currentValue, setCurrentValue] = useState("");
  const [installments, setInstallments] = useState(1);

  const formatCurrency = (val: number) =>
    `R$ ${val.toFixed(2).replace(".", ",")}`;

  const handleAdd = () => {
    const valor = parseFloat(currentValue);
    if (!valor || valor <= 0) return;

    let detalhes = "";
    if (currentMethod.includes("Crédito")) detalhes = `${installments}x`;

    onAddPayment({ metodo: currentMethod, valor, detalhes });
    setCurrentValue("");
  };

  const autoFillRemaining = () => {
    if (remaining > 0) {
      setCurrentValue(remaining.toFixed(2));
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 p-5 rounded-xl shadow-md border-l-4 border-blue-600 flex-1 flex flex-col">
      <h2 className="text-sm font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wide mb-4">
        Pagamento
      </h2>
      <div className="flex-1 bg-gray-50 dark:bg-slate-950/50 rounded-lg p-2 mb-4 overflow-y-auto max-h-40 border border-gray-200 dark:border-slate-800">
        {payments.map((p, idx) => (
          <div
            key={idx}
            className="flex justify-between items-center p-2 bg-white dark:bg-slate-900 rounded shadow-sm mb-1 text-sm"
          >
            <div>
              <span className="font-bold text-gray-700 dark:text-slate-300">{p.metodo}</span>
              {p.detalhes && (
                <span className="text-xs text-gray-400 ml-1">
                  ({p.detalhes})
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-800 dark:text-slate-100">
                {formatCurrency(p.valor)}
              </span>
              <button
                onClick={() => onRemovePayment(idx)}
                className="text-red-400 hover:text-red-600"
              >
                <i className="fas fa-times-circle"></i>
              </button>
            </div>
          </div>
        ))}
        {payments.length === 0 && (
          <p className="text-center text-xs text-gray-400 py-4">
            Nenhum pagamento adicionado
          </p>
        )}
      </div>

      <div
        className={`space-y-3 ${
          remaining <= 0 ? "opacity-50 pointer-events-none" : ""
        }`}
      >
        <div className="grid grid-cols-2 gap-2">
          <select
            className="border border-gray-300 dark:border-slate-700 rounded p-2 text-sm bg-white dark:bg-slate-900"
            value={currentMethod}
            onChange={(e) => setCurrentMethod(e.target.value)}
          >
            <option>Dinheiro</option>
            <option>Pix</option>
            <option>Crédito</option>
            <option>Débito</option>
            <option>Fiado</option>
          </select>
          {currentMethod === "Crédito" && (
            <select
              className="border border-gray-300 dark:border-slate-700 rounded p-2 text-sm bg-white dark:bg-slate-900"
              value={installments}
              onChange={(e) => setInstallments(Number(e.target.value))}
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((i) => (
                <option key={i} value={i}>
                  {i}x
                </option>
              ))}
            </select>
          )}
        </div>
        <div className="flex gap-2">
          <input
            type="number"
            className="flex-1 border border-gray-300 dark:border-slate-700 rounded p-2 text-right font-bold text-gray-800 dark:text-slate-100"
            placeholder="0.00"
            value={currentValue}
            onChange={(e) => setCurrentValue(e.target.value)}
            onFocus={autoFillRemaining}
          />
          <button
            onClick={handleAdd}
            className="bg-blue-600 text-white px-4 py-2 rounded font-bold hover:bg-blue-700"
          >
            +
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentSection;
