import React, { useState, useEffect, useMemo } from "react";
import { useAlert } from "../context/AlertSystem";
import { Person, Role } from "../types";

const Pessoas: React.FC = () => {
  const { showAlert, showConfirm } = useAlert();

  const [people, setPeople] = useState<Person[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [defaultCommission, setDefaultCommission] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    nome: "",
    cargo_id: "",
    comissao_fixa: "",
  });
  const [editingId, setEditingId] = useState<number | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const peopleData = await window.api.getPeople();
      const rolesData = await window.api.getRoles();
      const configData = await window.api.getConfig("comissao_padrao");

      setPeople(peopleData);
      setRoles(rolesData);

      if (configData) {
        setDefaultCommission(parseFloat(configData) * 100);
      }
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    }
  };

  // --- FILTRAGEM ---
  const filteredPeople = useMemo(() => {
    return people.filter((person) => {
      const term = searchTerm.toLowerCase();
      return (
        person.nome.toLowerCase().includes(term) ||
        (person.cargo_nome || "").toLowerCase().includes(term)
      );
    });
  }, [people, searchTerm]);

  // --- LÓGICA DO MODAL ---
  const selectedRoleName = useMemo(() => {
    if (!formData.cargo_id) return "";
    const role = roles.find((r) => r.id === parseInt(formData.cargo_id));
    return role ? role.nome : "";
  }, [formData.cargo_id, roles]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const isVendedor = selectedRoleName === "Vendedor";

    const personToSave: any = {
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

  const handleDelete = async (id: number) => {
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

  const handleEdit = (person: Person) => {
    setFormData({
      nome: person.nome,
      cargo_id: person.cargo_id!.toString(),
      comissao_fixa: person.comissao_fixa?.toString() || "",
    });
    setEditingId(person.id || null);
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({ nome: "", cargo_id: "", comissao_fixa: "" });
    setEditingId(null);
  };

  const getRoleIcon = (roleName: string) => {
    switch (roleName) {
      case "Vendedor":
        return "fa-user-tie text-blue-500";
      case "Trocador":
        return "fa-wrench text-orange-500";
      default:
        return "fa-user text-gray-400 dark:text-slate-500";
    }
  };

  const getRoleBadgeStyle = (roleName: string) => {
    switch (roleName) {
      case "Vendedor":
        return "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800";
      case "Trocador":
        return "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800";
      default:
        return "bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 border-gray-200 dark:border-slate-700";
    }
  };

  return (
    <div className="p-6 h-full flex flex-col">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-slate-100">Equipe</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400">Gerencie os colaboradores da sua oficina</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition flex items-center shadow-md text-sm sm:text-base whitespace-nowrap"
        >
          <i className="fas fa-user-plus mr-2"></i> Adicionar Colaborador
        </button>
      </div>

      <div className="mb-6">
        <div className="relative max-w-md">
          <i className="fas fa-search absolute left-3 top-3.5 text-gray-400 dark:text-slate-500"></i>
          <input
            type="text"
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl shadow-sm outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-slate-100 transition-all"
            placeholder="Buscar por nome ou cargo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="flex-1 overflow-hidden bg-white dark:bg-slate-900 rounded-2xl shadow-lg border border-gray-100 dark:border-slate-800 flex flex-col">
        <div className="overflow-y-auto flex-1 custom-scrollbar">
          <table className="min-w-full divide-y divide-gray-100 dark:divide-slate-800">
            <thead className="bg-gray-50 dark:bg-slate-950 sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                  Colaborador
                </th>
                <th className="px-6 py-4 text-center text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                  Cargo
                </th>
                <th className="px-6 py-4 text-center text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                  Comissão
                </th>
                <th className="px-6 py-4 text-center text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider w-24">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-slate-800 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100">
              {filteredPeople.map((person) => (
                <tr
                  key={person.id}
                  className="hover:bg-blue-50 dark:hover:bg-slate-800/50 transition-colors group"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-slate-800 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-sm mr-3 border border-blue-100 dark:border-slate-700">
                        {person.nome.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-sm font-semibold">
                        {person.nome}
                      </span>
                    </div>
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${getRoleBadgeStyle(person.cargo_nome || "")}`}>
                      <i className={`fas ${getRoleIcon(person.cargo_nome || "")} text-[10px]`}></i>
                      {person.cargo_nome}
                    </span>
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm">
                    {person.cargo_nome === "Vendedor" ? (
                      person.comissao_fixa ? (
                        <span className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 py-1 px-3 rounded-full text-xs font-bold shadow-sm border border-green-200 dark:border-green-800">
                          {person.comissao_fixa}%
                        </span>
                      ) : (
                        <span className="text-gray-400 dark:text-slate-500 italic text-xs">
                          Padrão ({defaultCommission}%)
                        </span>
                      )
                    ) : (
                      <span className="text-gray-300 dark:text-slate-700">—</span>
                    )}
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                    <div className="flex justify-center gap-2">
                      <button
                        onClick={() => handleEdit(person)}
                        className="text-blue-500 hover:text-blue-700 bg-blue-50 dark:bg-slate-800 p-2 rounded-lg transition"
                        title="Editar"
                      >
                        <i className="fas fa-edit"></i>
                      </button>
                      <button
                        onClick={() => { if(person.id) handleDelete(person.id); }}
                        className="text-red-500 hover:text-red-700 bg-red-50 dark:bg-slate-800 p-2 rounded-lg transition"
                        title="Excluir"
                      >
                        <i className="fas fa-trash"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredPeople.length === 0 && (
                <tr>
                  <td colSpan={4} className="text-center py-20 text-gray-400 dark:text-slate-500">
                    <i className="fas fa-users text-4xl mb-3 opacity-20"></i>
                    <p>Nenhum colaborador encontrado.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50 animate-fade-in backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl p-6 w-full max-w-md transform transition-all scale-100">
            <h2 className="text-xl font-bold mb-6 text-gray-800 dark:text-slate-100 border-b pb-4 flex justify-between items-center">
              <span>{editingId ? "Editar" : "Adicionar"} Pessoa</span>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:text-slate-400 transition"
              >
                <i className="fas fa-times"></i>
              </button>
            </h2>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase mb-1">
                  Nome Completo
                </label>
                <input
                  className="w-full border border-gray-300 dark:border-slate-700 rounded-lg p-3 outline-none focus:ring-2 focus:ring-blue-500 transition bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
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
                <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase mb-1">
                  Cargo / Função
                </label>
                <div className="relative">
                  <select
                    className="w-full border border-gray-300 dark:border-slate-700 rounded-lg p-3 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500 transition appearance-none"
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
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700 dark:text-slate-300">
                    <i className="fas fa-chevron-down text-xs"></i>
                  </div>
                </div>
              </div>

              {selectedRoleName === "Vendedor" && (
                <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-100 dark:border-blue-800 animate-fade-in-down">
                  <label className="block text-xs font-bold text-blue-700 dark:text-blue-300 uppercase mb-1">
                    Comissão Individual (%) <span className="text-blue-400 dark:text-blue-500 font-normal ml-1">(Opcional)</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      className="w-full border border-blue-200 dark:border-blue-900/30 rounded-lg p-2.5 pr-8 outline-none focus:ring-2 focus:ring-blue-500 transition bg-white dark:bg-slate-800 text-blue-900 dark:text-blue-400 font-bold"
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
                  <p className="text-[10px] text-blue-500 dark:text-blue-400 mt-1.5 leading-tight">
                    <i className="fas fa-info-circle mr-1"></i>
                    Deixe vazio para usar a taxa padrão ({defaultCommission}%).
                  </p>
                </div>
              )}

              <div className="flex justify-end gap-3 mt-8 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-5 py-2.5 bg-gray-100 dark:bg-slate-800/80 text-gray-700 dark:text-slate-300 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-700/80 transition font-medium text-sm"
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
