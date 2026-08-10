import React, { useState } from "react";
import BarcodeScannerModal from "./BarcodeScannerModal";
import { Icon } from "../ui/Icon";
import { Select } from "../ui/Input";

const MONO = { fontFamily: "var(--font-mono)", fontVariantNumeric: "tabular-nums" };
const CAPS = "text-[10px] font-semibold uppercase tracking-[var(--tracking-caps)] text-[var(--muted-foreground)]";

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
  searching = false,
  onSelectProduct,
  onScanCode,
}) => {
  const [scanOpen, setScanOpen] = useState(false);
  return (
    <div className="bg-[var(--card)] p-4 rounded-[var(--radius-xl)] shadow-[var(--shadow-xs)] border border-[var(--border)]">
      <div className="flex gap-4 mb-3">
        <div className="w-1/2">
          <label className={`block mb-1 ${CAPS}`}>Vendedor</label>
          <Select value={selectedSeller} onChange={(e) => onSellerChange(e.target.value)}>
            <option value="">Selecione...</option>
            {sellers.map((seller) => (
              <option key={seller.id} value={seller.id}>
                {seller.nome}
              </option>
            ))}
          </Select>
        </div>

        <div className="w-1/2 flex gap-2 items-end">
          <div className="flex-1 relative">
            <label className={`block mb-1 ${CAPS}`}>Cliente</label>
            <div className="relative">
              <input
                className={`w-full rounded-[var(--radius-md)] border h-9 pl-8 pr-8 text-sm outline-none transition-colors ${
                  selectedClient
                    ? "border-[var(--success)] bg-[var(--success-soft)] text-[var(--success-soft-foreground)] font-semibold"
                    : "border-[var(--input)] bg-[var(--card)] text-[var(--foreground)] focus:border-[var(--ring)]"
                }`}
                placeholder={selectedClient ? "" : "Buscar cliente..."}
                value={clientSearchTerm}
                onChange={(e) => {
                  onClientSearchTermChange(e.target.value);
                  if (selectedClient) onClearSelectedClient();
                  onShowClientResultsChange(true);
                }}
                onFocus={() => onShowClientResultsChange(true)}
                onBlur={() => setTimeout(() => onShowClientResultsChange(false), 200)}
              />
              <Icon
                name={selectedClient ? "circle-check" : "search"}
                size={15}
                className={`absolute left-2.5 top-1/2 -translate-y-1/2 ${selectedClient ? "text-[var(--success)]" : "text-[var(--muted-foreground)]"}`}
              />
              {selectedClient && (
                <button
                  onClick={onClearSelectedClient}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] hover:text-[var(--danger)]"
                >
                  <Icon name="x" size={15} />
                </button>
              )}
            </div>
            {showClientResults && (clientSearchTerm.length > 0 || clients.length > 0) && (
              <div className="absolute top-full left-0 w-full bg-[var(--popover)] border border-[var(--border)] rounded-[var(--radius-md)] shadow-lg mt-1 max-h-48 overflow-y-auto z-[60]">
                <div
                  className="p-2 hover:bg-[var(--hover-surface)] cursor-pointer text-sm text-[var(--muted-foreground)] border-b border-[var(--border)]"
                  onClick={onClearSelectedClient}
                >
                  Consumidor final
                </div>
                {filteredClients.map((client) => (
                  <div
                    key={client.id}
                    onClick={() => onSelectClient(client)}
                    className="p-2 hover:bg-[var(--hover-surface)] cursor-pointer border-b border-[var(--border)] text-sm text-[var(--foreground)] font-medium"
                  >
                    {client.nome}
                  </div>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={onOpenClientModal}
            className="bg-[var(--success)] text-white h-9 w-9 rounded-[var(--radius-md)] hover:bg-[var(--success-hover)] transition shadow-sm flex items-center justify-center shrink-0"
            title="Novo cliente"
          >
            <Icon name="plus" size={16} />
          </button>
        </div>
      </div>

      <div className="relative">
        <label className={`block mb-1 ${CAPS}`}>Produto (bipar ou digitar)</label>
        <input
          ref={searchInputRef}
          className="w-full rounded-[var(--radius-md)] border border-[var(--input)] bg-[var(--card)] text-[var(--foreground)] h-11 pl-10 pr-14 text-base outline-none focus:border-[var(--ring)] focus:ring-4 focus:ring-[var(--ring)]/20"
          placeholder="Código ou nome..."
          value={searchTerm}
          onChange={(e) => onSearchTermChange(e.target.value)}
          onKeyDown={onSearchKeyDown}
          style={MONO}
        />
        <Icon name="search" size={18} className="absolute left-3 top-1/2 mt-[10px] -translate-y-1/2 text-[var(--muted-foreground)]" />
        {onScanCode && (
          <button
            type="button"
            onClick={() => setScanOpen(true)}
            className="absolute right-2 top-[26px] flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)] bg-[var(--primary)] text-white shadow-sm active:scale-95 hover:bg-[var(--primary-hover)] transition"
            title="Ler código com a câmera"
            aria-label="Ler código de barras"
          >
            <Icon name="camera" size={18} />
          </button>
        )}

        {searchTerm.trim().length >= 2 && (
          <div className="absolute top-full left-0 w-full bg-[var(--popover)] border border-[var(--border)] rounded-[var(--radius-md)] shadow-lg mt-1 max-h-60 overflow-y-auto z-50">
            {searching ? (
              <div className="p-4 flex items-center justify-center gap-2 text-sm text-[var(--muted-foreground)]">
                <Icon name="refresh-cw" size={15} className="animate-spin" /> Buscando produtos...
              </div>
            ) : searchResults.length > 0 ? (
              searchResults.map((product) => (
                <div
                  key={product.id}
                  onClick={() => onSelectProduct(product)}
                  className="p-3 hover:bg-[var(--hover-surface)] cursor-pointer border-b border-[var(--border)] flex justify-between items-center gap-3 transition-colors"
                >
                  <div className="min-w-0">
                    <div className="font-medium text-[var(--foreground)] truncate">{product.descricao}</div>
                    <div className="text-xs text-[var(--muted-foreground)]" style={MONO}>
                      {product.codigo} · {product.estoque_atual} un.
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="font-semibold text-[var(--foreground)]" style={MONO}>
                      {`R$ ${Number(product.preco_venda).toFixed(2).replace(".", ",")}`}
                    </div>
                    <Icon name="plus" size={16} className="text-[var(--primary)]" />
                  </div>
                </div>
              ))
            ) : (
              <div className="p-4 text-center text-sm text-[var(--muted-foreground)] flex flex-col items-center gap-1">
                <Icon name="package-x" size={18} className="text-[var(--icon-muted)]" />
                Nenhum produto encontrado
              </div>
            )}
          </div>
        )}
      </div>

      <BarcodeScannerModal
        isOpen={scanOpen}
        onClose={() => setScanOpen(false)}
        onDetected={(code) => {
          setScanOpen(false);
          if (onScanCode) onScanCode(code);
        }}
      />
    </div>
  );
};

export default SaleEntryBar;
