import React from "react";
import { formatCurrency } from "../../utils/format";
import Button from "../ui/Button";

const BudgetSummaryPanel = ({
  showSellerField = true,
  sellers = [],
  selectedSeller = "",
  onSelectedSellerChange,
  mechanics = [],
  selectedMechanic = "",
  onSelectedMechanicChange,
  laborInput = "",
  onLaborInputChange,
  surchargeValue = "",
  onSurchargeValueChange,
  discountValue = "",
  onDiscountValueChange,
  observations = "",
  onObservationsChange,
  validityDate = "",
  onValidityDateChange,
  totals,
  onSave,
  isSaving = false,
  editingCode = "",
}) => {
  return (
    <div className="w-full lg:w-96 flex flex-col gap-4 shrink-0">
      <div className="bg-surface-100 p-5 rounded-xl shadow-sm border border-surface-200 space-y-4">
        <h2 className="text-sm font-bold text-surface-500 uppercase tracking-wide border-b pb-2">
          Dados do Orcamento
        </h2>

        {editingCode && (
          <div className="rounded-lg border border-primary-200 bg-primary-50 px-3 py-2 text-xs font-bold text-primary-700">
            {editingCode}
          </div>
        )}

        {showSellerField && (
          <div>
            <label className="block text-xs font-bold text-surface-500 uppercase mb-1">
              Vendedor
            </label>
            <select
              className="w-full border border-surface-300 rounded-lg p-2.5 bg-surface-50 outline-none focus:ring-2 focus:ring-primary-500"
              value={selectedSeller}
              onChange={(e) => onSelectedSellerChange(e.target.value)}
            >
              <option value="">Selecione...</option>
              {sellers.map((seller) => (
                <option key={seller.id} value={seller.id}>
                  {seller.nome}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className={`${showSellerField ? "border-t border-dashed pt-3" : ""}`}>
          <label className="block text-xs font-bold text-surface-500 uppercase mb-1">
            Mao de Obra (R$)
          </label>
          <div className="flex gap-2">
            <input
              type="number"
              min="0"
              step="0.01"
              className="flex-1 border border-surface-300 rounded-lg p-2.5 text-right bg-surface-50 outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="0,00"
              value={laborInput}
              onChange={(e) => onLaborInputChange(e.target.value)}
            />
            <select
              className="w-1/2 border border-surface-300 rounded-lg p-2.5 bg-surface-50 outline-none focus:ring-2 focus:ring-primary-500"
              value={selectedMechanic}
              onChange={(e) => onSelectedMechanicChange(e.target.value)}
            >
              <option value="">Tecnico...</option>
              {mechanics.map((mechanic) => (
                <option key={mechanic.id} value={mechanic.id}>
                  {mechanic.nome}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-surface-500 uppercase mb-1">
              Acrescimo (R$)
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              className="w-full border border-surface-300 rounded-lg p-2.5 text-right bg-surface-50 outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="0,00"
              value={surchargeValue}
              onChange={(e) => onSurchargeValueChange(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-surface-500 uppercase mb-1">
              Desconto (R$)
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              className="w-full border border-surface-300 rounded-lg p-2.5 text-right bg-surface-50 outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="0,00"
              value={discountValue}
              onChange={(e) => onDiscountValueChange(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-surface-500 uppercase mb-1">
            Validade
          </label>
          <input
            type="date"
            className="w-full border border-surface-300 rounded-lg p-2.5 bg-surface-50 outline-none focus:ring-2 focus:ring-primary-500"
            value={validityDate}
            onChange={(e) => onValidityDateChange(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-surface-500 uppercase mb-1">
            Observacoes
          </label>
          <textarea
            rows="4"
            className="w-full border border-surface-300 rounded-lg p-2.5 bg-surface-50 outline-none focus:ring-2 focus:ring-primary-500 resize-none"
            placeholder="Observacoes do orcamento..."
            value={observations}
            onChange={(e) => onObservationsChange(e.target.value)}
          />
        </div>

        <div className="rounded-xl border border-surface-200 bg-surface-50 p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-surface-500">Subtotal</span>
            <span className="font-bold text-surface-800">{formatCurrency(totals.subtotal)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-surface-500">Mao de obra</span>
            <span className="font-bold text-surface-800">{formatCurrency(totals.labor)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-surface-500">Acrescimo</span>
            <span className="font-bold text-surface-800">{formatCurrency(totals.surcharge)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-surface-500">Desconto</span>
            <span className="font-bold text-surface-800">{formatCurrency(totals.discount)}</span>
          </div>
          <div className="flex justify-between text-lg pt-2 border-t border-dashed">
            <span className="font-bold text-surface-700">Total</span>
            <span className="font-extrabold text-primary-700">{formatCurrency(totals.total)}</span>
          </div>
        </div>

        <Button variant="primary" size="lg" fullWidth loading={isSaving} onClick={onSave}>
          {isSaving ? "Salvando..." : editingCode ? "Atualizar orçamento" : "Salvar orçamento"}
        </Button>
      </div>
    </div>
  );
};

export default BudgetSummaryPanel;
