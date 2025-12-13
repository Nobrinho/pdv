// @ts-nocheck
import React, { useState, useEffect } from "react";

const Config = () => {
  const [roles, setRoles] = useState([]);
  const [newRole, setNewRole] = useState("");
  const [defaultCommission, setDefaultCommission] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const rolesData = await window.api.getRoles();
    const configData = await window.api.getConfig("comissao_padrao");

    setRoles(rolesData);
    // Converte de decimal (0.30) para porcentagem (30) para exibir
    if (configData) {
      setDefaultCommission((parseFloat(configData) * 100).toString());
    }
  };

  // --- Lógica de Comissão ---
  const handleSaveCommission = async () => {
    setIsLoading(true);
    // Converte de porcentagem (30) para decimal (0.30) para salvar
    const valueToSave = parseFloat(defaultCommission) / 100;

    const result = await window.api.saveConfig("comissao_padrao", valueToSave);

    if (result.success) {
      alert("Comissão padrão atualizada com sucesso!");
    } else {
      alert("Erro ao salvar: " + result.error);
    }
    setIsLoading(false);
  };

  // --- Lógica de Cargos ---
  const handleAddRole = async (e) => {
    e.preventDefault();
    if (!newRole.trim()) return;

    const result = await window.api.saveRole(newRole.trim());
    if (result.success) {
      setNewRole("");
      loadData();
    } else {
      alert("Erro ao criar cargo: " + result.error);
    }
  };

  const handleDeleteRole = async (id) => {
    if (confirm("Tem a certeza que deseja excluir este cargo?")) {
      const result = await window.api.deleteRole(id);
      if (result.success) {
        loadData();
      } else {
        alert("Erro: " + result.error);
      }
    }
  };

  return (
    <div className="p-6 h-full flex flex-col overflow-y-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">
        Configurações do Sistema
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card Comissão */}
        <div className="bg-white p-6 rounded-xl shadow-md h-fit">
          <h2 className="text-lg font-bold mb-4 text-gray-700 flex items-center border-b pb-2">
            <i className="fas fa-percent text-blue-500 mr-2"></i> Comissão
            Padrão
          </h2>
          <p className="text-sm text-gray-500 mb-4">
            Defina a porcentagem padrão de comissão para vendedores que não
            possuem uma taxa individual configurada.
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
              {isLoading ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </div>

        {/* Card Cargos */}
        <div className="bg-white p-6 rounded-xl shadow-md h-fit">
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
              className="bg-green-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-green-700 transition flex items-center shadow-sm"
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
                  <i className="fas fa-trash">Deletar</i>
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
