// =============================================================
// Modal.jsx — Componente de modal reutilizável
// =============================================================
import React from "react";

const Modal = ({ isOpen, onClose, title, children, size = "md", icon }) => {
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
        className={`bg-white rounded-xl shadow-2xl p-6 w-full ${sizeClasses[size] || sizeClasses.md} transform transition-all scale-100 max-h-[90vh] overflow-y-auto`}
      >
        {title && (
          <h2 className="text-xl font-bold mb-4 text-gray-800 border-b pb-3 flex items-center justify-between">
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
        {children}
      </div>
    </div>
  );
};

export default Modal;
