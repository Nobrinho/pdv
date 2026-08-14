import React, { forwardRef } from "react";

/**
 * Checkbox e Radio alinhados ao Design System (SysControl).
 * Usam `accent-color` para pintar a marca/ponto com a cor primária do DS
 * (teal), evitando os azuis/indigos nativos do navegador.
 *
 * - Sem `label`: renderiza só o <input> (para tabelas, toggles inline).
 * - Com `label`: envolve em <label> clicável com o texto ao lado.
 *
 * São drop-in: encaminham ref e props nativas (checked, onChange, disabled...).
 */

const CONTROL_BASE =
  "h-4 w-4 shrink-0 cursor-pointer border border-[var(--input)] " +
  "accent-[var(--primary)] outline-none transition " +
  "focus-visible:ring-2 focus-visible:ring-[var(--ring)]/40 " +
  "disabled:cursor-not-allowed disabled:opacity-40";

function Control({ type, className, ...props }, ref) {
  return (
    <input
      ref={ref}
      type={type}
      className={`${CONTROL_BASE} ${type === "checkbox" ? "rounded" : "rounded-full"} ${className}`}
      {...props}
    />
  );
}

function withLabel(control, { label, labelClassName, disabled }) {
  if (!label) return control;
  return (
    <label
      className={`inline-flex items-center gap-2 ${
        disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"
      } ${labelClassName}`}
    >
      {control}
      <span>{label}</span>
    </label>
  );
}

export const Checkbox = forwardRef(function Checkbox(
  { label, labelClassName = "", className = "", disabled = false, ...props },
  ref
) {
  const control = Control({ type: "checkbox", className, disabled, ...props }, ref);
  return withLabel(control, { label, labelClassName, disabled });
});

export const Radio = forwardRef(function Radio(
  { label, labelClassName = "", className = "", disabled = false, ...props },
  ref
) {
  const control = Control({ type: "radio", className, disabled, ...props }, ref);
  return withLabel(control, { label, labelClassName, disabled });
});

export default Checkbox;
