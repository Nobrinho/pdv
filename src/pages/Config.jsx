// @ts-nocheck
import React, { useState, useEffect } from "react";
import { useAlert } from "../context/AlertSystem";


const Config = () => {
  const [roles, setRoles] = useState([]);
  const [newRole, setNewRole] = useState("");
  const [defaultCommission, setDefaultCommission] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { showAlert, showConfirm } = useAlert();


  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const rolesData = await window.api.getRoles();
    const configData = await window.api.getConfig("comissao_padrao");

    setRoles(rolesData);
    if (configData) {
      setDefaultCommission((parseFloat(configData) * 100).toString());
    }
  };

  const handleSaveCommission = async () => {
    setIsLoading(true);
    const valueToSave = parseFloat(defaultCommission) / 100;
    const result = await window.api.saveConfig("comissao_padrao", valueToSave);
    if (result.success) {
      showAlert("Comissão padrão atualizada com sucesso!", "Sucesso", "success");
    } else {
      showAlert("Erro ao salvar: " + result.error);
    }
    setIsLoading(false);
  };

  const handleAddRole = async (e) => {
    e.preventDefault();
    if (!newRole.trim()) return;
    const result = await window.api.saveRole(newRole.trim());
    if (result.success) {
      setNewRole("");
      loadData();
    } else {
      showAlert("Erro ao criar cargo: " + result.error);
    }
  };

  const handleDeleteRole = async (id) => {
    if (showConfirm("Tem a certeza que deseja excluir este cargo?")) {
      const result = await window.api.deleteRole(id);
      if (result.success) loadData();
      else showAlert("Erro: " + result.error);
    }
  };

  const handleBackup = async () => {
    const result = await window.api.backupDatabase();
    if (result.success) {
      showAlert("Backup realizado com sucesso!");
    } else if (result.message && result.message !== "Backup cancelado.") {
      showAlert("Erro: " + (result.error || result.message));
    }
  };

  // --- Nova Função de Restaurar ---
  const handleRestore = async () => {
    // A confirmação real já é feita pelo backend com dialog nativo
    await window.api.restoreDatabase();
  };

  return (
    <div className="p-6 h-full flex flex-col overflow-y-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">
        Configurações do Sistema
      </h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card Comissão */}
        <div className="bg-white p-6 rounded-xl shadow-md h-fit border-l-4 border-blue-500">
          <h2 className="text-lg font-bold mb-4 text-gray-700 flex items-center border-b pb-2">
            <i className="fas fa-percent text-blue-500 mr-2"></i> Comissão
            Padrão
          </h2>
          <p className="text-sm text-gray-500 mb-4">
            Taxa padrão para vendedores sem configuração individual.
          </p>
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                Porcentagem (%)
              </label>
              <div className="relative">
                <input
                  type="number"
                  className="w-full border border-gray-300 rounded-lg p-2.5 pr-8 text-lg font-bold text-gray-800 focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Ex: 30"
                  value={defaultCommission}
                  onChange={(e) => setDefaultCommission(e.target.value)}
                />
                <span className="absolute right-3 top-3 text-gray-400 font-bold">
                  %
                </span>
              </div>
            </div>
            <button
              onClick={handleSaveCommission}
              disabled={isLoading}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-blue-700 transition shadow-md disabled:opacity-50 h-[46px] flex items-center justify-center min-w-[100px]"
            >
              {isLoading ? "..." : "Salvar"}
            </button>
          </div>
        </div>

        {/* Card Backup e Dados */}
        <div className="bg-white p-6 rounded-xl shadow-md h-fit border-l-4 border-green-500">
          <h2 className="text-lg font-bold mb-4 text-gray-700 flex items-center border-b pb-2">
            <i className="fas fa-database text-green-500 mr-2"></i> Segurança de
            Dados
          </h2>
          <p className="text-sm text-gray-500 mb-6">
            Faça backup ou restaure os dados do sistema. A restauração
            reiniciará o aplicativo.
          </p>
          <div className="flex flex-col gap-3">
            <button
              onClick={handleBackup}
              className="w-full bg-green-600 text-white py-3 rounded-lg font-bold hover:bg-green-700 transition shadow-md flex items-center justify-center gap-3"
            >
              <i className="fas fa-download"></i> FAZER BACKUP
            </button>

            <button
              onClick={handleRestore}
              className="w-full bg-white border-2 border-orange-500 text-orange-600 py-3 rounded-lg font-bold hover:bg-orange-50 transition shadow-sm flex items-center justify-center gap-3"
            >
              <i className="fas fa-upload"></i> RESTAURAR DADOS
            </button>
          </div>
        </div>

        {/* Card Cargos */}
        <div className="bg-white p-6 rounded-xl shadow-md h-fit md:col-span-2 border-l-4 border-purple-500">
          <h2 className="text-lg font-bold mb-4 text-gray-700 flex items-center border-b pb-2">
            <i className="fas fa-id-badge text-purple-500 mr-2"></i> Gerenciar
            Cargos
          </h2>

          <form onSubmit={handleAddRole} className="flex gap-2 mb-4">
            <input
              type="text"
              className="flex-1 border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
              placeholder="Nome do novo cargo..."
              value={newRole}
              onChange={(e) => setNewRole(e.target.value)}
            />
            <button
              type="submit"
              className="bg-purple-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-purple-700 transition flex items-center shadow-sm"
            >
              <i className="fas fa-plus mr-1"></i> Adicionar
            </button>
          </form>

          <div className="space-y-2 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
            {roles.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-4">
                Nenhum cargo cadastrado.
              </p>
            )}

            {roles.map((role) => (
              <div
                key={role.id}
                className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-200 hover:border-purple-200 transition group"
              >
                <span className="font-medium text-gray-700">{role.nome}</span>
                <button
                  onClick={() => handleDeleteRole(role.id)}
                  className="text-red-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-full transition"
                  title="Excluir cargo"
                >
                  <i className="fas fa-trash"></i>
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Config;
