import React from "react";
import { applyCpfCnpjMask, applyNameMask } from "../../utils/validators";
import { formatCurrency } from "../../utils/format";
import Button from "../ui/Button";

const SalePaymentPanel = ({
  laborInput,
  onLaborInputChange,
  selectedMechanic = "",
  onMechanicChange,
  mechanics = [],
  surchargeType = "fixed",
  onSurchargeTypeChange,
  surchargeValue = "",
  onSurchargeValueChange,
  discountType = "percent",
  onDiscountTypeChange,
  discountValue = "",
  onDiscountValueChange,
  totals,
  payments = [],
  onRemovePayment,
  currentPaymentMethod = "Dinheiro",
  onCurrentPaymentMethodChange,
  installments = 1,
  onInstallmentsChange,
  paymentInputRef,
  currentPaymentValue = "",
  onCurrentPaymentValueChange,
  onPaymentValueFocus,
  onAddPayment,
  optsCpfReceipt = false,
  onOptsCpfReceiptChange,
  selectedClient,
  selectedClientHasValidDocument = false,
  receiptCpf = "",
  onReceiptCpfChange,
  receiptName = "",
  onReceiptNameChange,
  receiptClientFound,
  receiptSearching = false,
  onHandleReceiptCpfChange,
  onFinishSale,
  isFinishingSale = false,
}) => {
  return (
    <div className="w-full lg:w-96 flex flex-col gap-4 shrink-0">
      <div className="bg-surface-100 p-5 rounded-xl shadow-sm border border-surface-200 space-y-4">
        <h2 className="text-sm font-bold text-surface-500 uppercase tracking-wide border-b pb-2">
          Ajustes
        </h2>

        <div className="border-b border-dashed pb-3">
          <label className="block text-xs font-bold text-surface-500 uppercase mb-1">
            Mão de Obra (R$)
          </label>
          <div className="flex gap-2">
            <input
              id="labor-input"
              type="number"
              className="flex-1 border border-surface-300 rounded p-1.5 text-right text-sm font-medium focus:ring-1 focus:ring-primary-500 outline-none bg-surface-100 text-surface-800 border-surface-300 focus:ring-primary-500/20"
              value={laborInput}
              onChange={(e) => onLaborInputChange(e.target.value)}
              placeholder="0.00"
              min="0"
            />
            <select
              id="mechanic-select"
              className="w-1/2 border border-surface-300 rounded p-1.5 text-xs bg-surface-100"
              value={selectedMechanic}
              onChange={(e) => onMechanicChange(e.target.value)}
            >
              <option value="">Técnico...</option>
              {mechanics.map((mechanic) => (
                <option key={mechanic.id} value={mechanic.id}>
                  {mechanic.nome}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex gap-2 items-center">
          <div className="flex bg-surface-200 rounded p-0.5 border border-surface-200">
            <button
              onClick={() => onSurchargeTypeChange("fixed")}
              className={`text-xs px-2 py-1 rounded ${surchargeType === "fixed" ? "bg-surface-100 shadow text-green-600 font-bold" : "text-surface-400"}`}
            >
              R$
            </button>
            <button
              onClick={() => onSurchargeTypeChange("percent")}
              className={`text-xs px-2 py-1 rounded ${surchargeType === "percent" ? "bg-surface-100 shadow text-green-600 font-bold" : "text-surface-400"}`}
            >
              %
            </button>
          </div>
          <input
            type="number"
            className="flex-1 border border-surface-300 rounded p-1.5 text-right text-sm text-green-600 outline-none bg-surface-100 text-surface-800 border-surface-300 focus:ring-primary-500/20"
            placeholder="Acréscimo"
            value={surchargeValue}
            onChange={(e) => onSurchargeValueChange(e.target.value)}
          />
        </div>

        <div className="flex gap-2 items-center">
          <div className="flex bg-surface-200 rounded p-0.5 border border-surface-200">
            <button
              onClick={() => onDiscountTypeChange("fixed")}
              className={`text-xs px-2 py-1 rounded ${discountType === "fixed" ? "bg-surface-100 shadow text-red-600 font-bold" : "text-surface-400"}`}
            >
              R$
            </button>
            <button
              onClick={() => onDiscountTypeChange("percent")}
              className={`text-xs px-2 py-1 rounded ${discountType === "percent" ? "bg-surface-100 shadow text-red-600 font-bold" : "text-surface-400"}`}
            >
              %
            </button>
          </div>
          <input
            type="number"
            className="flex-1 border border-surface-300 rounded p-1.5 text-right text-sm text-red-600 outline-none bg-surface-100 text-surface-800 border-surface-300 focus:ring-primary-500/20"
            placeholder="Desconto"
            value={discountValue}
            onChange={(e) => onDiscountValueChange(e.target.value)}
          />
        </div>

        <div className="flex justify-between items-center pt-2 border-t border-dashed">
          <span className="text-surface-600 font-bold">Total a Pagar</span>
          <span className="text-2xl font-extrabold text-primary-700">
            {formatCurrency(totals.total)}
          </span>
        </div>
      </div>

      <div className="bg-surface-100 p-5 rounded-xl shadow-md border-l-4 border-primary-600 flex-1 flex flex-col">
        <h2 className="text-sm font-bold text-surface-500 uppercase tracking-wide mb-4">
          Pagamento
        </h2>
        <div className="flex-1 bg-surface-50 rounded-lg p-2 mb-4 overflow-y-auto max-h-40 border border-surface-200">
          {payments.map((payment, idx) => (
            <div
              key={idx}
              className="flex justify-between items-center p-2 bg-surface-100 rounded shadow-sm mb-1 text-sm"
            >
              <div>
                <span className="font-bold text-surface-800">{payment.metodo}</span>
                {payment.detalhes && (
                  <span className="text-xs text-surface-400 ml-1">({payment.detalhes})</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-surface-800">
                  {formatCurrency(payment.valor)}
                </span>
                <button
                  onClick={() => onRemovePayment(idx)}
                  className="text-red-400 hover:text-red-600"
                >
                  <i className="fas fa-times-circle"></i>
                </button>
              </div>
            </div>
          ))}
          {payments.length === 0 && (
            <p className="text-center text-xs text-surface-400 py-4">
              Nenhum pagamento adicionado
            </p>
          )}
        </div>

        <div className={`space-y-3 ${totals.remaining <= 0 ? "opacity-50 pointer-events-none" : ""}`}>
          <div className="grid grid-cols-2 gap-2">
            <select
              className="border border-surface-300 rounded p-2 text-sm bg-surface-100"
              value={currentPaymentMethod}
              onChange={(e) => onCurrentPaymentMethodChange(e.target.value)}
            >
              <option>Dinheiro</option>
              <option>Pix</option>
              <option>Crédito</option>
              <option>Débito</option>
              <option>Fiado</option>
            </select>
            {currentPaymentMethod === "Crédito" && (
              <select
                className="border border-surface-300 rounded p-2 text-sm bg-surface-100"
                value={installments}
                onChange={(e) => onInstallmentsChange(e.target.value)}
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((installment) => (
                  <option key={installment} value={installment}>
                    {installment}x
                  </option>
                ))}
              </select>
            )}
          </div>
          <div className="flex gap-2">
            <input
              ref={paymentInputRef}
              type="number"
              className="flex-1 border border-surface-300 rounded p-2 text-right font-bold text-surface-800 bg-surface-100 text-surface-800 border-surface-300 focus:ring-primary-500/20"
              placeholder="0.00"
              value={currentPaymentValue}
              onChange={(e) => onCurrentPaymentValueChange(e.target.value)}
              onFocus={onPaymentValueFocus}
            />
            <Button variant="primary" icon="fa-plus" onClick={onAddPayment} aria-label="Adicionar pagamento" />
          </div>
        </div>

        <div className="mt-auto pt-4 border-t border-surface-200">
          <div className="flex justify-between text-sm mb-2">
            <span>Pago:</span>
            <span className="font-bold text-green-600">{formatCurrency(totals.totalPaid)}</span>
          </div>
          {totals.remaining > 0 ? (
            <div className="flex justify-between text-lg font-bold text-red-600">
              <span>Falta:</span>
              <span>{formatCurrency(totals.remaining)}</span>
            </div>
          ) : (
            <div className="flex justify-between text-lg font-bold text-primary-600">
              <span>Troco:</span>
              <span>{formatCurrency(totals.change)}</span>
            </div>
          )}
          <div className="mt-4 border-t border-surface-200 pt-3">
            <label className="flex items-center gap-2 cursor-pointer text-sm font-bold text-surface-800">
              <input
                type="checkbox"
                className="w-4 h-4 text-primary-600 bg-surface-100 text-surface-800 border-surface-300 focus:ring-primary-500/20"
                checked={optsCpfReceipt}
                onChange={(e) => onOptsCpfReceiptChange(e.target.checked)}
              />
              Deseja CPF no Recibo?
            </label>
            {optsCpfReceipt && (
              <div className="mt-2 space-y-2 p-3 bg-primary-500/10 rounded-lg border border-primary-500/20">
                {selectedClient && selectedClientHasValidDocument ? (
                  <p className="text-xs text-primary-600 font-medium">
                    <i className="fas fa-check-circle mr-1"></i> Cliente já possui CPF/CNPJ cadastrado.
                  </p>
                ) : selectedClient ? (
                  <div>
                    <input
                      className="w-full border border-surface-300 rounded p-1.5 text-sm bg-surface-100 text-surface-800 focus:ring-primary-500/20 outline-none"
                      placeholder="Digite o CPF/CNPJ"
                      value={receiptCpf}
                      onChange={(e) => onReceiptCpfChange(applyCpfCnpjMask(e.target.value))}
                      maxLength="18"
                    />
                    <p className="text-[11px] text-surface-500 mt-1">
                      Cliente selecionado não possui CPF/CNPJ válido. Informe abaixo para atualizar o cadastro e imprimir no recibo.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="relative">
                      <input
                        className="w-full border border-surface-300 rounded p-1.5 pl-8 text-sm font-medium bg-surface-100 text-surface-800 focus:ring-primary-500/20 outline-none placeholder:text-surface-400"
                        placeholder="CPF/CNPJ *"
                        value={receiptCpf}
                        onChange={(e) => onHandleReceiptCpfChange(e.target.value)}
                        maxLength="18"
                        autoFocus
                      />
                      <i
                        className={`fas ${receiptSearching ? "fa-spinner fa-spin" : receiptClientFound ? "fa-check-circle text-green-500" : "fa-id-card text-surface-400"} absolute left-2.5 top-2.5 text-xs`}
                      ></i>
                    </div>
                    {receiptClientFound ? (
                      <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/20 rounded p-1.5 text-sm">
                        <i className="fas fa-user-check text-green-600 text-xs ml-1"></i>
                        <span className="font-bold text-green-600 whitespace-nowrap overflow-hidden text-ellipsis">
                          {receiptClientFound.nome}
                        </span>
                      </div>
                    ) : (
                      <input
                        className="w-full border border-surface-300 rounded p-1.5 text-sm bg-surface-100 text-surface-800 focus:ring-primary-500/20 outline-none placeholder:text-surface-400"
                        placeholder="Nome Completo *"
                        value={receiptName}
                        onChange={(e) => onReceiptNameChange(applyNameMask(e.target.value))}
                        disabled={receiptCpf.replace(/\D/g, "").length < 11}
                      />
                    )}
                  </>
                )}
              </div>
            )}
          </div>
          <Button
            variant="success"
            size="lg"
            fullWidth
            loading={isFinishingSale}
            disabled={totals.remaining > 0.01}
            onClick={onFinishSale}
            className="mt-4"
          >
            {isFinishingSale ? "Salvando..." : "Concluir venda"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SalePaymentPanel;
