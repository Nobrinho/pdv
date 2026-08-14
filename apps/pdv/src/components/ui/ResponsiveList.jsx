import React from "react";

/**
 * Lista responsiva: TABELA no desktop (md+) e CARDS no mobile.
 * Substitui o uso cru de tabela nas telas para não estourar em telas estreitas.
 *
 * props:
 *  - columns: [{ key, label, render?(row), thClass?, tdClass? }]
 *  - data, keyField='id'
 *  - onRowClick?(row)
 *  - renderCard?(row)  -> card customizado no mobile (opcional)
 *  - emptyText
 */
const ResponsiveList = ({
  columns = [],
  data = [],
  keyField = "id",
  onRowClick,
  renderCard,
  emptyText = "Nada por aqui.",
}) => {
  if (!data.length) {
    return <div className="text-center text-surface-400 py-10 font-bold">{emptyText}</div>;
  }

  return (
    <>
      {/* Desktop: tabela */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-[10px] uppercase tracking-widest text-surface-500 border-b border-surface-200">
            <tr>
              {columns.map((c) => (
                <th key={c.key} className={`text-left p-3 ${c.thClass || ""}`}>{c.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr
                key={row[keyField]}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={`border-b border-surface-100 ${onRowClick ? "cursor-pointer hover:bg-surface-50" : ""}`}
              >
                {columns.map((c) => (
                  <td key={c.key} className={`p-3 text-surface-800 ${c.tdClass || ""}`}>
                    {c.render ? c.render(row) : row[c.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile: cards */}
      <div className="md:hidden space-y-2">
        {data.map((row) =>
          renderCard ? (
            <React.Fragment key={row[keyField]}>{renderCard(row)}</React.Fragment>
          ) : (
            <button
              key={row[keyField]}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className="w-full text-left bg-surface-100 border border-surface-200 rounded-2xl p-4 active:scale-[0.99] transition"
            >
              {columns.map((c) => (
                <div key={c.key} className="flex items-center justify-between gap-3 py-0.5">
                  <span className="text-[11px] font-bold uppercase tracking-wide text-surface-400">{c.label}</span>
                  <span className="text-sm text-surface-800 text-right">
                    {c.render ? c.render(row) : row[c.key]}
                  </span>
                </div>
              ))}
            </button>
          ),
        )}
      </div>
    </>
  );
};

export default ResponsiveList;
