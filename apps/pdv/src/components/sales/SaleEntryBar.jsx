import React, { useState } from "react";
import BarcodeScannerModal from "./BarcodeScannerModal";

const SaleEntryBar = ({
  selectedSeller = "",
  onSellerChange,
  sellers = [],
  selectedClient,
  clientSearchTerm = "",
  onClientSearchTermChange,
  onClearSelectedClient,
  showClientResults = false,
  onShowClientResultsChange,
  clients = [],
  filteredClients = [],
  onSelectClient,
  onOpenClientModal,
  searchInputRef,
  searchTerm = "",
  onSearchTermChange,
  onSearchKeyDown,
  searchResults = [],
  onSelectProduct,
  onScanCode,
}) => {
  const [scanOpen, setScanOpen] = useState(false);
  return (
    <div className="bg-surface-100 p-4 rounded-xl shadow-sm border border-surface-200">
      <div className="flex gap-4 mb-3">
        <div className="w-1/2">
          <label className="block text-xs font-bold text-surface-500 uppercase mb-1">
            Vendedor
          </label>
          <select
            className="w-full border border-surface-300 rounded-lg p-2.5 bg-surface-50 outline-none focus:ring-2 focus:ring-primary-500"
            value={selectedSeller}
            onChange={(e) => onSellerChange(e.target.value)}
          >
            <option value="">Selecione...</option>
            {sellers.map((seller) => (
              <option key={seller.id} value={seller.id}>
                {seller.nome}
              </option>
            ))}
          </select>
        </div>

        <div className="w-1/2 flex gap-2 items-end">
          <div className="flex-1 relative">
            <label className="block text-xs font-bold text-surface-500 uppercase mb-1">
              Cliente
            </label>
            <div className="relative">
              <input
                className={`w-full border rounded-lg p-2.5 pl-8 outline-none focus:ring-2 focus:ring-primary-500 transition-all ${selectedClient ? "border-green-500 bg-green-500/10 text-green-600 font-bold shadow-sm" : "border-surface-300 bg-surface-100 text-surface-800 focus:bg-surface-50"}`}
                placeholder={selectedClient ? "" : "Buscar Cliente..."}
                value={clientSearchTerm}
                onChange={(e) => {
                  onClientSearchTermChange(e.target.value);
                  if (selectedClient) onClearSelectedClient();
                  onShowClientResultsChange(true);
                }}
                onFocus={() => onShowClientResultsChange(true)}
                onBlur={() => setTimeout(() => onShowClientResultsChange(false), 200)}
              />
              <i
                className={`fas ${selectedClient ? "fa-user-check text-green-600" : "fa-search text-surface-400"} absolute left-3 top-3`}
              ></i>
              {selectedClient && (
                <button
                  onClick={onClearSelectedClient}
                  className="absolute right-3 top-3 text-surface-400 hover:text-red-500"
                >
                  <i className="fas fa-times"></i>
                </button>
              )}
            </div>
            {showClientResults && (clientSearchTerm.length > 0 || clients.length > 0) && (
              <div className="absolute top-full left-0 w-full bg-surface-100 border border-surface-200 rounded-lg shadow-xl mt-1 max-h-48 overflow-y-auto z-[60]">
                <div
                  className="p-2 hover:bg-surface-200 cursor-pointer text-sm text-surface-600 italic border-b"
                  onClick={onClearSelectedClient}
                >
                  <i className="fas fa-user-tag mr-2"></i> Consumidor Final
                </div>
                {filteredClients.map((client) => (
                  <div
                    key={client.id}
                    onClick={() => onSelectClient(client)}
                    className="p-2 hover:bg-primary-50 cursor-pointer border-b border-surface-200 text-sm"
                  >
                    <div className="font-bold text-surface-800">{client.nome}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={onOpenClientModal}
            className="bg-green-600 text-white p-2.5 rounded-lg hover:bg-green-700 transition shadow-sm h-[42px] w-[42px] flex items-center justify-center"
          >
            <i className="fas fa-plus"></i>
          </button>
        </div>
      </div>

      <div className="relative">
        <label className="block text-xs font-bold text-surface-500 uppercase mb-1">
          Produto (Bipar ou Digitar)
        </label>
        <input
          ref={searchInputRef}
          className="w-full border border-surface-300 rounded-lg p-2.5 pl-10 pr-14 text-lg outline-none focus:ring-2 focus:ring-primary-500 bg-surface-100 text-surface-800 border-surface-300 focus:ring-primary-500/20"
          placeholder="Código ou Nome..."
          value={searchTerm}
          onChange={(e) => onSearchTermChange(e.target.value)}
          onKeyDown={onSearchKeyDown}
        />
        <i className="fas fa-barcode absolute left-3 top-9 text-surface-400 text-lg"></i>
        {onScanCode && (
          <button
            type="button"
            onClick={() => setScanOpen(true)}
            className="absolute right-2 top-[26px] flex h-10 w-10 items-center justify-center rounded-lg bg-primary-600 text-white shadow-sm active:scale-95 hover:bg-primary-700 transition"
            title="Escanear com a câmera"
            aria-label="Escanear código de barras"
          >
            <i className="fas fa-camera"></i>
          </button>
        )}

        {searchResults.length > 0 && (
          <div className="absolute top-full left-0 w-full bg-surface-100 border border-surface-200 rounded-lg shadow-xl mt-1 max-h-60 overflow-y-auto z-50">
            {searchResults.map((product) => (
              <div
                key={product.id}
                onClick={() => onSelectProduct(product)}
                className="p-3 hover:bg-primary-500/10 cursor-pointer border-b border-surface-200 flex justify-between items-center group transition-colors"
              >
                <div>
                  <div className="font-medium text-surface-800">{product.descricao}</div>
                  <div className="text-xs text-surface-500">{product.codigo}</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-primary-600">R$ {product.preco_venda.toFixed(2)}</div>
                  <div className="text-xs text-surface-400">Estoque: {product.estoque_atual}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SaleEntryBar;
