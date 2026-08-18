import React from "react";
import { applyCpfCnpjMask, applyNameMask } from "../../utils/validators";
import { formatCurrency } from "../../utils/format";
import Button from "../ui/Button";
import { Input, Select } from "../ui/Input";
import { Checkbox } from "../ui/Checkbox";
import { Card } from "../ui/Card";
import { Icon } from "../ui/Icon";

const MONO = { fontFamily: "var(--font-mono)", fontVariantNumeric: "tabular-nums" };
const CAPS = "text-[10px] font-semibold uppercase tracking-[var(--tracking-caps)] text-[var(--muted-foreground)]";

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
  canDiscount = true,
  canFiado = true,
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
      <Card radius="md" className="space-y-4">
        <h2 className={`${CAPS} border-b border-[var(--border)] pb-2`}>Ajustes</h2>

        <div className="border-b border-dashed border-[var(--border)] pb-3">
          <label className={`block mb-1 ${CAPS}`}>Mão de obra (R$)</label>
          <div className="flex gap-2">
            <Input
              id="labor-input"
              type="number"
              size="sm"
              className="flex-1 text-right text-sm font-medium"
              value={laborInput}
              onChange={(e) => onLaborInputChange(e.target.value)}
              placeholder="0.00"
              min="0"
            />
            <Select
              id="mechanic-select"
              size="sm"
              className="w-1/2"
              value={selectedMechanic}
              onChange={(e) => onMechanicChange(e.target.value)}
            >
              <option value="">Técnico...</option>
              {mechanics.map((mechanic) => (
                <option key={mechanic.id} value={mechanic.id}>
                  {mechanic.nome}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div className="flex gap-2 items-center">
          <div className="flex bg-[var(--content2)] rounded-[var(--radius-md)] p-0.5 border border-[var(--border)]">
            <button
              onClick={() => onSurchargeTypeChange("fixed")}
              className={`text-xs px-2 py-1 rounded ${surchargeType === "fixed" ? "bg-[var(--card)] shadow-sm text-[var(--success)] font-bold" : "text-[var(--muted-foreground)]"}`}
            >
              R$
            </button>
            <button
              onClick={() => onSurchargeTypeChange("percent")}
              className={`text-xs px-2 py-1 rounded ${surchargeType === "percent" ? "bg-[var(--card)] shadow-sm text-[var(--success)] font-bold" : "text-[var(--muted-foreground)]"}`}
            >
              %
            </button>
          </div>
          <Input
            type="number"
            size="sm"
            className="flex-1 text-right text-sm text-[var(--success)]"
            placeholder="Acréscimo"
            value={surchargeValue}
            onChange={(e) => onSurchargeValueChange(e.target.value)}
          />
        </div>

        {canDiscount && (
          <div className="flex gap-2 items-center">
            <div className="flex bg-[var(--content2)] rounded-[var(--radius-md)] p-0.5 border border-[var(--border)]">
              <button
                onClick={() => onDiscountTypeChange("fixed")}
                className={`text-xs px-2 py-1 rounded ${discountType === "fixed" ? "bg-[var(--card)] shadow-sm text-[var(--danger)] font-bold" : "text-[var(--muted-foreground)]"}`}
              >
                R$
              </button>
              <button
                onClick={() => onDiscountTypeChange("percent")}
                className={`text-xs px-2 py-1 rounded ${discountType === "percent" ? "bg-[var(--card)] shadow-sm text-[var(--danger)] font-bold" : "text-[var(--muted-foreground)]"}`}
              >
                %
              </button>
            </div>
            <Input
              type="number"
              size="sm"
              className="flex-1 text-right text-sm text-[var(--danger)]"
              placeholder="Desconto"
              value={discountValue}
              onChange={(e) => onDiscountValueChange(e.target.value)}
            />
          </div>
        )}

        <div className="flex justify-between items-center pt-2 border-t border-dashed border-[var(--border)]">
          <span className={CAPS}>Total a pagar</span>
          <span className="text-2xl font-semibold text-[var(--foreground)]" style={MONO}>
            {formatCurrency(totals.total)}
          </span>
        </div>
      </Card>

      <div className="bg-[var(--card)] p-5 rounded-[var(--radius-xl)] shadow-[var(--shadow-xs)] border border-[var(--border)] border-l-4 border-l-[var(--primary)] flex-1 flex flex-col">
        <h2 className={`${CAPS} mb-4`}>Pagamento</h2>
        <div className="flex-1 bg-[var(--content2)] rounded-[var(--radius-md)] p-2 mb-4 overflow-y-auto max-h-40 border border-[var(--border)] space-y-1">
          {payments.map((payment, idx) => (
            <div
              key={idx}
              className="flex justify-between items-center p-2 bg-[var(--card)] rounded-[var(--radius-md)] shadow-sm text-sm"
            >
              <div className="flex items-center gap-2 min-w-0">
                <Icon name="circle-check" size={15} className="text-[var(--success)] shrink-0" />
                <span className="font-medium text-[var(--foreground)] truncate">{payment.metodo}</span>
                {payment.detalhes && (
                  <span className="text-xs text-[var(--muted-foreground)]">({payment.detalhes})</span>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="font-semibold text-[var(--foreground)]" style={MONO}>
                  {formatCurrency(payment.valor)}
                </span>
                <button
                  onClick={() => onRemovePayment(idx)}
                  className="text-[var(--muted-foreground)] hover:text-[var(--danger)]"
                  aria-label="Remover pagamento"
                >
                  <Icon name="trash-2" size={15} />
                </button>
              </div>
            </div>
          ))}
          {payments.length === 0 && (
            <p className="text-center text-xs text-[var(--muted-foreground)] py-4">
              Nenhum pagamento adicionado
            </p>
          )}
        </div>

        <div className={`space-y-3 ${totals.remaining <= 0 ? "opacity-50 pointer-events-none" : ""}`}>
          <div className="grid grid-cols-2 gap-2">
            <Select
              value={currentPaymentMethod}
              onChange={(e) => onCurrentPaymentMethodChange(e.target.value)}
            >
              <option>Dinheiro</option>
              <option>Pix</option>
              <option>Crédito</option>
              <option>Débito</option>
              {canFiado && <option>Fiado</option>}
            </Select>
            {currentPaymentMethod === "Crédito" && (
              <Select
                value={installments}
                onChange={(e) => onInstallmentsChange(e.target.value)}
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((installment) => (
                  <option key={installment} value={installment}>
                    {installment}x
                  </option>
                ))}
              </Select>
            )}
          </div>
          <div className="flex gap-2">
            <Input
              ref={paymentInputRef}
              type="number"
              className="flex-1 text-right font-bold"
              style={MONO}
              placeholder="0,00"
              value={currentPaymentValue}
              onChange={(e) => onCurrentPaymentValueChange(e.target.value)}
              onFocus={onPaymentValueFocus}
            />
            <button
              onClick={onAddPayment}
              aria-label="Adicionar pagamento"
              className="h-9 w-9 shrink-0 rounded-[var(--radius-md)] bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] transition flex items-center justify-center active:scale-95"
            >
              <Icon name="plus" size={16} />
            </button>
          </div>
        </div>

        <div className="mt-auto pt-4 border-t border-[var(--border)]">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-[var(--muted-foreground)]">Pago</span>
            <span className="font-semibold text-[var(--money-positive)]" style={MONO}>{formatCurrency(totals.totalPaid)}</span>
          </div>
          {totals.remaining > 0 ? (
            <div className="flex justify-between text-lg font-bold text-[var(--money-negative)]">
              <span>Falta</span>
              <span style={MONO}>{formatCurrency(totals.remaining)}</span>
            </div>
          ) : (
            <div className="flex justify-between text-lg font-bold text-[var(--primary)]">
              <span>Troco</span>
              <span style={MONO}>{formatCurrency(totals.change)}</span>
            </div>
          )}
          <div className="mt-4 border-t border-[var(--border)] pt-3">
            <Checkbox
              label="Incluir CPF no recibo"
              labelClassName="text-sm font-medium text-[var(--foreground)]"
              checked={optsCpfReceipt}
              onChange={(e) => onOptsCpfReceiptChange(e.target.checked)}
            />
            {optsCpfReceipt && (
              <div className="mt-2 space-y-2 p-3 bg-[var(--primary-soft)] rounded-[var(--radius-md)] border border-[var(--primary-soft-border)]">
                {selectedClient && selectedClientHasValidDocument ? (
                  <p className="text-xs text-[var(--primary-soft-foreground)] font-medium flex items-center gap-1">
                    <Icon name="circle-check" size={13} /> Cliente já possui CPF/CNPJ cadastrado.
                  </p>
                ) : selectedClient ? (
                  <div>
                    <Input
                      size="sm"
                      className="text-sm"
                      placeholder="Digite o CPF/CNPJ"
                      value={receiptCpf}
                      onChange={(e) => onReceiptCpfChange(applyCpfCnpjMask(e.target.value))}
                      maxLength="18"
                    />
                    <p className="text-[11px] text-[var(--muted-foreground)] mt-1">
                      Cliente selecionado não possui CPF/CNPJ válido. Informe abaixo para atualizar o cadastro e imprimir no recibo.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="relative">
                      <Input
                        size="sm"
                        className="pl-8 text-sm font-medium"
                        placeholder="CPF/CNPJ *"
                        value={receiptCpf}
                        onChange={(e) => onHandleReceiptCpfChange(e.target.value)}
                        maxLength="18"
                        autoFocus
                      />
                      <Icon
                        name={receiptSearching ? "refresh-cw" : receiptClientFound ? "circle-check" : "users"}
                        size={13}
                        className={`absolute left-2.5 top-1/2 -translate-y-1/2 ${receiptSearching ? "animate-spin text-[var(--muted-foreground)]" : receiptClientFound ? "text-[var(--success)]" : "text-[var(--muted-foreground)]"}`}
                      />
                    </div>
                    {receiptClientFound ? (
                      <div className="flex items-center gap-2 bg-[var(--success-soft)] border border-[var(--success-soft-border)] rounded-[var(--radius-md)] p-1.5 text-sm">
                        <Icon name="circle-check" size={13} className="text-[var(--success)]" />
                        <span className="font-semibold text-[var(--success-soft-foreground)] whitespace-nowrap overflow-hidden text-ellipsis">
                          {receiptClientFound.nome}
                        </span>
                      </div>
                    ) : (
                      <Input
                        size="sm"
                        className="text-sm"
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
            className="mt-4 h-14 text-base"
          >
            {isFinishingSale ? "Salvando..." : "Concluir venda"}
            {!isFinishingSale && <Icon name="arrow-right" size={18} className="ml-1" />}
          </Button>
          <p className="mt-2 text-center text-[11px] text-[var(--muted-foreground)]">
            Enter conclui · F2 volta à busca
          </p>
        </div>
      </div>
    </div>
  );
};

export default SalePaymentPanel;
