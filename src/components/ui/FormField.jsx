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

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      {label && (
        <label className="block text-xs font-bold text-gray-500 uppercase tracking-tight ml-1">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <div className="relative group">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors">
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
            w-full border rounded-lg p-2.5 outline-none transition-all duration-200 text-sm
            ${icon ? "pl-10" : "pl-3"}
            ${disabled ? "bg-gray-50 text-gray-400 cursor-not-allowed border-gray-200" : "bg-white border-gray-300 hover:border-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"}
            ${error ? "border-red-500 focus:border-red-500 focus:ring-red-100" : ""}
          `}
          {...props}
        />
      </div>
      {error && (
        <span className="text-[10px] text-red-500 font-medium ml-1">
          {error}
        </span>
      )}
    </div>
  );
};

export default FormField;
