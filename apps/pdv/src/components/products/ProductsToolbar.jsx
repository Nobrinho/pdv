import React from "react";
import Button from "../ui/Button";
import { Input, Select } from "../ui/Input";
import { Icon } from "../ui/Icon";

const ProductsToolbar = ({
  searchTerm = "",
  onSearchTermChange,
  sortBy = "descricao",
  onSortByChange,
  stockFilter = "todos",
  onStockFilterChange,
  onImportClick,
  onNewProductClick,
}) => {
  return (
    <>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h1 className="text-lg md:text-xl font-semibold text-[var(--foreground)] tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
          Produtos
        </h1>
        <div className="flex gap-2">
          <Button variant="outline" size="lg" onClick={onImportClick} className="w-full sm:w-auto gap-2">
            <Icon name="file-down" size={16} /> Importar lote
          </Button>
          <Button variant="primary" size="lg" onClick={onNewProductClick} className="w-full sm:w-auto gap-2">
            <Icon name="plus" size={16} /> Novo produto
          </Button>
        </div>
      </div>

      <div className="bg-[var(--card)] p-3 rounded-[var(--radius-xl)] shadow-[var(--shadow-xs)] border border-[var(--border)] mb-4 flex flex-col md:flex-row gap-3 items-center">
        <div className="relative flex-1 w-full">
          <Icon name="search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] pointer-events-none" />
          <Input
            className="pl-9"
            placeholder="Buscar por nome ou código..."
            value={searchTerm}
            onChange={(e) => onSearchTermChange(e.target.value)}
          />
        </div>
        <Select className="w-full md:w-52" value={stockFilter} onChange={(e) => onStockFilterChange(e.target.value)}>
          <option value="todos">Todos os produtos</option>
          <option value="zerados">Produtos zerados</option>
          <option value="baixo">Baixo estoque</option>
        </Select>
        <Select className="w-full md:w-52" value={sortBy} onChange={(e) => onSortByChange(e.target.value)}>
          <option value="descricao">Nome (A-Z)</option>
          <option value="estoque_asc">Estoque (menor)</option>
          <option value="estoque_desc">Estoque (maior)</option>
          <option value="preco_asc">Preço (menor)</option>
          <option value="preco_desc">Preço (maior)</option>
        </Select>
      </div>
    </>
  );
};

export default ProductsToolbar;
