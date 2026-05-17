import React from "react";
import FormField from "../ui/FormField";

const ProductsToolbar = ({
  searchTerm = "",
  onSearchTermChange,
  sortBy = "descricao",
  onSortByChange,
  onImportClick,
  onNewProductClick,
}) => {
  return (
    <>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-surface-800">Gerenciar Estoque</h1>
          <p className="text-xs text-surface-500 mt-1">Controle de peças, preços e níveis de estoque.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onImportClick}
            className="w-full sm:w-auto bg-green-600 text-white px-5 py-2.5 rounded-xl hover:bg-green-700 transition-all active:scale-95 flex items-center justify-center shadow-md font-bold text-sm gap-2"
          >
            <i className="fas fa-file-import"></i> Importar Lote
          </button>
          <button
            onClick={onNewProductClick}
            className="w-full sm:w-auto bg-primary-600 text-white px-5 py-2.5 rounded-xl hover:bg-primary-700 transition-all active:scale-95 flex items-center justify-center shadow-md font-bold text-sm gap-2"
          >
            <i className="fas fa-box-open"></i> Novo Produto
          </button>
        </div>
      </div>

      <div className="bg-surface-100 p-3 rounded-xl shadow-sm border border-surface-200 mb-4 flex flex-col md:flex-row gap-4 items-center">
        <FormField
          icon="fa-search"
          placeholder="Buscar por nome ou código..."
          value={searchTerm}
          onChange={onSearchTermChange}
          className="flex-1"
        />
        <div className="w-full md:w-56">
          <select
            className="w-full border border-surface-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-500 text-sm bg-surface-100 transition-all"
            value={sortBy}
            onChange={(e) => onSortByChange(e.target.value)}
          >
            <option value="descricao">Nome (A-Z)</option>
            <option value="estoque_asc">Estoque (Menor)</option>
            <option value="estoque_desc">Estoque (Maior)</option>
            <option value="preco_asc">Preço (Menor)</option>
            <option value="preco_desc">Preço (Maior)</option>
          </select>
        </div>
      </div>
    </>
  );
};

export default ProductsToolbar;
