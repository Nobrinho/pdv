import React from "react";
import DataTable from "../ui/DataTable";

const ProductListPanel = ({
  columns,
  data,
  loading = false,
  error = "",
  emptyMessage = "Nenhum produto em estoque.",
  page = 1,
  totalPages = 1,
  totalItems = 0,
  onPreviousPage,
  onNextPage,
  onRefresh,
}) => {
  return (
    <div className="flex-1 overflow-hidden flex flex-col">
      <DataTable
        columns={columns}
        data={data}
        loading={loading}
        error={error}
        emptyMessage={emptyMessage}
        emptyIcon="fa-box-open"
        onRefresh={onRefresh}
      />

      {totalPages > 1 && (
        <div className="p-4 border-t border-surface-50 bg-surface-50/30 flex justify-between items-center shrink-0">
          <span className="text-[10px] font-black text-surface-400 uppercase tracking-widest">
            Pag {page} de {totalPages} • {totalItems} total
          </span>
          <div className="flex gap-2">
            <button
              onClick={onPreviousPage}
              disabled={page <= 1}
              className="bg-surface-100 border border-surface-200 text-surface-600 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-surface-200 disabled:opacity-30"
            >
              Anterior
            </button>
            <button
              onClick={onNextPage}
              disabled={page >= totalPages}
              className="bg-surface-100 border border-surface-200 text-surface-600 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-surface-200 disabled:opacity-30"
            >
              Proximo
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductListPanel;
