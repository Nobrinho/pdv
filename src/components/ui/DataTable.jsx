import React from "react";

/**
 * DataTable Component
 * @param {Object[]} columns - Array de objetos { key, label, align, format }
 * @param {Object[]} data - Array de dados
 * @param {string} emptyMessage - Mensagem exibida quando não há dados
 * @param {boolean} loading - Se o dado está carregando
 * @param {function} onRowClick - Callback opcional para clique na linha
 */
const DataTable = ({
  columns = [],
  data = [],
  emptyMessage = "Nenhum registro encontrado.",
  loading = false,
  onRowClick,
}) => {
  return (
    <div className="w-full h-full flex flex-col overflow-hidden bg-surface-100 border border-surface-200 rounded-xl shadow-sm">
      <div className="overflow-x-auto overflow-y-auto flex-1 custom-scrollbar">
        <table className="min-w-full divide-y divide-surface-200">
          <thead className="bg-surface-50 sticky top-0 z-10">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-4 py-3 text-xs font-bold text-surface-500 uppercase tracking-wider ${
                    col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : "text-left"
                  }`}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-surface-100 divide-y divide-surface-200">
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-20 text-center">
                  <div className="flex justify-center flex-col items-center gap-2">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                    <span className="text-xs text-surface-400 font-medium">Carregando dados...</span>
                  </div>
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-20 text-center text-surface-400 italic text-sm">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row, idx) => (
                <tr
                  key={row.id || idx}
                  onClick={() => onRowClick && onRowClick(row)}
                  className={`transition-colors group ${onRowClick ? "cursor-pointer hover:bg-primary-500/10" : "hover:bg-surface-50/80"}`}
                >
                  {columns.map((col) => {
                    const value = row[col.key];
                    const content = col.format ? col.format(value, row) : value;

                    return (
                      <td
                        key={col.key}
                        className={`px-4 py-3 text-sm whitespace-nowrap ${
                          col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : "text-left"
                        } ${col.bold ? "font-bold text-surface-900" : "text-surface-600"}`}
                      >
                        {content}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DataTable;
