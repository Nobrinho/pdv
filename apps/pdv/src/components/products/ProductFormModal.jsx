import React from "react";
import FormField from "../ui/FormField";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import { Radio } from "../ui/Checkbox";

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
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" icon="fa-save" loading={isSaving} onClick={onSubmit}>
            {isSaving ? "Salvando..." : editingId ? "Atualizar" : "Salvar"}
          </Button>
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
              <Radio
                name="tipo"
                value="novo"
                checked={formData.tipo === "novo"}
                onChange={(e) => onFormChange("tipo", e.target.value)}
                className="mr-3 h-5 w-5"
              />
              <span className={`text-sm font-bold ${formData.tipo === "novo" ? "text-primary-700" : "text-surface-500 group-hover:text-surface-800"}`}>
                Novo (Peça)
              </span>
            </label>
            <label className="flex items-center cursor-pointer group">
              <Radio
                name="tipo"
                value="usado"
                checked={formData.tipo === "usado"}
                onChange={(e) => onFormChange("tipo", e.target.value)}
                className="mr-3 h-5 w-5"
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
