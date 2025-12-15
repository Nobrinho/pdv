// @ts-nocheck
import React, { useState, useEffect } from "react";
import { useAlert } from "../context/AlertSystem"; // Importar Hook

const Pessoas = () => {
  const { showAlert, showConfirm } = useAlert(); // Usar Hook
  const [people, setPeople] = useState([]);
  const [roles, setRoles] = useState([]);
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
    const peopleData = await window.api.getPeople();
    const rolesData = await window.api.getRoles();
    setPeople(peopleData);
    setRoles(rolesData);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const personToSave = {
      ...formData,
      cargo_id: parseInt(formData.cargo_id),
      comissao_fixa: formData.comissao_fixa
        ? parseFloat(formData.comissao_fixa)
        : null,
    };

    if (editingId) personToSave.id = editingId;

    await window.api.savePerson(personToSave);
    setShowModal(false);
    resetForm();
    loadData();
    showAlert("Colaborador salvo com sucesso!", "Sucesso", "success");
  };

  const handleDelete = async (id) => {
    const confirmou = await showConfirm(
      "Tem a certeza que deseja excluir este colaborador?"
    );
    if (confirmou) {
      await window.api.deletePerson(id);
      loadData();
      showAlert("Colaborador removido.", "Sucesso", "success");
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

  return (
    <div className="p-6 h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Equipe (Pessoas)</h1>
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition flex items-center"
        >
          <i className="fas fa-user-plus mr-2"></i> Adicionar Pessoa
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-md overflow-hidden flex-1 overflow-y-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Nome
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Cargo
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                Comissão
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {people.map((p) => (
              <tr key={p.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {p.nome}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-semibold ${
                      p.cargo_nome === "Vendedor"
                        ? "bg-blue-100 text-blue-800"
                        : "bg-orange-100 text-orange-800"
                    }`}
                  >
                    {p.cargo_nome}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">
                  {p.comissao_fixa ? (
                    `${p.comissao_fixa}%`
                  ) : (
                    <span className="text-gray-400 italic">Padrão</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                  <button
                    onClick={() => handleEdit(p)}
                    className="text-blue-600 hover:text-blue-900 mr-4"
                  >
                    <i className="fas fa-edit"></i>
                  </button>
                  <button
                    onClick={() => handleDelete(p.id)}
                    className="text-red-600 hover:text-red-900"
                  >
                    <i className="fas fa-trash"></i>
                  </button>
                </td>
              </tr>
            ))}
            {people.length === 0 && (
              <tr>
                <td
                  colSpan="4"
                  className="px-6 py-10 text-center text-gray-500"
                >
                  Nenhuma pessoa cadastrada.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal de Formulário */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4 text-gray-800 border-b pb-2">
              {editingId ? "Editar" : "Adicionar"} Pessoa
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Nome
                </label>
                <input
                  className="mt-1 block w-full border border-gray-300 rounded-lg p-2 outline-none focus:ring-2 focus:ring-blue-500"
                  value={formData.nome}
                  onChange={(e) =>
                    setFormData({ ...formData, nome: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Cargo
                </label>
                <select
                  className="mt-1 block w-full border border-gray-300 rounded-lg p-2 bg-white outline-none focus:ring-2 focus:ring-blue-500"
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
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Comissão Individual (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  className="mt-1 block w-full border border-gray-300 rounded-lg p-2 outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Opcional"
                  value={formData.comissao_fixa}
                  onChange={(e) =>
                    setFormData({ ...formData, comissao_fixa: e.target.value })
                  }
                />
              </div>
              <div className="flex justify-end gap-3 mt-6 border-t pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-bold"
                >
                  Salvar
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
