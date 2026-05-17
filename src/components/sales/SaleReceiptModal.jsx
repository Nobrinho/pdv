import React from "react";
import CupomFiscal from "../CupomFiscal";

const SaleReceiptModal = ({
  lastSale,
  onPrint,
  onClose,
  isPrintingReceipt = false,
}) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
      <div className="bg-surface-300 p-4 rounded-lg shadow-2xl flex flex-col max-h-[95vh] w-full max-w-[340px]">
        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
          <CupomFiscal sale={lastSale} items={lastSale.itens} />
        </div>
        <div className="mt-4 flex gap-2 pt-2 border-t border-surface-300">
          <button
            onClick={onPrint}
            disabled={isPrintingReceipt}
            className={`flex-1 py-3 rounded-lg font-bold shadow transition-transform flex items-center justify-center ${isPrintingReceipt ? "bg-surface-400 text-white cursor-not-allowed" : "bg-primary-600 text-white hover:bg-primary-700 active:scale-95"}`}
          >
            <i className={`fas mr-2 ${isPrintingReceipt ? "fa-circle-notch fa-spin" : "fa-print"}`}></i>
            {isPrintingReceipt ? "Imprimindo..." : "Imprimir"}
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-surface-500 text-white py-3 rounded-lg font-bold hover:bg-surface-600 active:scale-95 transition-transform"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

export default SaleReceiptModal;
