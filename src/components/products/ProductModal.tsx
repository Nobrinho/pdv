import React, { useEffect } from "react";
import { Product } from "../../types";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

const productSchema = z.object({
  codigo: z.string().min(1, "Obrigatório"),
  descricao: z.string().min(3, "Mínimo 3 caracteres"),
  custo: z.coerce.number().min(0, "Inválido"),
  preco_venda: z.coerce.number().min(0, "Inválido"),
  estoque_atual: z.coerce.number().int().min(0, "Inválido"),
  tipo: z.enum(["novo", "usado"]),
});

type ProductFormData = z.infer<typeof productSchema>;

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (product: any) => Promise<{ success: boolean; error?: string }>;
  editingProduct: Product | null;
}

const ProductModal: React.FC<ProductModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingProduct,
}) => {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema) as any,
  });

  useEffect(() => {
    if (isOpen) {
      if (editingProduct) {
        reset({
          codigo: editingProduct.codigo,
          descricao: editingProduct.descricao,
          custo: editingProduct.custo,
          preco_venda: editingProduct.preco_venda,
          estoque_atual: editingProduct.estoque_atual,
          tipo: (editingProduct.tipo as "novo" | "usado") || "novo",
        });
      } else {
        reset({
          codigo: "",
          descricao: "",
          custo: 0,
          preco_venda: 0,
          estoque_atual: 0,
          tipo: "novo",
        });
      }
    }
  }, [editingProduct, isOpen, reset]);

  if (!isOpen) return null;

  const onSubmit = async (data: ProductFormData) => {
    const productToSave: any = { ...data };
    if (editingProduct?.id) productToSave.id = editingProduct.id;

    const result = await onSave(productToSave);
    if (result.success) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50 animate-fade-in backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl p-6 w-full max-w-md transform transition-all scale-100 max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-slate-100 border-b pb-2 flex items-center justify-between">
          <span>{editingProduct ? "Editar Produto" : "Cadastrar Produto"}</span>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:text-slate-400">
            <i className="fas fa-times"></i>
          </button>
        </h2>
        <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-4">
          <div className="bg-gray-50 dark:bg-slate-800/50 p-3 rounded-lg border border-gray-200 dark:border-slate-800">
            <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase mb-1">
              Tipo de Produto
            </label>
            <div className="flex gap-4">
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  {...register("tipo")}
                  value="novo"
                  className="mr-2 w-4 h-4 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700 dark:text-slate-300">Novo (Peça)</span>
              </label>
              <label className="flex items-center cursor-pointer">
                <input
                  type="radio"
                  {...register("tipo")}
                  value="usado"
                  className="mr-2 w-4 h-4 text-orange-600 focus:ring-orange-500"
                />
                <span className="text-sm font-medium text-gray-700 dark:text-slate-300">Usado (Desmonte)</span>
              </label>
            </div>
            {errors.tipo && <p className="text-red-500 text-[10px] mt-1">{errors.tipo.message}</p>}
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase mb-1">Código</label>
            <input
              {...register("codigo")}
              className={`block w-full border rounded-lg p-2.5 outline-none transition ${errors.codigo ? 'border-red-500 bg-red-50 dark:bg-red-900/20 text-red-900 dark:text-red-200' : 'border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500'}`}
              placeholder="Ex: 12345"
              autoFocus
            />
            {errors.codigo && <p className="text-red-500 text-[10px] mt-1">{errors.codigo.message}</p>}
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase mb-1">Descrição</label>
            <input
              {...register("descricao")}
              className={`block w-full border rounded-lg p-2.5 outline-none transition ${errors.descricao ? 'border-red-500 bg-red-50 dark:bg-red-900/20 text-red-900 dark:text-red-200' : 'border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500'}`}
              placeholder="Ex: Óleo de Motor 1L"
            />
            {errors.descricao && <p className="text-red-500 text-[10px] mt-1">{errors.descricao.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase mb-1">Preço Custo</label>
              <input
                type="number"
                step="0.01"
                {...register("custo")}
                className={`block w-full border rounded-lg p-2.5 outline-none transition ${errors.custo ? 'border-red-500 bg-red-50 dark:bg-red-900/20 text-red-900 dark:text-red-200' : 'border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500'}`}
              />
              {errors.custo && <p className="text-red-500 text-[10px] mt-1">{errors.custo.message}</p>}
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase mb-1">Preço Venda</label>
              <input
                type="number"
                step="0.01"
                {...register("preco_venda")}
                className={`block w-full border rounded-lg p-2.5 outline-none transition ${errors.preco_venda ? 'border-red-500 bg-red-50 dark:bg-red-900/20 text-red-900 dark:text-red-200' : 'border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500'}`}
              />
              {errors.preco_venda && <p className="text-red-500 text-[10px] mt-1">{errors.preco_venda.message}</p>}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase mb-1">
              {editingProduct ? "Ajustar Estoque Total" : "Estoque Inicial"}
            </label>
            <input
              type="number"
              {...register("estoque_atual")}
              className={`block w-full border rounded-lg p-2.5 outline-none transition ${errors.estoque_atual ? 'border-red-500 bg-red-50 dark:bg-red-900/20 text-red-900 dark:text-red-200' : 'border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500'}`}
            />
            {errors.estoque_atual && <p className="text-red-500 text-[10px] mt-1">{errors.estoque_atual.message}</p>}
          </div>

          <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-gray-100 dark:bg-slate-800/80 text-gray-700 dark:text-slate-300 rounded-lg hover:bg-gray-200 transition font-medium text-sm"
              disabled={isSubmitting}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-bold text-sm shadow-md"
            >
              {isSubmitting ? <i className="fas fa-circle-notch fa-spin"></i> : "Salvar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProductModal;
