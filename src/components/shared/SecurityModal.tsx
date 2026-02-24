import React, { useState } from "react";
import { useAlert } from "../../context/AlertSystem";

interface SecurityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const SecurityModal: React.FC<SecurityModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { showAlert } = useAlert();
  const [securityData, setSecurityData] = useState({ user: "", pass: "" });
  const [isAuthLoading, setIsAuthLoading] = useState(false);

  const handleSecurityAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAuthLoading(true);
    try {
      const result = await window.api.loginAttempt({
        username: securityData.user,
        password: securityData.pass,
      });

      if (result.success && result.user.cargo === "admin") {
        onSuccess();
        onClose();
        setSecurityData({ user: "", pass: "" });
      } else {
        showAlert(
          "Credenciais inválidas ou sem permissão de admin.",
          "Acesso Negado",
          "error"
        );
      }
    } catch (error) {
      showAlert("Erro ao validar permissão.", "Erro", "error");
    } finally {
      setIsAuthLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[60] animate-fade-in">
      <div className="bg-white rounded-xl shadow-2xl p-6 w-96 border-2 border-red-100">
        <h2 className="text-xl font-bold text-gray-800 mb-4 text-center flex flex-col items-center">
          <i className="fas fa-user-lock text-red-500 text-3xl mb-2"></i>
          Autorização Necessária
        </h2>
        <p className="text-sm text-gray-500 text-center mb-4">
          Esta ação requer permissão de um administrador.
        </p>
        <form onSubmit={handleSecurityAuth} className="space-y-4">
          <div className="bg-gray-50 p-3 rounded-lg">
            <input
              className="w-full border border-gray-300 rounded p-2 text-sm mb-2 outline-none focus:border-red-500"
              placeholder="Usuário Admin"
              value={securityData.user}
              onChange={(e) =>
                setSecurityData({ ...securityData, user: e.target.value })
              }
              disabled={isAuthLoading}
              autoFocus
            />
            <input
              type="password"
              className="w-full border border-gray-300 rounded p-2 text-sm outline-none focus:border-red-500"
              placeholder="Senha"
              value={securityData.pass}
              onChange={(e) =>
                setSecurityData({ ...securityData, pass: e.target.value })
              }
              disabled={isAuthLoading}
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isAuthLoading}
              className="flex-1 bg-gray-100 py-2 rounded-lg font-medium hover:bg-gray-200 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isAuthLoading}
              className="flex-1 bg-red-600 text-white py-2 rounded-lg font-bold hover:bg-red-700 transition shadow"
            >
              {isAuthLoading ? (
                <i className="fas fa-circle-notch fa-spin"></i>
              ) : (
                "AUTORIZAR"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SecurityModal;
