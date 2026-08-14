import React from "react";
import { SkeletonBar, SkeletonCard } from "./Skeleton";
import EmptyState from "./EmptyState";
import { Icon } from "./Icon";
import usePullToRefresh from "../../hooks/usePullToRefresh";

// Números em mono/tabular (padrão de tabela do handoff).
const MONO = { fontFamily: "var(--font-mono)", fontVariantNumeric: "tabular-nums" };

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
    <div className="flex flex-col items-center justify-center gap-2 py-20 text-[var(--danger)]">
      <Icon name="alert-triangle" size={20} />
      <span className="text-sm font-semibold">{error}</span>
    </div>
  );

  const showEmpty = !loading && !error && data.length === 0;

  return (
    <div className="w-full h-full flex flex-col overflow-hidden md:bg-[var(--card)] md:border md:border-[var(--border)] md:rounded-[var(--radius-xl)] md:shadow-[var(--shadow-xs)]">
      {/* ===== Desktop: tabela ===== */}
      <div className="hidden md:flex md:flex-col md:flex-1 md:overflow-hidden">
        <div className="overflow-x-auto overflow-y-auto flex-1 custom-scrollbar">
          <table className="min-w-full">
            <thead className="bg-[var(--content2)] sticky top-0 z-10">
              <tr>
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className={`px-[18px] py-[11px] text-[10px] font-semibold text-[var(--muted-foreground)] uppercase tracking-[var(--tracking-caps)] ${
                      col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : "text-left"
                    }`}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
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
                    className={`border-t border-[var(--border)] transition-colors group ${onRowClick ? "cursor-pointer" : ""} hover:bg-[var(--hover-surface)]`}
                  >
                    {columns.map((col) => {
                      const value = row[col.key];
                      const content = col.format ? col.format(value, row) : value;
                      const isNum = col.align === "right";
                      return (
                        <td
                          key={col.key}
                          style={isNum ? MONO : undefined}
                          className={`px-[18px] py-3 text-[13px] whitespace-nowrap ${
                            col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : "text-left"
                          } ${col.bold ? "font-semibold text-[var(--foreground)]" : "text-[var(--foreground)]"}`}
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
            className="flex items-center justify-center overflow-hidden text-[var(--muted-foreground)]"
            style={{ height: ptr.pull, transition: ptr.dragging ? "none" : "height 0.25s ease" }}
          >
            <Icon
              name={ptr.refreshing ? "refresh-cw" : "chevron-down"}
              size={16}
              className={ptr.refreshing ? "animate-spin" : "transition-transform"}
              style={{
                transform: !ptr.refreshing && ptr.pull >= ptr.threshold ? "rotate(180deg)" : "none",
                opacity: Math.min(ptr.pull / ptr.threshold, 1),
              }}
            />
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
                className={`w-full text-left bg-[var(--card)] border border-[var(--border)] rounded-[var(--radius-xl)] p-4 ${clickable ? "active:scale-[0.99] transition" : ""}`}
              >
                {primaryCol && (
                  <div className="font-semibold text-[var(--foreground)] text-sm mb-1.5">
                    {primaryCol.format ? primaryCol.format(row[primaryCol.key], row) : row[primaryCol.key]}
                  </div>
                )}
                <div className="space-y-1">
                  {otherCols.map((col) => (
                    <div key={col.key} className="flex items-center justify-between gap-3">
                      <span className="text-[10px] font-semibold uppercase tracking-[var(--tracking-caps)] text-[var(--muted-foreground)] shrink-0">
                        {col.label}
                      </span>
                      <span
                        style={col.align === "right" ? MONO : undefined}
                        className={`text-sm text-right ${col.bold ? "font-semibold text-[var(--foreground)]" : "text-[var(--foreground)]"}`}
                      >
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
