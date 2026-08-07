import React, { forwardRef } from "react";

/**
 * Primitivas de formulário alinhadas ao Design System (SysControl).
 * Usam os mesmos tokens do Button (cores fixas do DS via CSS vars):
 * - borda:  --input / --border
 * - fundo:  --card
 * - texto:  --foreground / placeholder --muted-foreground
 * - foco:   --ring (anel) + borda primária
 *
 * São drop-in para <input>/<select>/<textarea>: encaminham ref e todas as
 * props nativas (incluindo onChange que recebe o event, como o HTML padrão).
 */

const SIZES = {
  sm: "h-8 px-2.5 text-xs",
  md: "h-9 px-3 text-sm",
  lg: "h-10 px-3.5 text-sm",
};

// Base compartilhada por input/select. Textarea reaproveita sem a altura fixa.
const BASE =
  "w-full rounded-lg border bg-[var(--card)] text-[var(--foreground)] " +
  "placeholder:text-[var(--muted-foreground)] outline-none transition " +
  "focus:border-[var(--ring)] focus:ring-4 focus:ring-[var(--ring)]/20 " +
  "disabled:cursor-not-allowed disabled:opacity-60";

function borderClass(invalid) {
  return invalid
    ? "border-[var(--danger)] focus:border-[var(--danger)] focus:ring-[var(--danger)]/20"
    : "border-[var(--input)] hover:border-[var(--ring)]/60";
}

/**
 * Input de texto. Suporta ícone à esquerda (icon) e à direita (iconEnd),
 * ambos como classe FontAwesome sem prefixo (ex.: "fa-magnifying-glass").
 */
export const Input = forwardRef(function Input(
  { size = "md", icon, iconEnd, invalid = false, className = "", ...props },
  ref
) {
  const field = (
    <input
      ref={ref}
      className={`${BASE} ${SIZES[size]} ${borderClass(invalid)} ${
        icon ? "pl-9" : ""
      } ${iconEnd ? "pr-9" : ""} ${className}`}
      {...props}
    />
  );

  if (!icon && !iconEnd) return field;

  return (
    <div className="relative group">
      {icon && (
        <i
          className={`fas ${icon} pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] group-focus-within:text-[var(--primary)] transition-colors`}
        />
      )}
      {field}
      {iconEnd && (
        <i
          className={`fas ${iconEnd} pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]`}
        />
      )}
    </div>
  );
});

/** Select nativo com a mesma aparência do Input. */
export const Select = forwardRef(function Select(
  { size = "md", invalid = false, className = "", children, ...props },
  ref
) {
  return (
    <select
      ref={ref}
      className={`${BASE} ${SIZES[size]} ${borderClass(invalid)} pr-8 appearance-none bg-no-repeat ${className}`}
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='%2371717a'%3E%3Cpath fill-rule='evenodd' d='M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z' clip-rule='evenodd'/%3E%3C/svg%3E\")",
        backgroundPosition: "right 0.6rem center",
        backgroundSize: "1.1em",
        ...(props.style || {}),
      }}
      {...props}
    >
      {children}
    </select>
  );
});

/** Textarea com a mesma aparência do Input. */
export const Textarea = forwardRef(function Textarea(
  { invalid = false, rows = 3, className = "", ...props },
  ref
) {
  return (
    <textarea
      ref={ref}
      rows={rows}
      className={`${BASE} px-3 py-2 text-sm leading-relaxed ${borderClass(invalid)} ${className}`}
      {...props}
    />
  );
});

/**
 * Wrapper de campo: rótulo + controle + erro/ajuda.
 * Uso: <Field label="Nome" required error={err}><Input .../></Field>
 */
export function Field({ label, htmlFor, required = false, error, hint, className = "", children }) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label
          htmlFor={htmlFor}
          className="text-[11px] font-bold uppercase tracking-wide text-[var(--muted-foreground)] ml-0.5"
        >
          {label}
          {required && <span className="text-[var(--danger)] ml-0.5">*</span>}
        </label>
      )}
      {children}
      {error ? (
        <span className="text-[11px] font-medium text-[var(--danger)] ml-0.5">{error}</span>
      ) : hint ? (
        <span className="text-[11px] text-[var(--muted-foreground)] ml-0.5">{hint}</span>
      ) : null}
    </div>
  );
}

export default Input;
