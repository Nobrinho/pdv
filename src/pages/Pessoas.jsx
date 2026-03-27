// @ts-nocheck
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useAlert } from "../context/AlertSystem";
import { api } from "../services/api";
import DataTable from "../components/ui/DataTable";
import StatusBadge from "../components/ui/StatusBadge";
import FormField from "../components/ui/FormField";
import Modal from "../components/ui/Modal";

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
  const [loading, setLoading] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [peopleData, rolesData, configData] = await Promise.all([
        api.people.list(),
        api.auth.getRoles(),
        api.config.get("comissao_padrao")
      ]);

      setPeople(peopleData);
      setRoles(rolesData);

      if (configData) {
        setDefaultCommission(parseFloat(configData) * 100);
      }
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      showAlert("Falha ao carregar colaboradores.", "Erro", "error");
    } finally {
      setLoading(false);
    }
  }, [showAlert]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const selectedRoleName = useMemo(() => {
    if (!formData.cargo_id) return "";
    const role = roles.find((r) => r.id === parseInt(formData.cargo_id));
    return role ? role.nome : "";
  }, [formData.cargo_id, roles]);

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();

    const isVendedor = selectedRoleName === "Vendedor";

    const personToSave = {
      ...formData,
      cargo_id: parseInt(formData.cargo_id),
      comissao_fixa: isVendedor && formData.comissao_fixa ? parseFloat(formData.comissao_fixa) : null,
    };

    if (editingId) personToSave.id = editingId;

    try {
      const result = await api.people.save(personToSave);
      if (result.success) {
        setShowModal(false);
        setFormData({ nome: "", cargo_id: "", comissao_fixa: "" });
        setEditingId(null);
        loadData();
        showAlert("Colaborador salvo com sucesso!", "Sucesso", "success");
      } else {
        showAlert(result.error, "Erro", "error");
      }
    } catch (error) {
      showAlert("Erro técnico ao salvar colaborador.", "Erro", "error");
    }
  };

  const handleDelete = async (id) => {
    const confirmou = await showConfirm("Tem a certeza que deseja excluir este colaborador?");
    if (confirmou) {
      try {
        const result = await api.people.delete(id);
        if (result.success) {
          loadData();
          showAlert("Colaborador removido.", "Sucesso", "success");
        } else {
          showAlert(result.error, "Erro", "error");
        }
      } catch (error) {
        showAlert("Erro técnico ao remover colaborador.", "Erro", "error");
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
      return a.localeCompare(b);
    });

    return orderedKeys.map((key) => ({
      role: key,
      list: groups[key],
    }));
  }, [people]);

  const getColumns = (roleName) => [
    { 
      key: "nome", 
      label: "Nome do Colaborador", 
      format: (v) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-black text-xs uppercase border border-blue-100 shadow-sm">
            {v.charAt(0)}
          </div>
          <span className="font-bold text-gray-800">{v}</span>
        </div>
      )
    },
    ...(roleName === "Vendedor" ? [{
      key: "comissao_fixa",
      label: "Taxa de Comissão",
      align: "center",
      format: (v) => v 
        ? <StatusBadge type="success" label={`${v}% (Individual)`} /> 
        : <StatusBadge type="secondary" label={`${defaultCommission}% (Sistema)`} />
    }] : []),
    {
      key: "actions",
      label: "Ações",
      align: "center",
      format: (_, row) => (
        <div className="flex justify-center gap-1">
          <button onClick={() => handleEdit(row)} className="p-2 text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"><i className="fas fa-edit"></i></button>
          <button onClick={() => handleDelete(row.id)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"><i className="fas fa-trash"></i></button>
        </div>
      )
    }
  ];

  return (
    <div className="p-4 md:p-6 h-full flex flex-col bg-gray-50 overflow-hidden">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-gray-800 tracking-tight">Gestão da Equipe</h1>
          <p className="text-xs text-gray-500 mt-1 uppercase tracking-widest font-bold opacity-70">Controle de comissões e cargos</p>
        </div>
        <button
          onClick={() => { setEditingId(null); setFormData({ nome: "", cargo_id: "", comissao_fixa: "" }); setShowModal(true); }}
          className="bg-blue-600 text-white px-5 py-2.5 rounded-xl font-black text-[11px] uppercase tracking-widest hover:bg-blue-700 transition shadow-lg active:scale-95 flex items-center gap-2"
        >
          <i className="fas fa-plus"></i> Novo Colaborador
        </button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-8 pr-1 custom-scrollbar pb-10">
        {peopleByRole.map((group) => (
          <div key={group.role} className="flex flex-col gap-3">
             <div className="flex items-center gap-3 ml-2">
                <div className={`w-2 h-2 rounded-full ${group.role === 'Vendedor' ? 'bg-blue-500' : 'bg-orange-500'}`}></div>
                <h2 className="text-sm font-black text-gray-700 uppercase tracking-widest">{group.role}</h2>
                <div className="h-px bg-gray-200 grow"></div>
                <span className="text-[10px] font-black text-gray-400 bg-white px-2 py-0.5 border border-gray-100 rounded-lg">{group.list.length} MEMBROS</span>
             </div>
             <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <DataTable 
                  columns={getColumns(group.role)} 
                  data={group.list} 
                  loading={loading}
                />
             </div>
          </div>
        ))}

        {peopleByRole.length === 0 && !loading && (
          <div className="h-full flex flex-col items-center justify-center opacity-20 py-20">
            <i className="fas fa-users-slash text-6xl mb-4"></i>
            <p className="font-black uppercase tracking-widest text-sm">Nenhum colaborador encontrado</p>
          </div>
        )}
      </div>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingId ? "Editar Colaborador" : "Novo Colaborador"}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <FormField label="Nome Completo" placeholder="Ex: Maria Oliveira" value={formData.nome} onChange={(v) => setFormData({...formData, nome: v})} required />
          
          <div>
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1 block">Cargo / Função</label>
            <select
              className="w-full border border-gray-300 rounded-xl p-3 bg-white outline-none focus:ring-2 focus:ring-blue-100 transition text-sm font-bold text-gray-700"
              value={formData.cargo_id}
              onChange={(e) => setFormData({ ...formData, cargo_id: e.target.value })}
              required
            >
              <option value="">Selecione o cargo...</option>
              {roles.map((role) => <option key={role.id} value={role.id}>{role.nome}</option>)}
            </select>
          </div>

          {selectedRoleName === "Vendedor" && (
            <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 mt-2">
              <FormField 
                label="Comissão de Vendedor (%)" 
                type="number" 
                placeholder={defaultCommission.toString()}
                value={formData.comissao_fixa} 
                onChange={(v) => setFormData({...formData, comissao_fixa: v})}
                icon="fa-percent"
              />
              <p className="text-[9px] font-bold text-blue-400 uppercase tracking-tight mt-2 ml-1">
                Vazio utiliza a taxa padrão do sistema ({defaultCommission}%).
              </p>
            </div>
          )}

          <div className="flex gap-3 pt-4 border-t border-gray-50 mt-6">
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="flex-1 bg-gray-100 text-gray-500 py-3 rounded-xl font-black text-[11px] uppercase tracking-widest hover:bg-gray-200 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-black text-[11px] uppercase tracking-widest hover:bg-blue-700 transition shadow-lg shadow-blue-50 active:scale-95 flex items-center justify-center gap-2"
            >
              <i className="fas fa-save"></i> {editingId ? "Atualizar" : "Salvar"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Pessoas;
