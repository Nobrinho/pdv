// =============================================================
// Modal.jsx — Componente de modal reutilizável
// =============================================================
import React from "react";

const Modal = ({ isOpen, onClose, title, children, footer, size = "md", icon }) => {
  if (!isOpen) return null;

  const sizeClasses = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
    "2xl": "max-w-2xl",
    "3xl": "max-w-3xl",
    full: "max-w-[90vw]",
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50 animate-fade-in backdrop-blur-sm">
      <div
        className={`bg-white rounded-xl shadow-2xl w-full ${sizeClasses[size] || sizeClasses.md} transform transition-all scale-100 max-h-[90vh] flex flex-col`}
      >
        {title && (
          <h2 className="text-xl font-bold p-6 pb-3 text-gray-800 border-b flex items-center justify-between shrink-0">
            <span className="flex items-center gap-2">
              {icon && <i className={`fas ${icon}`}></i>}
              {title}
            </span>
            {onClose && (
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition"
              >
                <i className="fas fa-times"></i>
              </button>
            )}
          </h2>
        )}
        <div className="p-6 pt-4 overflow-y-auto flex-1">
          {children}
        </div>
        {footer && (
          <div className="p-6 pt-3 border-t border-gray-100 shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export default Modal;
