import React from "react";

/**
 * FormField Component
 * @param {string} label - Rótulo do campo
 * @param {string} type - Tipo do input (text, number, date, etc.)
 * @param {any} value - Valor do campo
 * @param {function} onChange - Callback para mudança de valor
 * @param {string} placeholder - Placeholder do campo
 * @param {boolean} required - Se o campo é obrigatório
 * @param {string} icon - Ícone opcional (FontAwesome class)
 * @param {string} error - Mensagem de erro opcional
 * @param {string} className - Classes adicionais para o container
 * @param {boolean} disabled - Se o campo está desativado
 */
const FormField = ({
  label,
  type = "text",
  value,
  onChange,
  placeholder,
  required = false,
  icon,
  error,
  className = "",
  disabled = false,
  ...props
}) => {
  const handleChange = (e) => {
    if (onChange) {
      onChange(e.target.value);
    }
  };

  // Estilo alinhado ao Design System (mesmos tokens do Button/Input).
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label className="block text-[11px] font-bold uppercase tracking-wide text-[var(--muted-foreground)] ml-0.5">
          {label} {required && <span className="text-[var(--danger)]">*</span>}
        </label>
      )}
      <div className="relative group">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] group-focus-within:text-[var(--primary)] transition-colors">
            <i className={`fas ${icon}`}></i>
          </div>
        )}
        <input
          type={type}
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          className={`
            w-full rounded-lg border bg-[var(--card)] text-[var(--foreground)] h-9 text-sm outline-none transition
            placeholder:text-[var(--muted-foreground)]
            focus:border-[var(--ring)] focus:ring-4 focus:ring-[var(--ring)]/20
            disabled:cursor-not-allowed disabled:opacity-60
            ${icon ? "pl-9 pr-3" : "px-3"}
            ${error
              ? "border-[var(--danger)] focus:border-[var(--danger)] focus:ring-[var(--danger)]/20"
              : "border-[var(--input)] hover:border-[var(--ring)]/60"
            }
          `}
          {...props}
        />
      </div>
      {error && (
        <span className="text-[11px] text-[var(--danger)] font-medium ml-0.5">
          {error}
        </span>
      )}
    </div>
  );
};

export default FormField;
