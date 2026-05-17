import React from "react";
import FormField from "../ui/FormField";
import Modal from "../ui/Modal";

const ProductFormModal = ({
  isOpen,
  onClose,
  onSubmit,
  isSaving = false,
  editingId = null,
  formData,
  onFormChange,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingId ? "Editar Produto" : "Cadastrar Produto"}
      icon="fa-tags"
      size="md"
      footer={
        <div className="flex justify-end gap-3 w-full">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-surface-200 text-surface-800 rounded-xl hover:bg-surface-300 transition font-medium text-sm"
          >
            Cancelar
          </button>
          <button
            onClick={onSubmit}
            disabled={isSaving}
            className="px-6 py-2.5 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition font-bold text-sm shadow-md active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <i className={`fas mr-2 ${isSaving ? "fa-circle-notch fa-spin" : "fa-save"}`}></i>
            {isSaving ? "SALVANDO..." : editingId ? "Atualizar" : "Salvar"}
          </button>
        </div>
      }
    >
      <div className="space-y-5">
        <div className="bg-surface-50 p-4 rounded-xl border border-surface-200">
          <label className="block text-[10px] font-black text-surface-400 uppercase tracking-widest mb-3">
            Tipo de Produto
          </label>
          <div className="flex gap-6">
            <label className="flex items-center cursor-pointer group">
              <input
                type="radio"
                name="tipo"
                value="novo"
                checked={formData.tipo === "novo"}
                onChange={(e) => onFormChange("tipo", e.target.value)}
                className="mr-3 w-5 h-5 text-primary-600 border-surface-300 focus:ring-primary-500"
              />
              <span className={`text-sm font-bold ${formData.tipo === "novo" ? "text-primary-700" : "text-surface-500 group-hover:text-surface-800"}`}>
                Novo (Peça)
              </span>
            </label>
            <label className="flex items-center cursor-pointer group">
              <input
                type="radio"
                name="tipo"
                value="usado"
                checked={formData.tipo === "usado"}
                onChange={(e) => onFormChange("tipo", e.target.value)}
                className="mr-3 w-5 h-5 text-orange-600 border-surface-300 focus:ring-orange-500"
              />
              <span className={`text-sm font-bold ${formData.tipo === "usado" ? "text-orange-700" : "text-surface-500 group-hover:text-surface-800"}`}>
                Usado (Desmonte)
              </span>
            </label>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            label="Código"
            value={formData.codigo}
            onChange={(value) => onFormChange("codigo", value)}
            placeholder="Ex: 12345"
            autoFocus
          />
          <FormField
            label="Descrição *"
            value={formData.descricao}
            onChange={(value) => onFormChange("descricao", value)}
            placeholder="Ex: Óleo de Motor 1L"
            required
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <FormField
            label="Preço Custo"
            type="number"
            value={formData.custo}
            onChange={(value) => onFormChange("custo", value)}
            icon="fa-dollar-sign"
            required
          />
          <FormField
            label="Preço Venda"
            type="number"
            value={formData.preco_venda}
            onChange={(value) => onFormChange("preco_venda", value)}
            icon="fa-tag"
            required
          />
          <FormField
            label={editingId ? "Saldo Total" : "Estoque Inicial"}
            type="number"
            value={formData.estoque_atual}
            onChange={(value) => onFormChange("estoque_atual", value)}
            icon="fa-warehouse"
            required
          />
        </div>
      </div>
    </Modal>
  );
};

export default ProductFormModal;
