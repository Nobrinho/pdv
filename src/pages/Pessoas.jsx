// @ts-nocheck
import React, { useState, useEffect, useMemo } from "react";
import { useAlert } from "../context/AlertSystem";

const Pessoas = () => {
  const { showAlert, showConfirm } = useAlert();

  const [people, setPeople] = useState([]);
  const [roles, setRoles] = useState([]);
  const [defaultCommission, setDefaultCommission] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    nome: "",
    cargo_id: "",
    comissao_fixa: "",
  });
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const peopleData = await window.api.getPeople();
      const rolesData = await window.api.getRoles();
      const configData = await window.api.getConfig("comissao_padrao"); // Busca a config

      setPeople(peopleData);
      setRoles(rolesData);

      if (configData) {
        setDefaultCommission(parseFloat(configData) * 100);
      }
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    }
  };

  // --- AGRUPAMENTO POR CARGO ---
  const peopleByRole = useMemo(() => {
    const groups = {};

    people.forEach((person) => {
      const cargo = person.cargo_nome || "Sem Cargo";
      if (!groups[cargo]) groups[cargo] = [];
      groups[cargo].push(person);
    });

    const orderedKeys = Object.keys(groups).sort((a, b) => {
      if (a === "Vendedor") return -1;
      if (b === "Vendedor") return 1;
      if (a === "Trocador") return -1;
      if (b === "Trocador") return 1;
      return a.localeCompare(b);
    });

    return orderedKeys.map((key) => ({
      role: key,
      list: groups[key],
    }));
  }, [people]);

  // --- LÓGICA DO MODAL ---
  const selectedRoleName = useMemo(() => {
    if (!formData.cargo_id) return "";
    const role = roles.find((r) => r.id === parseInt(formData.cargo_id));
    return role ? role.nome : "";
  }, [formData.cargo_id, roles]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const isVendedor = selectedRoleName === "Vendedor";

    const personToSave = {
      ...formData,
      cargo_id: parseInt(formData.cargo_id),
      comissao_fixa:
        isVendedor && formData.comissao_fixa
          ? parseFloat(formData.comissao_fixa)
          : null,
    };

    if (editingId) personToSave.id = editingId;

    const result = await window.api.savePerson(personToSave);

    if (result.success) {
      setShowModal(false);
      resetForm();
      loadData();
      showAlert("Colaborador salvo com sucesso!", "Sucesso", "success");
    } else {
      showAlert(result.error, "Erro", "error");
    }
  };

  const handleDelete = async (id) => {
    const confirmou = await showConfirm(
      "Tem a certeza que deseja excluir este colaborador?",
    );
    if (confirmou) {
      const result = await window.api.deletePerson(id);
      if (result.success) {
        loadData();
        showAlert("Colaborador removido.", "Sucesso", "success");
      } else {
        showAlert(result.error, "Erro", "error");
      }
    }
  };

  const handleEdit = (person) => {
    setFormData({
      nome: person.nome,
      cargo_id: person.cargo_id,
      comissao_fixa: person.comissao_fixa || "",
    });
    setEditingId(person.id);
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({ nome: "", cargo_id: "", comissao_fixa: "" });
    setEditingId(null);
  };

  const getRoleIcon = (roleName) => {
    switch (roleName) {
      case "Vendedor":
        return "fa-user-tie text-blue-500";
      case "Trocador":
        return "fa-wrench text-orange-500";
      default:
        return "fa-user text-gray-400";
    }
  };

  const getRoleColor = (roleName) => {
    switch (roleName) {
      case "Vendedor":
        return "border-l-4 border-blue-500";
      case "Trocador":
        return "border-l-4 border-orange-500";
      default:
        return "border-l-4 border-gray-300";
    }
  };

  return (
    <div className="p-6 h-full flex flex-col">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h1 className="text-2xl font-bold text-gray-800">Equipe (Pessoas)</h1>
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition flex items-center shadow-md text-sm sm:text-base whitespace-nowrap"
        >
          <i className="fas fa-user-plus mr-2"></i> Adicionar Pessoa
        </button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-6 pb-4 custom-scrollbar">
        {peopleByRole.length === 0 && (
          <div className="text-center py-20 text-gray-400 flex flex-col items-center">
            <i className="fas fa-users text-4xl mb-3 opacity-30"></i>
            <p>Nenhuma pessoa cadastrada.</p>
          </div>
        )}

        {peopleByRole.map((group) => (
          <div
            key={group.role}
            className={`bg-white rounded-xl shadow-md overflow-hidden ${getRoleColor(group.role)}`}
          >
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
              <i className={`fas ${getRoleIcon(group.role)} text-lg`}></i>
              <h2 className="text-lg font-bold text-gray-700">{group.role}</h2>
              <span className="ml-auto bg-white border px-2 py-0.5 rounded text-xs text-gray-500 font-bold shadow-sm">
                {group.list.length}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100">
                <thead className="bg-white">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">
                      Nome
                    </th>
                    {group.role === "Vendedor" && (
                      <th className="px-6 py-3 text-center text-xs font-bold text-gray-400 uppercase tracking-wider">
                        Comissão
                      </th>
                    )}
                    <th className="px-6 py-3 text-center text-xs font-bold text-gray-400 uppercase tracking-wider w-24">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {group.list.map((person) => (
                    <tr
                      key={person.id}
                      className="hover:bg-blue-50 transition-colors group"
                    >
                      <td className="px-6 py-3 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 font-bold text-xs mr-3">
                            {person.nome.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-sm font-medium text-gray-900">
                            {person.nome}
                          </span>
                        </div>
                      </td>

                      {/* COLUNA DE COMISSÃO MELHORADA */}
                      {group.role === "Vendedor" && (
                        <td className="px-6 py-3 whitespace-nowrap text-center text-sm">
                          {person.comissao_fixa ? (
                            <span
                              className="bg-green-100 text-green-800 py-1 px-3 rounded-full text-xs font-bold shadow-sm border border-green-200"
                              title="Taxa individual configurada"
                            >
                              {person.comissao_fixa}%
                            </span>
                          ) : (
                            <span
                              className="bg-gray-100 text-gray-600 py-1 px-3 rounded-full text-xs font-medium border border-gray-200"
                              title={`Taxa padrão do sistema: ${defaultCommission}%`}
                            >
                              {defaultCommission}% (Padrão)
                            </span>
                          )}
                        </td>
                      )}

                      <td className="px-6 py-3 whitespace-nowrap text-center text-sm font-medium">
                        <div className="flex justify-center gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleEdit(person)}
                            className="text-blue-500 hover:text-blue-700 bg-blue-50 p-1.5 rounded transition"
                            title="Editar"
                          >
                            <i className="fas fa-edit"></i>
                          </button>
                          <button
                            onClick={() => handleDelete(person.id)}
                            className="text-red-500 hover:text-red-700 bg-red-50 p-1.5 rounded transition"
                            title="Excluir"
                          >
                            <i className="fas fa-trash"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>

      {/* --- MODAL --- */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50 animate-fade-in backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md transform transition-all scale-100">
            <h2 className="text-xl font-bold mb-6 text-gray-800 border-b pb-4 flex justify-between items-center">
              <span>{editingId ? "Editar" : "Adicionar"} Pessoa</span>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 transition"
              >
                <i className="fas fa-times"></i>
              </button>
            </h2>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                  Nome Completo
                </label>
                <input
                  className="w-full border border-gray-300 rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500 transition"
                  value={formData.nome}
                  onChange={(e) =>
                    setFormData({ ...formData, nome: e.target.value })
                  }
                  required
                  autoFocus
                  placeholder="Ex: Maria Silva"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                  Cargo / Função
                </label>
                <div className="relative">
                  <select
                    className="w-full border border-gray-300 rounded-lg p-3 bg-white outline-none focus:ring-2 focus:ring-blue-500 transition appearance-none"
                    value={formData.cargo_id}
                    onChange={(e) =>
                      setFormData({ ...formData, cargo_id: e.target.value })
                    }
                    required
                  >
                    <option value="">Selecione...</option>
                    {roles.map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.nome}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                    <i className="fas fa-chevron-down text-xs"></i>
                  </div>
                </div>
              </div>

              {/* --- CAMPO CONDICIONAL: SÓ APARECE PARA VENDEDOR --- */}
              {selectedRoleName === "Vendedor" && (
                <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 animate-fade-in-down">
                  <label className="block text-xs font-bold text-blue-700 uppercase mb-1">
                    Comissão Individual (%){" "}
                    <span className="text-blue-400 font-normal ml-1">
                      (Opcional)
                    </span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      className="w-full border border-blue-200 rounded-lg p-2.5 pr-8 outline-none focus:ring-2 focus:ring-blue-500 transition text-blue-900 font-bold"
                      placeholder={defaultCommission.toString()}
                      value={formData.comissao_fixa}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          comissao_fixa: e.target.value,
                        })
                      }
                    />
                    <span className="absolute right-3 top-3 text-blue-400 font-bold">
                      %
                    </span>
                  </div>
                  <p className="text-[10px] text-blue-500 mt-1.5 leading-tight">
                    <i className="fas fa-info-circle mr-1"></i>
                    Deixe vazio para usar a taxa padrão ({defaultCommission}%).
                  </p>
                </div>
              )}

              <div className="flex justify-end gap-3 mt-8 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition font-medium text-sm"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-bold text-sm shadow-md flex items-center gap-2"
                >
                  <i className="fas fa-save"></i> Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Pessoas;
