import React from "react";

/**
 * Switch — toggle on/off do design system.
 * Trilho: --switch-track (off) / --primary (on). Botão: --switch-thumb.
 * Controlado: `checked` + `onChange(next)`.
 */
export function Switch({
  checked = false,
  onChange,
  disabled = false,
  id,
  label,
  className = "",
  ...props
}) {
  const control = (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onChange && onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--ring)]/40 disabled:cursor-not-allowed disabled:opacity-50 ${
        checked ? "bg-[var(--primary)]" : "bg-[var(--switch-track)]"
      } ${className}`}
      {...props}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-[var(--switch-thumb)] shadow transition-transform ${
          checked ? "translate-x-5" : "translate-x-0.5"
        }`}
      />
    </button>
  );

  if (!label) return control;
  return (
    <label className={`inline-flex items-center gap-2 ${disabled ? "opacity-60" : "cursor-pointer"}`}>
      {control}
      <span className="text-sm font-medium text-[var(--foreground)]">{label}</span>
    </label>
  );
}

export default Switch;
