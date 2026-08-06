import React from "react";

/**
 * DataTable responsivo.
 * Desktop (md+): tabela. Mobile (< md): cards (evita overflow horizontal).
 * @param {Object[]} columns - { key, label, align, format, bold }
 * @param {Object[]} data
 * @param {function} onRowClick - opcional
 */
const DataTable = ({
  columns = [],
  data = [],
  emptyMessage = "Nenhum registro encontrado.",
  error = "",
  loading = false,
  onRowClick,
}) => {
  const primaryCol = columns.find((c) => c.bold) || columns[0];
  const otherCols = columns.filter((c) => c !== primaryCol);

  const StateBlock = () => {
    if (loading) {
      return (
        <div className="flex flex-col items-center justify-center gap-2 py-20 text-surface-400">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          <span className="text-xs font-medium">Carregando dados...</span>
        </div>
      );
    }
    if (error) {
      return (
        <div className="flex flex-col items-center justify-center gap-2 py-20 text-red-600">
          <i className="fas fa-triangle-exclamation text-xl"></i>
          <span className="text-sm font-semibold">{error}</span>
        </div>
      );
    }
    return <div className="py-20 text-center text-surface-400 italic text-sm">{emptyMessage}</div>;
  };

  const showState = loading || error || data.length === 0;

  return (
    <div className="w-full h-full flex flex-col overflow-hidden md:bg-surface-100 md:border md:border-surface-200 md:rounded-xl md:shadow-sm">
      {/* ===== Desktop: tabela ===== */}
      <div className="hidden md:flex md:flex-col md:flex-1 md:overflow-hidden">
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
              {showState ? (
                <tr>
                  <td colSpan={columns.length}>
                    <StateBlock />
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

      {/* ===== Mobile: cards ===== */}
      <div className="md:hidden flex-1 overflow-y-auto custom-scrollbar space-y-2">
        {showState ? (
          <StateBlock />
        ) : (
          data.map((row, idx) => {
            const clickable = !!onRowClick;
            const Tag = clickable ? "button" : "div";
            return (
              <Tag
                key={row.id || idx}
                onClick={clickable ? () => onRowClick(row) : undefined}
                className={`w-full text-left bg-surface-100 border border-surface-200 rounded-2xl p-4 ${clickable ? "active:scale-[0.99] transition" : ""}`}
              >
                {primaryCol && (
                  <div className="font-black text-surface-900 text-sm mb-1.5">
                    {primaryCol.format ? primaryCol.format(row[primaryCol.key], row) : row[primaryCol.key]}
                  </div>
                )}
                <div className="space-y-1">
                  {otherCols.map((col) => (
                    <div key={col.key} className="flex items-center justify-between gap-3">
                      <span className="text-[10px] font-bold uppercase tracking-wide text-surface-400 shrink-0">
                        {col.label}
                      </span>
                      <span className={`text-sm text-right ${col.bold ? "font-bold text-surface-900" : "text-surface-700"}`}>
                        {col.format ? col.format(row[col.key], row) : row[col.key]}
                      </span>
                    </div>
                  ))}
                </div>
              </Tag>
            );
          })
        )}
      </div>
    </div>
  );
};

export default DataTable;
