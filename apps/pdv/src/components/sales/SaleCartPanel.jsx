import React from "react";
import { formatCurrency } from "../../utils/format";
import { Icon } from "../ui/Icon";

const MONO = { fontFamily: "var(--font-mono)", fontVariantNumeric: "tabular-nums" };

/**
 * Carrinho — lista única (design do redesign). Cada linha: nome + preço unitário,
 * stepper [− | qtd | +] (quando a qtd é 1, o − vira lixeira que remove o item) e
 * total da linha. Números em mono/tabular.
 */
const SaleCartPanel = ({ cart = [], totals, onQuantityChange, onRemoveItem, onClear }) => {
  const step = (item, delta) =>
    onQuantityChange(item.id, String(Math.max(1, Number(item.qty || 1) + delta)));

  const stepperBtn =
    "w-8 h-8 rounded-[var(--radius-md)] border border-[var(--border)] flex items-center justify-center text-[var(--muted-foreground)] hover:bg-[var(--hover-surface)] transition active:scale-95";

  return (
    <div className="bg-[var(--card)] rounded-[var(--radius-xl)] border border-[var(--border)] shadow-[var(--shadow-xs)] flex-1 overflow-hidden flex flex-col z-10">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--border)]">
        <span className="text-[10px] font-semibold uppercase tracking-[var(--tracking-caps)] text-[var(--muted-foreground)]">
          Carrinho · {cart.length} {cart.length === 1 ? "item" : "itens"}
        </span>
        {cart.length > 0 && onClear && (
          <button
            onClick={onClear}
            className="text-[11px] font-semibold text-[var(--muted-foreground)] hover:text-[var(--danger)] transition"
          >
            Limpar
          </button>
        )}
      </div>

      <div className="overflow-y-auto flex-1 divide-y divide-[var(--border)]">
        {cart.map((item) => {
          const isOne = Number(item.qty) <= 1;
          return (
            <div key={item.id} className="flex items-center gap-3 px-4 py-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm text-[var(--foreground)] truncate">{item.descricao}</p>
                <p className="text-[11px] text-[var(--muted-foreground)]" style={MONO}>
                  {formatCurrency(item.preco_venda)} un.
                </p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => (isOne ? onRemoveItem(item.id) : step(item, -1))}
                  className={stepperBtn}
                  aria-label={isOne ? "Remover" : "Diminuir"}
                >
                  <Icon name={isOne ? "trash-2" : "minus"} size={15} className={isOne ? "text-[var(--danger)]" : ""} />
                </button>
                <input
                  type="number"
                  min="1"
                  inputMode="numeric"
                  value={item.qty}
                  onChange={(e) => onQuantityChange(item.id, e.target.value)}
                  className="w-11 h-8 text-center rounded-[var(--radius-md)] border border-[var(--input)] bg-[var(--card)] text-sm text-[var(--foreground)] outline-none focus:border-[var(--ring)]"
                  style={MONO}
                />
                <button onClick={() => step(item, 1)} className={stepperBtn} aria-label="Aumentar">
                  <Icon name="plus" size={15} />
                </button>
              </div>
              <div className="w-20 text-right text-sm font-semibold text-[var(--foreground)] shrink-0" style={MONO}>
                {formatCurrency(item.preco_venda * item.qty)}
              </div>
            </div>
          );
        })}

        {cart.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-[var(--muted-foreground)]">
            <Icon name="shopping-cart" size={26} className="text-[var(--icon-muted)]" />
            <p className="text-sm font-medium text-[var(--foreground)]">Carrinho vazio</p>
            <p className="text-xs">Busque um produto para começar</p>
          </div>
        )}
      </div>

      <div className="px-4 py-3 border-t border-[var(--border)] flex justify-between items-center">
        <span className="text-[var(--muted-foreground)] text-sm font-medium">Subtotal</span>
        <span className="text-lg font-semibold text-[var(--foreground)]" style={MONO}>
          {formatCurrency(totals.subtotal)}
        </span>
      </div>
    </div>
  );
};

export default SaleCartPanel;
