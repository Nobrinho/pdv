import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAlert } from "../../context/AlertSystem";

const clientSchema = z.object({
  nome: z.string().min(3, "Mínimo 3 caracteres"),
  documento: z.string().min(5, "Documento inválido"),
  telefone: z.string().min(8, "Telefone inválido"),
  endereco: z.string().optional(),
});

type ClientFormData = z.infer<typeof clientSchema>;

interface NewClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (clientData: any) => Promise<{ success: boolean; error?: string }>;
}

const NewClientModal: React.FC<NewClientModalProps> = ({
  isOpen,
  onClose,
  onSave,
}) => {
  const { showAlert } = useAlert();
  
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ClientFormData>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      nome: "",
      documento: "",
      telefone: "",
      endereco: "",
    },
  });

  if (!isOpen) return null;

  const onSubmit = async (data: ClientFormData) => {
    try {
      const result = await onSave(data);
      if (result.success) {
        reset();
        onClose();
      } else {
        showAlert("Erro ao salvar: " + result.error, "Erro", "error");
      }
    } catch (err) {
      console.error(err);
      showAlert("Erro técnico ao salvar cliente.", "Erro", "error");
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-[70] animate-fade-in backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl p-6 w-full max-w-md transform transition-all scale-100">
        <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-slate-100 border-b pb-2 flex items-center justify-between">
          <span>Cadastrar Novo Cliente</span>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:text-slate-300">
            <i className="fas fa-times"></i>
          </button>
        </h2>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase mb-1">
              Nome Completo
            </label>
            <input
              {...register("nome")}
              className={`w-full border rounded-lg p-2.5 outline-none transition ${errors.nome ? 'border-red-500 bg-red-50' : 'border-gray-300 dark:border-slate-700 focus:ring-2 focus:ring-blue-500'}`}
              placeholder="Ex: João Silva"
              autoFocus
            />
            {errors.nome && <p className="text-red-500 text-[10px] mt-1">{errors.nome.message}</p>}
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase mb-1">
                CPF / CNPJ
              </label>
              <input
                {...register("documento")}
                className={`w-full border rounded-lg p-2.5 outline-none transition ${errors.documento ? 'border-red-500 bg-red-50' : 'border-gray-300 dark:border-slate-700 focus:ring-2 focus:ring-blue-500'}`}
                placeholder="000.000.000-00"
              />
              {errors.documento && <p className="text-red-500 text-[10px] mt-1">{errors.documento.message}</p>}
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase mb-1">
                Telefone
              </label>
              <input
                {...register("telefone")}
                className={`w-full border rounded-lg p-2.5 outline-none transition ${errors.telefone ? 'border-red-500 bg-red-50' : 'border-gray-300 dark:border-slate-700 focus:ring-2 focus:ring-blue-500'}`}
                placeholder="(00) 00000-0000"
              />
              {errors.telefone && <p className="text-red-500 text-[10px] mt-1">{errors.telefone.message}</p>}
            </div>
          </div>
          
          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase mb-1">
              Endereço
            </label>
            <input
              {...register("endereco")}
              className={`w-full border border-gray-300 dark:border-slate-700 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500 transition`}
              placeholder="Rua, Número, Bairro"
            />
          </div>
          
          <div className="flex gap-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 bg-gray-100 dark:bg-slate-800/50 py-3 rounded-xl font-medium hover:bg-gray-200 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition shadow-lg shadow-blue-200"
            >
              {isSubmitting ? (
                <i className="fas fa-circle-notch fa-spin"></i>
              ) : (
                "SALVAR CLIENTE"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewClientModal;
