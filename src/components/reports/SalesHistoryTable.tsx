import React from "react";
import dayjs from "dayjs";
import { Sale } from "../../types";

interface SalesHistoryTableProps {
  sales: Sale[];
  onView: (sale: Sale) => void;
  onCancel: (sale: Sale) => void;
  formatCurrency: (val: number) => string;
  getClientName: (id?: number | null) => string;
}

const SalesHistoryTable: React.FC<SalesHistoryTableProps> = ({
  sales,
  onView,
  onCancel,
  formatCurrency,
  getClientName,
}) => {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-md overflow-hidden flex-1 flex flex-col border border-gray-100 dark:border-slate-800">
      <div className="overflow-y-auto flex-1 custom-scrollbar">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-800">
          <thead className="bg-gray-50 dark:bg-slate-950 sticky top-0 z-10 shadow-sm">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 dark:text-slate-400 uppercase">ID</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 dark:text-slate-400 uppercase">Data</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 dark:text-slate-400 uppercase">Cliente</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 dark:text-slate-400 uppercase">Vendedor</th>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 dark:text-slate-400 uppercase">Pagamento</th>
              <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 dark:text-slate-400 uppercase">Total</th>
              <th className="px-6 py-3 text-center text-xs font-bold text-gray-500 dark:text-slate-400 uppercase">Status</th>
              <th className="px-6 py-3 text-center text-xs font-bold text-gray-500 dark:text-slate-400 uppercase">Ação</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-slate-900 divide-y divide-gray-200 dark:divide-slate-800">
            {sales.map((sale) => (
              <tr
                key={sale.id}
                className={`hover:bg-blue-50 dark:hover:bg-slate-800/80 transition-colors ${sale.cancelada ? "bg-red-50 dark:bg-red-950/20" : ""}`}
              >
                <td className={`px-6 py-4 whitespace-nowrap text-sm font-mono ${sale.cancelada ? "text-red-400 line-through" : "text-gray-500 dark:text-slate-400"}`}>
                  #{sale.id}
                </td>
                <td className={`px-6 py-4 whitespace-nowrap text-sm ${sale.cancelada ? "text-red-400" : "text-gray-900 dark:text-slate-100"}`}>
                  {dayjs(sale.data_venda).format("DD/MM/YYYY HH:mm")}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-slate-300 font-medium whitespace-normal min-w-[150px]">
                  {getClientName(sale.cliente_id)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-slate-300">
                  {sale.vendedor_nome}
                </td>
                <td className="px-6 py-4 text-sm text-gray-700 dark:text-slate-300">
                  <div className="flex flex-col gap-1">
                    {sale.lista_pagamentos?.map((p, i) => (
                      <span key={i} className="text-[10px] bg-gray-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-gray-200 dark:border-slate-800 w-fit whitespace-nowrap">
                        {p.metodo}: {formatCurrency(p.valor)}
                      </span>
                    )) || <span className="text-xs">{sale.forma_pagamento}</span>}
                  </div>
                </td>
                <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-bold ${sale.cancelada ? "text-red-400 line-through" : "text-gray-900 dark:text-slate-100"}`}>
                  {formatCurrency(sale.total_final)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  <span className={`px-2 py-1 text-[10px] font-bold rounded-full ${sale.cancelada ? "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-400" : "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-400"}`}>
                    {sale.cancelada ? "CANCELADA" : "OK"}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  <div className="flex justify-center gap-2">
                    <button
                      onClick={() => onView(sale)}
                      className="text-blue-600 hover:text-blue-900 bg-blue-50 dark:bg-slate-800 p-2 rounded-lg transition"
                      title="Ver Recibo"
                    >
                      <i className="fas fa-eye text-sm"></i>
                    </button>
                    {!sale.cancelada && (
                      <button
                        onClick={() => onCancel(sale)}
                        className="text-red-600 hover:text-red-900 bg-red-50 dark:bg-slate-800 p-2 rounded-lg transition"
                        title="Cancelar Venda"
                      >
                        <i className="fas fa-ban text-sm"></i>
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {sales.length === 0 && (
              <tr>
                <td colSpan={8} className="text-center py-20 text-gray-400 dark:text-slate-500">
                  <i className="fas fa-history text-3xl mb-2 opacity-20"></i>
                  <p>Nenhuma venda encontrada no período.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SalesHistoryTable;
