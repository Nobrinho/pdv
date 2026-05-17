import React from "react";
import FormField from "../ui/FormField";
import Modal from "../ui/Modal";

const StockEntryModal = ({
  isOpen,
  onClose,
  onSubmit,
  isUpdating = false,
  stockData,
  onQuantityChange,
}) => {
  const nextQuantity =
    Number(stockData.quantidade_atual || 0) +
    (parseInt(stockData.quantidade_adicionar, 10) || 0);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Entrada de Estoque"
      icon="fa-plus-circle"
      size="md"
      footer={
        <div className="flex gap-2 w-full">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2.5 bg-surface-200 text-surface-800 rounded-xl font-medium text-sm hover:bg-surface-300 transition"
          >
            Cancelar
          </button>
          <button
            onClick={onSubmit}
            disabled={isUpdating}
            className="flex-[2] px-4 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 font-black text-sm shadow-md active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isUpdating ? "ATUALIZANDO..." : "Confirmar Entrada"}
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        <div className="bg-surface-50 p-4 rounded-xl border border-surface-200">
          <div className="text-xs font-bold text-surface-400 uppercase mb-2">
            Produto Selecionado
          </div>
          <div className="text-lg font-black text-surface-800">{stockData.nome}</div>
        </div>

        <div className="flex items-center justify-center gap-8 bg-primary-50/50 p-4 rounded-2xl border border-primary-100">
          <div className="text-center">
            <div className="text-[10px] font-black text-primary-400 uppercase mb-1">Atual</div>
            <div className="text-3xl font-black text-surface-400">{stockData.quantidade_atual}</div>
          </div>
          <i className="fas fa-arrow-right text-primary-200"></i>
          <div className="text-center">
            <div className="text-[10px] font-black text-green-500 uppercase mb-1">Novo</div>
            <div className="text-3xl font-black text-green-600">{nextQuantity}</div>
          </div>
        </div>

        <FormField
          label="Quantidade a Adicionar"
          type="number"
          min="1"
          value={stockData.quantidade_adicionar}
          onChange={onQuantityChange}
          placeholder="0"
          className="text-center"
          autoFocus
        />
      </div>
    </Modal>
  );
};

export default StockEntryModal;
