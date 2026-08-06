import React from "react";
import { SkeletonBar, SkeletonCard } from "./Skeleton";
import EmptyState from "./EmptyState";
import usePullToRefresh from "../../hooks/usePullToRefresh";

/**
 * DataTable responsivo.
 * Desktop (md+): tabela. Mobile (< md): cards (evita overflow horizontal).
 * Carregamento: skeletons. Vazio: estado ilustrado (EmptyState).
 * @param {Object[]} columns - { key, label, align, format, bold }
 * @param {Object[]} data
 * @param {function} onRowClick - opcional
 * @param {string} emptyMessage - texto do estado vazio
 * @param {string} emptyIcon - ícone (FontAwesome) do estado vazio
 */
const DataTable = ({
  columns = [],
  data = [],
  emptyMessage = "Nenhum registro encontrado.",
  emptyIcon = "fa-inbox",
  error = "",
  loading = false,
  onRowClick,
  onRefresh,
  skeletonRows = 6,
}) => {
  const primaryCol = columns.find((c) => c.bold) || columns[0];
  const otherCols = columns.filter((c) => c !== primaryCol);
  const ptr = usePullToRefresh(onRefresh);

  const ErrorBlock = () => (
    <div className="flex flex-col items-center justify-center gap-2 py-20 text-red-600">
      <i className="fas fa-triangle-exclamation text-xl"></i>
      <span className="text-sm font-semibold">{error}</span>
    </div>
  );

  const showEmpty = !loading && !error && data.length === 0;

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
              {loading ? (
                Array.from({ length: skeletonRows }).map((_, rowIdx) => (
                  <tr key={`sk-${rowIdx}`}>
                    {columns.map((col, colIdx) => (
                      <td key={col.key} className="px-4 py-3.5">
                        <SkeletonBar
                          className={`h-4 ${colIdx === 0 ? "w-3/4" : "w-1/2"} ${
                            col.align === "right" ? "ml-auto" : col.align === "center" ? "mx-auto" : ""
                          }`}
                        />
                      </td>
                    ))}
                  </tr>
                ))
              ) : error ? (
                <tr>
                  <td colSpan={columns.length}>
                    <ErrorBlock />
                  </td>
                </tr>
              ) : showEmpty ? (
                <tr>
                  <td colSpan={columns.length}>
                    <EmptyState icon={emptyIcon} title={emptyMessage} />
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
      <div
        ref={ptr.scrollRef}
        {...ptr.handlers}
        className="md:hidden flex-1 overflow-y-auto custom-scrollbar"
        style={{ overscrollBehaviorY: "contain" }}
      >
        {onRefresh && (
          <div
            className="flex items-center justify-center overflow-hidden text-surface-400"
            style={{ height: ptr.pull, transition: ptr.dragging ? "none" : "height 0.25s ease" }}
          >
            <i
              className={`fas ${ptr.refreshing ? "fa-spinner fa-spin" : "fa-arrow-down"} transition-transform`}
              style={{
                transform: !ptr.refreshing && ptr.pull >= ptr.threshold ? "rotate(180deg)" : "none",
                opacity: Math.min(ptr.pull / ptr.threshold, 1),
              }}
            ></i>
          </div>
        )}
        <div className="space-y-2">
        {loading ? (
          Array.from({ length: Math.min(skeletonRows, 5) }).map((_, idx) => <SkeletonCard key={`skc-${idx}`} />)
        ) : error ? (
          <ErrorBlock />
        ) : showEmpty ? (
          <EmptyState icon={emptyIcon} title={emptyMessage} />
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
    </div>
  );
};

export default DataTable;
