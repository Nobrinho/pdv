// =============================================================
// Modal.jsx — Modal reutilizável, responsivo.
// Desktop: modal centralizado. Mobile: bottom sheet (sobe de baixo,
// largura total, cantos arredondados no topo, com grabber).
// =============================================================
import React from "react";

const Modal = ({ isOpen, onClose, title, children, footer, size = "md", icon }) => {
  if (!isOpen) return null;

  // No mobile o painel ocupa a largura toda (bottom sheet); a largura maxima
  // so vale no desktop (sm+).
  const sizeClasses = {
    sm: "sm:max-w-sm",
    md: "sm:max-w-md",
    lg: "sm:max-w-lg",
    xl: "sm:max-w-xl",
    "2xl": "sm:max-w-2xl",
    "3xl": "sm:max-w-3xl",
    full: "sm:max-w-[calc(100vw-2rem)]",
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-end justify-center sm:items-center sm:p-4 z-[200] animate-fade-in backdrop-blur-sm">
      <div
        className={`bg-surface-100 rounded-t-2xl sm:rounded-xl shadow-2xl w-full ${sizeClasses[size] || sizeClasses.md} transform transition-all max-h-[92vh] sm:max-h-[90vh] flex flex-col pb-safe`}
      >
        <div className="sheet-grabber sm:hidden" />
        {title && (
          <h2 className="text-lg sm:text-xl font-bold px-5 sm:px-6 pt-2 sm:pt-6 pb-3 text-surface-800 border-b flex items-center justify-between shrink-0">
            <span className="flex items-center gap-2">
              {icon && <i className={`fas ${icon}`}></i>}
              {title}
            </span>
            {onClose && (
              <button
                onClick={onClose}
                className="text-surface-400 hover:text-surface-600 transition p-1"
                aria-label="Fechar"
              >
                <i className="fas fa-times"></i>
              </button>
            )}
          </h2>
        )}
        <div className="px-5 sm:px-6 py-4 overflow-y-auto flex-1">{children}</div>
        {footer && (
          <div className="px-5 sm:px-6 py-3 border-t border-surface-200 shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export default Modal;
