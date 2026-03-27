// @ts-nocheck
import React, { useState, useEffect, useCallback } from "react";
import { useAlert } from "../context/AlertSystem";
import { api } from "../services/api";
import DataTable from "../components/ui/DataTable";
import FormField from "../components/ui/FormField";
import StatusBadge from "../components/ui/StatusBadge";

const Config = () => {
  const { showAlert, showConfirm } = useAlert();

  const [roles, setRoles] = useState([]);
  const [newRole, setNewRole] = useState("");
  const [printers, setPrinters] = useState([]);
  const [selectedPrinter, setSelectedPrinter] = useState("");

  const [defaultCommission, setDefaultCommission] = useState(""); 
  const [usedCommission, setUsedCommission] = useState(""); 

  const [systemUsers, setSystemUsers] = useState([]);
  const [newUser, setNewUser] = useState({
    nome: "",
    username: "",
    password: "",
    cargo: "vendedor",
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoadingData(true);
      const [
        rolesData, 
        configData, 
        configUsados, 
        printerConfig, 
        printersData, 
        usersData
      ] = await Promise.all([
        api.auth.getRoles(),
        api.config.get("comissao_padrao"),
        api.config.get("comissao_usados"),
        api.config.get("impressora_padrao"),
        api.print.printers(),
        api.auth.listUsers()
      ]);

      setRoles(rolesData);
      setPrinters(printersData);
      setSystemUsers(usersData);

      if (configData) setDefaultCommission((parseFloat(configData) * 100).toString());
      if (configUsados) setUsedCommission((parseFloat(configUsados) * 100).toString());
      else setUsedCommission("25");

      if (printerConfig) setSelectedPrinter(printerConfig);
    } catch (error) {
      console.error(error);
      showAlert("Erro ao carregar configurações.", "Erro", "error");
    } finally {
      setLoadingData(false);
    }
  }, [showAlert]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSaveCommission = async () => {
    setIsLoading(true);
    try {
      const valueToSave = parseFloat(defaultCommission) / 100;
      const valueUsadosToSave = parseFloat(usedCommission) / 100;

      await Promise.all([
        api.config.save("comissao_padrao", valueToSave),
        api.config.save("comissao_usados", valueUsadosToSave)
      ]);

      showAlert("Taxas de comissão atualizadas com sucesso!", "Sucesso", "success");
    } catch (error) {
      showAlert("Erro ao salvar taxas.", "Erro", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddRole = async (e) => {
    if (e) e.preventDefault();
    if (!newRole.trim()) return;

    const result = await api.auth.saveRole(newRole.trim());
    if (result.success) {
      setNewRole("");
      loadData();
      showAlert("Cargo adicionado!", "Sucesso", "success");
    } else {
      showAlert("Erro ao criar cargo: " + result.error, "Erro", "error");
    }
  };

  const handleDeleteRole = async (id) => {
    const confirmed = await showConfirm("Tem a certeza que deseja excluir este cargo?");
    if (confirmed) {
      const result = await api.auth.deleteRole(id);
      if (result.success) {
        loadData();
        showAlert("Cargo excluído.", "Sucesso", "success");
      } else {
        showAlert("Erro: " + result.error, "Erro", "error");
      }
    }
  };

  const handleBackup = async () => {
    try {
      const result = await api.config.backup();
      if (result.success) {
        showAlert("Backup realizado com sucesso!", "Dados Seguros", "success");
      } else if (result.message && result.message !== "Backup cancelado.") {
        showAlert("Erro: " + result.error, "Falha no Backup", "error");
      }
    } catch (error) {
      showAlert("Erro ao tentar realizar backup.", "Erro", "error");
    }
  };

  const handleRestore = async () => {
    try {
      await api.config.restore();
    } catch (error) {
      showAlert("Erro ao tentar restaurar backup.", "Erro", "error");
    }
  };

  const handleSavePrinter = async () => {
    try {
      const result = await api.config.save("impressora_padrao", selectedPrinter);
      if (result.success) {
        showAlert("Impressora padrão salva com sucesso!", "Configuração", "success");
      } else {
        showAlert("Erro ao salvar impressora.", "Erro", "error");
      }
    } catch (error) {
      showAlert("Erro técnico ao salvar impressora.", "Erro", "error");
    }
  };

  const handleAddUser = async (e) => {
    if (e) e.preventDefault();
    if (!newUser.nome || !newUser.username || !newUser.password) {
      return showAlert("Preencha todos os campos.", "Atenção", "warning");
    }
    if (newUser.password.length < 4) {
      return showAlert("A senha deve ter pelo menos 4 caracteres.", "Senha Fraca", "warning");
    }

    try {
      const result = await api.auth.register(newUser);
      if (result.success) {
        showAlert("Usuário criado com sucesso!", "Sucesso", "success");
        setNewUser({ nome: "", username: "", password: "", cargo: "vendedor" });
        loadData();
      } else {
        showAlert("Erro ao criar usuário: " + result.error, "Erro", "error");
      }
    } catch (error) {
      showAlert("Erro técnico ao registrar usuário.", "Erro", "error");
    }
  };

  const handleDeleteUser = async (id) => {
    const confirmed = await showConfirm("Tem a certeza que deseja excluir este usuário?");
    if (confirmed) {
      try {
        const result = await api.auth.deleteUser(id);
        if (result.success) {
          loadData();
          showAlert("Usuário removido.", "Sucesso", "success");
        } else {
          showAlert("Erro: " + result.error, "Erro", "error");
        }
      } catch (error) {
        showAlert("Erro ao tentar remover usuário.", "Erro", "error");
      }
    }
  };

  const userColumns = [
    { key: "nome", label: "Nome completo", bold: true },
    { key: "username", label: "Login / Usuário", format: (v) => <span className="font-mono text-gray-500">{v}</span> },
    { 
      key: "cargo", 
      label: "Permissão", 
      align: "center",
      format: (v) => <StatusBadge type={v === "admin" ? "secondary" : "success"} label={v === "admin" ? "Admin" : "Caixa"} />
    },
    {
      key: "actions",
      label: "Ação",
      align: "center",
      format: (_, row) => (
        <button
          onClick={() => handleDeleteUser(row.id)}
          className="text-red-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-lg transition"
          title="Excluir Usuário"
        >
          <i className="fas fa-trash"></i>
        </button>
      )
    }
  ];

  return (
    <div className="p-4 md:p-6 h-full flex flex-col overflow-y-auto bg-gray-50 custom-scrollbar">
      <div className="mb-6">
        <h1 className="text-xl md:text-2xl font-black text-gray-800 tracking-tight">Painel de Configurações</h1>
        <p className="text-xs text-gray-500 mt-1">Ajuste taxas, gerencie usuários e realize manutenção de dados.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
        {/* Card Comissão */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col">
          <h2 className="text-sm font-black mb-6 text-gray-800 uppercase tracking-widest border-b pb-4 flex items-center gap-2">
            <i className="fas fa-percent text-blue-600"></i> Taxas de Comissão
          </h2>

          <div className="space-y-4 flex-1">
            <FormField
              label="Peças Novas (% Total)"
              type="number"
              placeholder="Ex: 5"
              value={defaultCommission}
              onChange={setDefaultCommission}
              icon="fa-tag"
            />
            <FormField
              label="Peças Usadas (% Lucro)"
              type="number"
              placeholder="Ex: 25"
              value={usedCommission}
              onChange={setUsedCommission}
              icon="fa-recycle"
            />
          </div>

          <button
            onClick={handleSaveCommission}
            disabled={isLoading}
            className="w-full bg-blue-600 text-white py-3.5 rounded-xl font-black text-sm hover:bg-blue-700 transition mt-6 shadow-md shadow-blue-50 active:scale-95 disabled:opacity-50"
          >
            {isLoading ? "SALVANDO..." : "ATUALIZAR TAXAS"}
          </button>
        </div>

        {/* Card Impressora e Backup */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
             <h2 className="text-sm font-black mb-4 text-gray-800 uppercase tracking-widest border-b pb-4 flex items-center gap-2">
               <i className="fas fa-print text-gray-600"></i> Impressão
             </h2>
             <div className="flex gap-2 items-end">
               <div className="flex-1">
                 <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block ml-1">Dispositivo Padrão</label>
                 <select
                   className="w-full border border-gray-300 rounded-xl p-2.5 bg-white outline-none focus:ring-2 focus:ring-blue-100 transition text-sm font-medium"
                   value={selectedPrinter}
                   onChange={(e) => setSelectedPrinter(e.target.value)}
                 >
                   <option value="">Configuração do Windows</option>
                   {printers.map((p) => <option key={p.name} value={p.name}>{p.name}</option>)}
                 </select>
               </div>
               <button
                 onClick={handleSavePrinter}
                 className="bg-gray-800 text-white px-5 py-2.5 rounded-xl font-bold text-xs hover:bg-black transition shadow-md active:scale-95"
               >
                 OK
               </button>
             </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 grow">
             <h2 className="text-sm font-black mb-4 text-gray-800 uppercase tracking-widest border-b pb-4 flex items-center gap-2">
               <i className="fas fa-database text-green-600"></i> Manutenção
             </h2>
             <div className="grid grid-cols-2 gap-3">
               <button
                 onClick={handleBackup}
                 className="bg-green-600 text-white py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-green-700 transition shadow-md active:scale-95 flex flex-col items-center gap-2"
               >
                 <i className="fas fa-download fa-lg"></i> Backup
               </button>
               <button
                 onClick={handleRestore}
                 className="bg-orange-50 text-orange-600 border border-orange-200 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-orange-100 transition active:scale-95 flex flex-col items-center gap-2"
               >
                 <i className="fas fa-upload fa-lg"></i> Restaurar
               </button>
             </div>
          </div>
        </div>

        {/* Card Cargos */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col max-h-[400px]">
          <h2 className="text-sm font-black mb-4 text-gray-800 uppercase tracking-widest border-b pb-4 flex items-center gap-2">
            <i className="fas fa-id-badge text-purple-600"></i> Gerenciar Cargos
          </h2>
          <form onSubmit={handleAddRole} className="flex gap-2 mb-4">
            <input
              type="text"
              className="flex-1 border border-gray-300 rounded-xl p-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-purple-100"
              placeholder="Nome do novo cargo..."
              value={newRole}
              onChange={(e) => setNewRole(e.target.value)}
            />
            <button
              type="submit"
              className="bg-purple-600 text-white px-4 py-2 rounded-xl font-black hover:bg-purple-700 transition shadow-sm active:scale-90"
            >
              +
            </button>
          </form>
          <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
            {roles.map((role) => (
              <div
                key={role.id}
                className="flex justify-between items-center p-3 bg-gray-50 rounded-xl border border-gray-100 hover:border-purple-200 transition group"
              >
                <span className="text-sm font-bold text-gray-700 uppercase tracking-tight">{role.nome}</span>
                <button
                  onClick={() => handleDeleteRole(role.id)}
                  className="text-gray-300 hover:text-red-500 p-1.5 transition"
                  title="Excluir"
                >
                  <i className="fas fa-trash-alt text-xs"></i>
                </button>
              </div>
            ))}
            {roles.length === 0 && <p className="text-gray-400 text-[10px] text-center mt-10 uppercase tracking-widest font-black opacity-30">Nenhum cargo</p>}
          </div>
        </div>
      </div>

      {/* Gestão de Usuários */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <h2 className="text-sm font-black mb-6 text-gray-800 uppercase tracking-widest border-b pb-4 flex items-center gap-2">
          <i className="fas fa-users-cog text-indigo-600"></i> Usuários de Acesso
        </h2>

        <div className="flex flex-col lg:flex-row gap-8">
          <form onSubmit={handleAddUser} className="lg:w-80 xl:w-96 space-y-4 shrink-0 bg-gray-50 p-6 rounded-2xl border border-gray-100">
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Novo Acesso</h3>
            <FormField label="Nome Completo" placeholder="Ex: João da Silva" value={newUser.nome} onChange={(v) => setNewUser({...newUser, nome: v})} required />
            <FormField label="Login / Usuário" placeholder="Ex: joao.vendas" value={newUser.username} onChange={(v) => setNewUser({...newUser, username: v})} required />
            
            <div className="relative">
              <FormField 
                label="Senha Secura" 
                type={showPassword ? "text" : "password"} 
                placeholder="******" 
                value={newUser.password} 
                onChange={(v) => setNewUser({...newUser, password: v})} 
                required 
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-[34px] text-gray-400 hover:text-indigo-600"
              >
                <i className={`fas ${showPassword ? "fa-eye-slash" : "fa-eye"} text-xs`}></i>
              </button>
            </div>

            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1 block">Permissão</label>
              <select
                className="w-full border border-gray-300 rounded-xl p-2.5 bg-white outline-none focus:ring-2 focus:ring-indigo-100 transition text-sm font-medium"
                value={newUser.cargo}
                onChange={(e) => setNewUser({ ...newUser, cargo: e.target.value })}
              >
                <option value="vendedor">Vendedor (Básico)</option>
                <option value="caixa">Caixa (Restrito)</option>
                <option value="admin">Administrador (Total)</option>
              </select>
            </div>

            <button
              type="submit"
              className="w-full bg-indigo-600 text-white py-3.5 rounded-xl font-black text-sm hover:bg-indigo-700 transition mt-4 shadow-md active:scale-95 flex items-center justify-center gap-2"
            >
              <i className="fas fa-user-plus"></i> CRIAR USUÁRIO
            </button>
          </form>

          <div className="flex-1 overflow-hidden flex flex-col">
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 ml-4">Usuários com Acesso ao Terminal</h3>
            <DataTable 
              columns={userColumns} 
              data={systemUsers} 
              loading={loadingData} 
              emptyMessage="Nenhum usuário de acesso cadastrado."
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Config;
