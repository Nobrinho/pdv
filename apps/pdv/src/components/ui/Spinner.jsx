import React from "react";

/**
 * Spinner — indicador de carregamento do design system.
 * Usa `currentColor`, então herda a cor do texto (aplique text-[var(--primary)]
 * ou similar). `size` em px, `stroke` a espessura da borda.
 */
export function Spinner({ size = 16, stroke = 2, className = "", ...props }) {
  return (
    <span
      role="status"
      aria-label="Carregando"
      className={`inline-block animate-spin rounded-full border-current border-t-transparent align-[-0.125em] ${className}`}
      style={{ width: size, height: size, borderWidth: stroke }}
      {...props}
    />
  );
}

export default Spinner;
