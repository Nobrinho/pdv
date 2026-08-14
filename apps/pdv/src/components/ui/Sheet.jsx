import React from "react";
import { Icon } from "./Icon";
import { AnimatePresence, motion } from "framer-motion";

/**
 * Sheet responsivo: no mobile sobe de baixo (bottom sheet, arrasta pra fechar);
 * no desktop (sm+) vira um modal centralizado. Reaproveitavel em formularios e detalhes.
 *
 * props: isOpen, onClose, title, children, footer, size ('auto' | 'full')
 */
const Sheet = ({ isOpen, onClose, title, children, footer, size = "auto" }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center">
          <motion.div
            className="absolute inset-0 bg-black/50"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          <motion.div
            className={`relative w-full sm:max-w-lg bg-surface-100 rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col pb-safe ${
              size === "full" ? "h-[92vh] sm:h-auto sm:max-h-[85vh]" : "max-h-[88vh]"
            }`}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.2}
            onDragEnd={(_, info) => {
              if (info.offset.y > 120) onClose();
            }}
          >
            <div className="sheet-grabber sm:hidden" />
            {title && (
              <div className="flex items-center justify-between px-5 py-3 border-b border-surface-200">
                <h2 className="font-black text-surface-800 truncate">{title}</h2>
                <button onClick={onClose} className="text-surface-400 hover:text-surface-700 p-1" aria-label="Fechar">
                  <Icon name="x" size={18} />
                </button>
              </div>
            )}
            <div className="flex-1 overflow-y-auto p-5">{children}</div>
            {footer && <div className="px-5 py-3 border-t border-surface-200 bg-surface-100">{footer}</div>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default Sheet;
