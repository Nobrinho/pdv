import React, { useState, useEffect, useRef } from "react";
import { Product } from "../../types";

interface ProductSearchProps {
  products: Product[];
  onAddToCart: (product: Product) => void;
}

const ProductSearch: React.FC<ProductSearchProps> = ({
  products,
  onAddToCart,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (searchTerm.length < 2) {
      setSearchResults([]);
      return;
    }
    const lowerTerm = searchTerm.toLowerCase();
    const results = products.filter(
      (p) =>
        (p.descricao.toLowerCase().includes(lowerTerm) ||
          p.codigo.toLowerCase().includes(lowerTerm)) &&
        (p.estoque_atual || 0) > 0
    );
    setSearchResults(results);
  }, [searchTerm, products]);

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (!searchTerm) return;
      const exactMatch = products.find(
        (p) => p.codigo.trim() === searchTerm.trim()
      );
      if (exactMatch) {
        onAddToCart(exactMatch);
        setSearchTerm("");
        return;
      }
      if (searchResults.length === 1) {
        onAddToCart(searchResults[0]);
        setSearchTerm("");
      }
    }
  };

  const handleSelect = (product: Product) => {
    onAddToCart(product);
    setSearchTerm("");
    setSearchResults([]);
    searchInputRef.current?.focus();
  };

  return (
    <div className="relative">
      <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase mb-1">
        Produto (Bipar ou Digitar)
      </label>
      <input
        ref={searchInputRef}
        className="w-full border border-gray-300 dark:border-slate-700 rounded-lg p-2.5 pl-10 text-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
        placeholder="Código ou Nome..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        onKeyDown={handleSearchKeyDown}
      />
      <i className="fas fa-barcode absolute left-3 top-9 text-gray-400 text-lg"></i>

      {searchResults.length > 0 && (
        <div className="absolute top-full left-0 w-full bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-lg shadow-xl mt-1 max-h-60 overflow-y-auto z-50">
          {searchResults.map((p) => (
            <div
              key={p.id}
              onClick={() => handleSelect(p)}
              className="p-3 hover:bg-blue-50 cursor-pointer border-b border-gray-100 flex justify-between items-center group"
            >
              <div>
                <div className="font-medium text-gray-800 dark:text-slate-100">{p.descricao}</div>
                <div className="text-xs text-gray-500 dark:text-slate-400">{p.codigo}</div>
              </div>
              <div className="text-right">
                <div className="font-bold text-blue-600">
                  R$ {p.preco_venda.toFixed(2)}
                </div>
                <div className="text-xs text-gray-400">
                  Estoque: {p.estoque_atual}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProductSearch;
