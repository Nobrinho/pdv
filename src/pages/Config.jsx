// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { useAlert } from '../context/AlertSystem'; // 1. Importar o Hook

const Config = () => {
  const { showAlert, showConfirm } = useAlert(); // 2. Usar o Hook
  
  const [roles, setRoles] = useState([]);
  const [newRole, setNewRole] = useState('');
  const [defaultCommission, setDefaultCommission] = useState('');
  const [printers, setPrinters] = useState([]);
  const [selectedPrinter, setSelectedPrinter] = useState('');
  
  // Estados para Gestão de Usuários
  const [systemUsers, setSystemUsers] = useState([]);
  const [newUser, setNewUser] = useState({ nome: '', username: '', password: '', cargo: 'vendedor' });
  
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const rolesData = await window.api.getRoles();
      const configData = await window.api.getConfig('comissao_padrao');
      const printerConfig = await window.api.getConfig('impressora_padrao');
      const printersData = await window.api.getPrinters();
      const usersData = await window.api.getUsers();
      
      setRoles(rolesData);
      setPrinters(printersData);
      setSystemUsers(usersData);
      
      if (configData) setDefaultCommission((parseFloat(configData) * 100).toString());
      if (printerConfig) setSelectedPrinter(printerConfig);
    } catch (error) {
      console.error(error);
      showAlert("Erro ao carregar dados.", "Erro Técnico", "error");
    }
  };

  // --- Lógica de Comissão ---
  const handleSaveCommission = async () => {
    setIsLoading(true);
    const valueToSave = parseFloat(defaultCommission) / 100;
    const result = await window.api.saveConfig('comissao_padrao', valueToSave);
    
    if (result.success) {
        showAlert('Comissão padrão atualizada com sucesso!', 'Sucesso', 'success');
    } else {
        showAlert('Erro ao salvar: ' + result.error, 'Erro', 'error');
    }
    setIsLoading(false);
  };

  // --- Lógica de Cargos ---
  const handleAddRole = async (e) => {
    e.preventDefault();
    if (!newRole.trim()) return;
    
    const result = await window.api.saveRole(newRole.trim());
    if (result.success) { 
        setNewRole(''); 
        loadData(); 
        showAlert('Cargo adicionado!', 'Sucesso', 'success');
    } else {
        showAlert('Erro ao criar cargo: ' + result.error, 'Erro', 'error');
    }
  };

  const handleDeleteRole = async (id) => {
    const confirmed = await showConfirm('Tem a certeza que deseja excluir este cargo?');
    if (confirmed) {
        const result = await window.api.deleteRole(id);
        if (result.success) {
            loadData();
            showAlert('Cargo excluído.', 'Sucesso', 'success');
        } else {
            showAlert('Erro: ' + result.error, 'Não foi possível excluir', 'error');
        }
    }
  };

  // --- Backup e Dados ---
  const handleBackup = async () => {
      const result = await window.api.backupDatabase();
      if (result.success) {
          showAlert("Backup realizado com sucesso!", "Dados Seguros", "success");
      } else if (result.message && result.message !== 'Backup cancelado.') {
          showAlert("Erro: " + result.error, "Falha no Backup", "error");
      }
  };

  const handleRestore = async () => {
      // O backend já tem um dialog nativo para confirmação crítica, 
      // mas podemos adicionar uma camada extra aqui se desejar.
      // Por enquanto, chamamos direto pois o backend reinicia o app.
      await window.api.restoreDatabase();
  };

  const handleSavePrinter = async () => {
      const result = await window.api.saveConfig('impressora_padrao', selectedPrinter);
      if (result.success) {
          showAlert('Impressora padrão salva com sucesso!', 'Configuração', 'success');
      } else {
          showAlert('Erro ao salvar impressora.', 'Erro', 'error');
      }
  };

  // --- Lógica de Usuários ---
  const handleAddUser = async (e) => {
      e.preventDefault();
      if (!newUser.nome || !newUser.username || !newUser.password) {
          return showAlert("Preencha todos os campos.", "Atenção", "warning");
      }
      if (newUser.password.length < 4) {
          return showAlert("A senha deve ter pelo menos 4 caracteres.", "Senha Fraca", "warning");
      }

      const result = await window.api.registerUser(newUser);
      
      if (result.success) {
          showAlert("Usuário criado com sucesso!", "Sucesso", "success");
          setNewUser({ nome: '', username: '', password: '', cargo: 'vendedor' });
          loadData();
      } else {
          showAlert("Erro ao criar usuário: " + result.error, "Erro", "error");
      }
  };

  const handleDeleteUser = async (id) => {
      const confirmed = await showConfirm("Tem a certeza que deseja excluir este usuário de acesso?");
      if (confirmed) {
          const result = await window.api.deleteUser(id);
          if (result.success) {
              loadData();
              showAlert("Usuário removido.", "Sucesso", "success");
          } else {
              showAlert("Erro: " + result.error, "Erro", "error");
          }
      }
  };

  return (
    <div className="p-6 h-full flex flex-col overflow-y-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Configurações do Sistema</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Card Comissão */}
        <div className="bg-white p-6 rounded-xl shadow-md h-fit border-l-4 border-blue-500">
            <h2 className="text-lg font-bold mb-4 text-gray-700 flex items-center border-b pb-2">
                <i className="fas fa-percent text-blue-500 mr-2"></i> Comissão Padrão
            </h2>
            <div className="flex gap-4 items-end">
                <div className="flex-1">
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Porcentagem (%)</label>
                    <input 
                        type="number" 
                        className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-500 transition" 
                        placeholder="Ex: 30" 
                        value={defaultCommission} 
                        onChange={e => setDefaultCommission(e.target.value)} 
                    />
                </div>
                <button 
                    onClick={handleSaveCommission} 
                    disabled={isLoading} 
                    className="bg-blue-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-blue-700 transition shadow-md disabled:opacity-50"
                >
                    Salvar
                </button>
            </div>
        </div>

        {/* Card Impressora */}
        <div className="bg-white p-6 rounded-xl shadow-md h-fit border-l-4 border-gray-600">
            <h2 className="text-lg font-bold mb-4 text-gray-700 flex items-center border-b pb-2">
                <i className="fas fa-print text-gray-600 mr-2"></i> Impressora de Cupom
            </h2>
            <div className="flex gap-4 items-end">
                <div className="flex-1">
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Dispositivo</label>
                    <select 
                        className="w-full border border-gray-300 rounded-lg p-2.5 bg-white outline-none focus:ring-2 focus:ring-gray-500 transition" 
                        value={selectedPrinter} 
                        onChange={e => setSelectedPrinter(e.target.value)}
                    >
                        <option value="">Padrão do Windows</option>
                        {printers.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
                    </select>
                </div>
                <button 
                    onClick={handleSavePrinter} 
                    className="bg-gray-700 text-white px-6 py-3 rounded-lg font-bold hover:bg-gray-800 transition shadow-md"
                >
                    Salvar
                </button>
            </div>
        </div>

        {/* Card Backup */}
        <div className="bg-white p-6 rounded-xl shadow-md h-fit border-l-4 border-green-500">
             <h2 className="text-lg font-bold mb-4 text-gray-700 flex items-center border-b pb-2">
                 <i className="fas fa-database text-green-500 mr-2"></i> Dados
             </h2>
             <div className="flex flex-col gap-3">
                <button onClick={handleBackup} className="w-full bg-green-600 text-white py-3 rounded-lg font-bold hover:bg-green-700 transition shadow-md flex justify-center items-center gap-2">
                    <i className="fas fa-download"></i> FAZER BACKUP
                </button>
                <button onClick={handleRestore} className="w-full bg-white border-2 border-orange-500 text-orange-600 py-3 rounded-lg font-bold hover:bg-orange-50 transition shadow-sm flex justify-center items-center gap-2">
                    <i className="fas fa-upload"></i> RESTAURAR DADOS
                </button>
             </div>
        </div>

        {/* Card Cargos */}
        <div className="bg-white p-6 rounded-xl shadow-md h-fit md:col-span-2 border-l-4 border-purple-500">
             <h2 className="text-lg font-bold mb-4 text-gray-700 flex items-center border-b pb-2">
                 <i className="fas fa-id-badge text-purple-500 mr-2"></i> Cargos
             </h2>
             <form onSubmit={handleAddRole} className="flex gap-2 mb-4">
                <input 
                    type="text" 
                    className="flex-1 border border-gray-300 rounded-lg p-2 outline-none focus:ring-2 focus:ring-purple-500" 
                    placeholder="Nome do cargo..." 
                    value={newRole} 
                    onChange={e => setNewRole(e.target.value)} 
                />
                <button type="submit" className="bg-purple-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-purple-700 transition shadow-sm">+</button>
             </form>
             <div className="space-y-2 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
                {roles.length === 0 && <p className="text-gray-400 text-sm text-center py-2">Nenhum cargo cadastrado.</p>}
                {roles.map(role => (
                    <div key={role.id} className="flex justify-between items-center p-2 bg-gray-50 rounded border border-gray-100 group hover:border-purple-200 transition">
                        <span className="text-sm font-medium text-gray-700">{role.nome}</span>
                        <button 
                            onClick={() => handleDeleteRole(role.id)} 
                            className="text-red-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded transition"
                            title="Excluir"
                        >
                            <i className="fas fa-trash"></i>
                        </button>
                    </div>
                ))}
             </div>
        </div>
      </div>

      {/* --- GESTÃO DE USUÁRIOS DE LOGIN --- */}
      <div className="bg-white p-6 rounded-xl shadow-md border-t-4 border-indigo-600 mt-2">
          <h2 className="text-xl font-bold mb-6 text-gray-800 flex items-center">
              <i className="fas fa-users-cog text-indigo-600 mr-2"></i> Usuários de Acesso (Login)
          </h2>
          
          <div className="flex flex-col lg:flex-row gap-8">
              {/* Formulário */}
              <div className="lg:w-1/3 border-r pr-6 border-gray-100">
                  <h3 className="font-semibold text-gray-600 mb-4 text-sm uppercase tracking-wide">Novo Usuário</h3>
                  <form onSubmit={handleAddUser} className="space-y-4">
                      <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nome</label>
                          <input className="w-full border border-gray-300 rounded-lg p-2 outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Ex: João Silva" value={newUser.nome} onChange={e => setNewUser({...newUser, nome: e.target.value})} required />
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Login</label>
                          <input className="w-full border border-gray-300 rounded-lg p-2 outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Ex: joao.vendas" value={newUser.username} onChange={e => setNewUser({...newUser, username: e.target.value})} required />
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Senha</label>
                          <input type="password" className="w-full border border-gray-300 rounded-lg p-2 outline-none focus:ring-2 focus:ring-indigo-500" placeholder="******" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} required />
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Permissão</label>
                          <select className="w-full border border-gray-300 rounded-lg p-2 bg-white outline-none focus:ring-2 focus:ring-indigo-500" value={newUser.cargo} onChange={e => setNewUser({...newUser, cargo: e.target.value})}>
                              <option value="caixa">Caixa (Restrito)</option>
                              <option value="admin">Administrador (Total)</option>
                          </select>
                      </div>
                      <button type="submit" className="w-full bg-indigo-600 text-white py-2.5 rounded-lg font-bold hover:bg-indigo-700 transition shadow-md transform active:scale-95">CRIAR ACESSO</button>
                  </form>
              </div>

              {/* Lista */}
              <div className="flex-1">
                  <h3 className="font-semibold text-gray-600 mb-4 text-sm uppercase tracking-wide">Usuários Cadastrados</h3>
                  <div className="overflow-hidden rounded-lg border border-gray-200 shadow-sm">
                      <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                              <tr>
                                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nome</th>
                                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Login</th>
                                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Permissão</th>
                                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Ação</th>
                              </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                              {systemUsers.map(user => (
                                  <tr key={user.id} className="hover:bg-gray-50 transition">
                                      <td className="px-4 py-3 text-sm text-gray-900 font-medium">{user.nome}</td>
                                      <td className="px-4 py-3 text-sm text-gray-500 font-mono">{user.username}</td>
                                      <td className="px-4 py-3 text-center">
                                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${user.cargo === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-green-100 text-green-800'}`}>
                                              {user.cargo === 'admin' ? 'Admin' : 'Caixa'}
                                          </span>
                                      </td>
                                      <td className="px-4 py-3 text-center">
                                          <button 
                                            onClick={() => handleDeleteUser(user.id)} 
                                            className="text-red-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded transition" 
                                            title="Remover Acesso"
                                          >
                                              <i className="fas fa-trash"></i>
                                          </button>
                                      </td>
                                  </tr>
                              ))}
                              {systemUsers.length === 0 && (
                                  <tr>
                                      <td colSpan="4" className="px-4 py-8 text-center text-gray-400 text-sm">Nenhum usuário encontrado.</td>
                                  </tr>
                              )}
                          </tbody>
                      </table>
                  </div>
              </div>
          </div>
      </div>
    </div>
  );
};

export default Config;