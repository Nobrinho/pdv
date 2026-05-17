import React from "react";

const QuickClientModal = ({
  newClientData,
  onClientFieldChange,
  onClose,
  onSubmit,
  isSavingClient = false,
}) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-surface-100 rounded-xl shadow-2xl p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4 text-surface-800 border-b pb-2 flex items-center">
          <i className="fas fa-user-plus mr-2 text-primary-600"></i> Novo Cliente Rápido
        </h2>
        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-surface-500 uppercase mb-1">
              Nome Completo *
            </label>
            <input
              className="w-full border border-surface-300 rounded p-2 focus:ring-2 focus:ring-primary-500 outline-none bg-surface-100 text-surface-800 border-surface-300 focus:ring-primary-500/20"
              value={newClientData.nome}
              onChange={(e) => onClientFieldChange("nome", e.target.value)}
              autoFocus
              required
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-surface-500 uppercase mb-1">
              CPF / Documento *
            </label>
            <input
              className="w-full border border-surface-300 rounded p-2 focus:ring-2 focus:ring-primary-500 outline-none bg-surface-100 text-surface-800 border-surface-300 focus:ring-primary-500/20"
              value={newClientData.documento}
              onChange={(e) => onClientFieldChange("documento", e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-surface-500 uppercase mb-1">
              Telefone / WhatsApp *
            </label>
            <input
              className="w-full border border-surface-300 rounded p-2 focus:ring-2 focus:ring-primary-500 outline-none bg-surface-100 text-surface-800 border-surface-300 focus:ring-primary-500/20"
              value={newClientData.telefone}
              onChange={(e) => onClientFieldChange("telefone", e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-surface-500 uppercase mb-1">
              Endereço (Opcional)
            </label>
            <input
              className="w-full border border-surface-300 rounded p-2 focus:ring-2 focus:ring-primary-500 outline-none bg-surface-100 text-surface-800 border-surface-300 focus:ring-primary-500/20"
              value={newClientData.endereco}
              onChange={(e) => onClientFieldChange("endereco", e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2 mt-4 pt-2 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-surface-200 rounded text-surface-800 hover:bg-surface-300 font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSavingClient}
              className={`px-4 py-2 rounded font-bold shadow-md ${isSavingClient ? "bg-surface-400 text-white cursor-not-allowed" : "bg-primary-600 text-white hover:bg-primary-700"}`}
            >
              {isSavingClient ? "SALVANDO..." : "Salvar e Selecionar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default QuickClientModal;
