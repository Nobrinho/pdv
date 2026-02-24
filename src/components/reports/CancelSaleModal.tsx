import React, { useState } from "react";
import { Sale } from "../../types";
import { useAlert } from "../../context/AlertSystem";

interface CancelSaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: Sale | null;
  onConfirm: (id: number, reason: string, adminUser: string, adminPass: string) => Promise<void>;
}

const CancelSaleModal: React.FC<CancelSaleModalProps> = ({
  isOpen,
  onClose,
  sale,
  onConfirm,
}) => {
  const { showAlert } = useAlert();
  const [reason, setReason] = useState("");
  const [adminUser, setAdminUser] = useState("");
  const [adminPass, setAdminPass] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !sale) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (reason.trim().length < 10) {
      return showAlert("O motivo deve ter no mínimo 10 caracteres.", "Motivo Inválido", "info");
    }
    if (!adminUser || !adminPass) {
      return showAlert("Preencha as credenciais do administrador.", "Autenticação", "info");
    }

    setIsSubmitting(true);
    try {
      await onConfirm(sale.id!, reason, adminUser, adminPass);
      setReason("");
      setAdminUser("");
      setAdminPass("");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[60] p-4 animate-fade-in backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl p-6 w-full max-w-sm border-t-8 border-red-600">
        <h2 className="text-xl font-bold text-red-700 mb-1 flex items-center">
          <i className="fas fa-exclamation-triangle mr-2"></i> Cancelar Venda #{sale.id}
        </h2>
        <p className="text-xs text-gray-500 dark:text-slate-400 mb-4 font-medium uppercase">Autorização Administrativa Necessária</p>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase mb-1">Motivo do Cancelamento</label>
            <textarea
              className="w-full border border-gray-300 dark:border-slate-700 rounded-lg p-3 text-sm focus:ring-2 focus:ring-red-500 outline-none transition bg-white dark:bg-slate-950 text-gray-900 dark:text-slate-100"
              rows={3}
              placeholder="Descreva o motivo (erro técnico, desistência, etc)..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              autoFocus
            ></textarea>
          </div>

          <div className="bg-red-50 dark:bg-red-900/10 p-4 rounded-xl border border-red-100 dark:border-red-900/30 flex flex-col gap-2">
            <input
              className="w-full border border-red-200 dark:border-red-800/50 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-red-500 outline-none bg-white dark:bg-slate-950 text-gray-900 dark:text-slate-100"
              placeholder="Usuário Admin"
              value={adminUser}
              onChange={(e) => setAdminUser(e.target.value)}
              required
            />
            <input
              type="password"
              className="w-full border border-red-200 dark:border-red-800/50 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-red-500 outline-none bg-white dark:bg-slate-950 text-gray-900 dark:text-slate-100"
              placeholder="Senha"
              value={adminPass}
              onChange={(e) => setAdminPass(e.target.value)}
              required
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-200 py-3 rounded-xl font-bold hover:bg-gray-200 dark:hover:bg-slate-700 transition"
            >
              Voltar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-red-600 text-white py-3 rounded-xl font-bold hover:bg-red-700 transition shadow-lg shadow-red-200"
            >
              {isSubmitting ? <i className="fas fa-circle-notch fa-spin"></i> : "CONFIRMAR"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CancelSaleModal;
