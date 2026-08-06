import React from "react";

/**
 * Estado vazio ilustrado (ícone em bolha + título + mensagem opcional + ação).
 * Reutilizável em listas, buscas sem resultado, telas sem dados.
 */
const EmptyState = ({
  icon = "fa-inbox",
  title = "Nada por aqui ainda",
  message = "",
  action = null,
  className = "",
}) => (
  <div className={`flex flex-col items-center justify-center gap-3 px-6 py-16 text-center ${className}`}>
    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-surface-200/70">
      <i className={`fas ${icon} text-2xl text-surface-400`}></i>
    </div>
    <div>
      <p className="text-sm font-bold text-surface-700">{title}</p>
      {message && <p className="mx-auto mt-1 max-w-xs text-xs text-surface-400">{message}</p>}
    </div>
    {action}
  </div>
);

export default EmptyState;
