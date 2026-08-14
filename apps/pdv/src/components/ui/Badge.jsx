import React from "react";

/**
 * Badge — etiqueta de status do design system (tons soft dos tokens).
 * Variantes: primary, success, warning, danger, info, neutral.
 * Uso: <Badge variant="success">Pago</Badge>
 *
 * Para o vocabulário fixo de status do produto há o atalho <Badge.Status status="pago" />.
 */

const VARIANTS = {
  primary:
    "bg-[var(--primary-soft)] text-[var(--primary-soft-foreground)] border-[var(--primary-soft-border)]",
  success:
    "bg-[var(--success-soft)] text-[var(--success-soft-foreground)] border-[var(--success-soft-border)]",
  warning:
    "bg-[var(--warning-soft)] text-[var(--warning-soft-foreground)] border-[var(--warning-soft-border)]",
  danger:
    "bg-[var(--danger-soft)] text-[var(--danger-soft-foreground)] border-[var(--danger-soft-border)]",
  info:
    "bg-[var(--info-soft)] text-[var(--info-soft-foreground)] border-[var(--info-soft-border)]",
  neutral:
    "bg-[var(--neutral-soft)] text-[var(--neutral-soft-foreground)] border-[var(--neutral-soft-border)]",
};

export function Badge({ variant = "neutral", className = "", children, ...props }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-[var(--radius-full)] border px-2 py-0.5 text-[11px] font-semibold leading-none ${
        VARIANTS[variant] || VARIANTS.neutral
      } ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}

// Vocabulário fixo de status do produto (README do handoff).
const STATUS = {
  pago: ["success", "Pago"],
  pendente: ["warning", "Pendente"],
  cancelado: ["danger", "Cancelado"],
  rascunho: ["neutral", "Rascunho"],
  emestoque: ["success", "Em estoque"],
  estoquebaixo: ["warning", "Estoque baixo"],
  esgotado: ["danger", "Esgotado"],
};

Badge.Status = function StatusBadge({ status, className = "" }) {
  const key = String(status || "").toLowerCase().replace(/\s+/g, "");
  const [variant, label] = STATUS[key] || ["neutral", status];
  return (
    <Badge variant={variant} className={className}>
      {label}
    </Badge>
  );
};

export default Badge;
