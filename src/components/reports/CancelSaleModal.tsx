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
      return showAlert("O motivo deve ter no mínimo 10 caracteres.", "Motivo Inválido", "warning");
    }
    if (!adminUser || !adminPass) {
      return showAlert("Preencha as credenciais do administrador.", "Autenticação", "warning");
    }

    setIsSubmitting(true);
    try {
      await onConfirm(sale.id, reason, adminUser, adminPass);
      setReason("");
      setAdminUser("");
      setAdminPass("");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[60] p-4 animate-fade-in backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm border-t-8 border-red-600">
        <h2 className="text-xl font-bold text-red-700 mb-1 flex items-center">
          <i className="fas fa-exclamation-triangle mr-2"></i> Cancelar Venda #{sale.id}
        </h2>
        <p className="text-xs text-gray-500 mb-4 font-medium uppercase">Autorização Administrativa Necessária</p>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Motivo do Cancelamento</label>
            <textarea
              className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-red-500 outline-none transition"
              rows={3}
              placeholder="Descreva o motivo (erro técnico, desistência, etc)..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              autoFocus
            ></textarea>
          </div>

          <div className="bg-red-50 p-4 rounded-xl border border-red-100 flex flex-col gap-2">
            <input
              className="w-full border border-red-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-red-500 outline-none"
              placeholder="Usuário Admin"
              value={adminUser}
              onChange={(e) => setAdminUser(e.target.value)}
              required
            />
            <input
              type="password"
              className="w-full border border-red-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-red-500 outline-none"
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
              className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-200 transition"
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
