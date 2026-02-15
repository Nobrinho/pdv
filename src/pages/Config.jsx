// @ts-nocheck
import React, { useState, useEffect } from "react";
import { useAlert } from "../context/AlertSystem";

const Config = () => {
  const { showAlert, showConfirm } = useAlert();

  const [roles, setRoles] = useState([]);
  const [newRole, setNewRole] = useState("");
  const [printers, setPrinters] = useState([]);
  const [selectedPrinter, setSelectedPrinter] = useState("");

  // Comissões
  const [defaultCommission, setDefaultCommission] = useState(""); // Novos
  const [usedCommission, setUsedCommission] = useState(""); // Usados (Novo)

  // Estados para Gestão de Usuários
  const [systemUsers, setSystemUsers] = useState([]);
  const [newUser, setNewUser] = useState({
    nome: "",
    username: "",
    password: "",
    cargo: "vendedor",
  });
  // Controle de visibilidade da senha
  const [showPassword, setShowPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);

  // Dados da Empresa
  const [companyInfo, setCompanyInfo] = useState({
    empresa_nome: "",
    empresa_endereco: "",
    empresa_telefone: "",
    empresa_cnpj: "",
    empresa_logo: "",
    empresa_logo_url: "",
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const rolesData = await window.api.getRoles();
      const configData = await window.api.getConfig("comissao_padrao");
      const configUsados = await window.api.getConfig("comissao_usados"); // Carrega config de usados
      const printerConfig = await window.api.getConfig("impressora_padrao");
      const printersData = await window.api.getPrinters();
      const usersData = await window.api.getUsers();
      const companyData = await window.api.getCompanyInfo();

      setRoles(rolesData);
      setPrinters(printersData);
      setSystemUsers(usersData);
      setCompanyInfo((prev) => ({ ...prev, ...companyData }));

      if (configData)
        setDefaultCommission((parseFloat(configData) * 100).toString());
      if (configUsados)
        setUsedCommission((parseFloat(configUsados) * 100).toString());
      else setUsedCommission("25"); // Valor padrão visual se não existir no banco

      if (printerConfig) setSelectedPrinter(printerConfig);
    } catch (error) {
      console.error(error);
      showAlert("Erro ao carregar dados.", "Erro Técnico", "error");
    }
  };

  // --- Lógica de Comissão ---
  const handleSaveCommission = async () => {
    setIsLoading(true);
    try {
      const valueToSave = parseFloat(defaultCommission) / 100;
      const valueUsadosToSave = parseFloat(usedCommission) / 100;

      await window.api.saveConfig("comissao_padrao", valueToSave);
      await window.api.saveConfig("comissao_usados", valueUsadosToSave); // Salva nova config

      showAlert(
        "Taxas de comissão atualizadas com sucesso!",
        "Sucesso",
        "success",
      );
    } catch (error) {
      showAlert("Erro ao salvar.", "Erro", "error");
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
      showAlert("Cargo adicionado!", "Sucesso", "success");
    } else {
      showAlert("Erro ao criar cargo: " + result.error, "Erro", "error");
    }
  };

  const handleDeleteRole = async (id) => {
    const confirmed = await showConfirm(
      "Tem a certeza que deseja excluir este cargo?",
    );
    if (confirmed) {
      const result = await window.api.deleteRole(id);
      if (result.success) {
        loadData();
        showAlert("Cargo excluído.", "Sucesso", "success");
      } else {
        showAlert("Erro: " + result.error, "Não foi possível excluir", "error");
      }
    }
  };

  // --- Backup e Dados ---
  const handleBackup = async () => {
    const result = await window.api.backupDatabase();
    if (result.success) {
      showAlert("Backup realizado com sucesso!", "Dados Seguros", "success");
    } else if (result.message && result.message !== "Backup cancelado.") {
      showAlert("Erro: " + result.error, "Falha no Backup", "error");
    }
  };

  const handleRestore = async () => {
    await window.api.restoreDatabase();
  };

  const handleSavePrinter = async () => {
    const result = await window.api.saveConfig(
      "impressora_padrao",
      selectedPrinter,
    );
    if (result.success) {
      showAlert(
        "Impressora padrão salva com sucesso!",
        "Configuração",
        "success",
      );
    } else {
      showAlert("Erro ao salvar impressora.", "Erro", "error");
    }
  };

  // --- Lógica de Usuários ---
  const handleAddUser = async (e) => {
    e.preventDefault();
    if (!newUser.nome || !newUser.username || !newUser.password) {
      return showAlert("Preencha todos os campos.", "Atenção", "warning");
    }
    if (newUser.password.length < 4) {
      return showAlert(
        "A senha deve ter pelo menos 4 caracteres.",
        "Senha Fraca",
        "warning",
      );
    }

    const result = await window.api.registerUser(newUser);

    if (result.success) {
      showAlert("Usuário criado com sucesso!", "Sucesso", "success");
      setNewUser({ name: "", username: "", password: "", cargo: "vendedor" });
      loadData();
    } else {
      showAlert("Erro ao criar usuário: " + result.error, "Erro", "error");
    }
  };

  const handleDeleteUser = async (id) => {
    const confirmed = await showConfirm(
      "Tem a certeza que deseja excluir este usuário de acesso?",
    );
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

  // --- Lógica da Empresa ---
  const handleSaveCompany = async () => {
    setIsLoading(true);
    const result = await window.api.saveCompanyInfo(companyInfo);
    setIsLoading(false);
    if (result.success) {
      showAlert("Dados da empresa atualizados!", "Sucesso", "success");
    } else {
      showAlert("Erro ao salvar dados.", "Erro", "error");
    }
  };

  const handleSelectLogo = async () => {
    const result = await window.api.selectLogoFile();
    if (result) {
      setCompanyInfo((prev) => ({ 
        ...prev, 
        empresa_logo: result.path,
        empresa_logo_url: result.base64 
      }));
      showAlert("Logo atualizada com sucesso!", "Sucesso", "success");
    }
  };

  const handleRemoveLogo = () => {
    setCompanyInfo((prev) => ({
      ...prev,
      empresa_logo: "",
      empresa_logo_url: "",
    }));
  };

  return (
    <div className="p-6 h-full flex flex-col overflow-y-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">
        Configurações do Sistema
      </h1>

      {/* --- DADOS DA EMPRESA (WHITE LABEL) --- */}
      <div className="bg-white p-6 rounded-xl shadow-md mb-6 border-l-4 border-indigo-500">
        <h2 className="text-lg font-bold mb-4 text-gray-700 flex items-center border-b pb-2">
          <i className="fas fa-building text-indigo-500 mr-2"></i> Dados da Empresa (Recibo)
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nome Fantasia</label>
              <input
                className="w-full border border-gray-300 rounded-lg p-2 outline-none focus:ring-2 focus:ring-indigo-500"
                value={companyInfo.empresa_nome}
                onChange={(e) => setCompanyInfo({ ...companyInfo, empresa_nome: e.target.value })}
                placeholder="Ex: Minha Loja de Peças"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Endereço Completo</label>
              <input
                className="w-full border border-gray-300 rounded-lg p-2 outline-none focus:ring-2 focus:ring-indigo-500"
                value={companyInfo.empresa_endereco}
                onChange={(e) => setCompanyInfo({ ...companyInfo, empresa_endereco: e.target.value })}
                placeholder="Rua Exemplo, 123 - Bairro - Cidade/UF"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Telefone / WhatsApp</label>
                <input
                  className="w-full border border-gray-300 rounded-lg p-2 outline-none focus:ring-2 focus:ring-indigo-500"
                  value={companyInfo.empresa_telefone}
                  onChange={(e) => setCompanyInfo({ ...companyInfo, empresa_telefone: e.target.value })}
                  placeholder="(00) 00000-0000"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">CNPJ / Documento</label>
                <input
                  className="w-full border border-gray-300 rounded-lg p-2 outline-none focus:ring-2 focus:ring-indigo-500"
                  value={companyInfo.empresa_cnpj}
                  onChange={(e) => setCompanyInfo({ ...companyInfo, empresa_cnpj: e.target.value })}
                  placeholder="00.000.000/0000-00"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-4 bg-gray-50">
            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Logo do Recibo</label>
            {companyInfo.empresa_logo_url ? (
              <div className="relative">
                <img 
                  src={companyInfo.empresa_logo_url} 
                  alt="Logo Empresa" 
                  className="h-24 object-contain mb-4" 
                  onError={(e) => e.target.style.display = 'none'}
                />
                <button 
                  onClick={handleRemoveLogo}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600 shadow-md transition-transform hover:scale-110"
                  title="Remover Logo"
                >
                  <i className="fas fa-trash text-xs"></i>
                </button>
              </div>
            ) : (
              <div className="h-24 w-24 bg-gray-200 rounded-full flex items-center justify-center mb-4 text-gray-400">
                <i className="fas fa-image text-2xl"></i>
              </div>
            )}
            <button onClick={handleSelectLogo} className="bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-300 text-sm font-bold">
              <i className="fas fa-upload mr-2"></i> Selecionar Imagem
            </button>
          </div>
        </div>
        <button onClick={handleSaveCompany} disabled={isLoading} className="mt-4 bg-indigo-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-indigo-700 transition shadow-md w-full md:w-auto">
          {isLoading ? "Salvando..." : "Salvar Dados da Empresa"}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Card Comissão (ATUALIZADO) */}
        <div className="bg-white p-6 rounded-xl shadow-md h-fit border-l-4 border-blue-500">
          <h2 className="text-lg font-bold mb-4 text-gray-700 flex items-center border-b pb-2">
            <i className="fas fa-percent text-blue-500 mr-2"></i> Regras de
            Comissão
          </h2>

          <div className="space-y-4">
            {/* Peças Novas */}
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                Peças Novas (Sobre Venda)
              </label>
              <div className="relative">
                <input
                  type="number"
                  className="w-full border border-gray-300 rounded-lg p-2.5 pr-8 outline-none focus:ring-2 focus:ring-blue-500 transition font-bold text-gray-700"
                  placeholder="Ex: 5"
                  value={defaultCommission}
                  onChange={(e) => setDefaultCommission(e.target.value)}
                />
                <span className="absolute right-3 top-3 text-gray-400 font-bold">
                  %
                </span>
              </div>
              <p className="text-[10px] text-gray-400 mt-1">
                Aplicado sobre o valor total da venda.
              </p>
            </div>

            {/* Peças Usadas */}
            <div>
              <label className="block text-xs font-bold text-orange-600 uppercase mb-1">
                Peças Usadas (Sobre Lucro)
              </label>
              <div className="relative">
                <input
                  type="number"
                  className="w-full border border-orange-200 rounded-lg p-2.5 pr-8 outline-none focus:ring-2 focus:ring-orange-500 transition font-bold text-orange-800 bg-orange-50"
                  placeholder="Ex: 25"
                  value={usedCommission}
                  onChange={(e) => setUsedCommission(e.target.value)}
                />
                <span className="absolute right-3 top-3 text-orange-400 font-bold">
                  %
                </span>
              </div>
              <p className="text-[10px] text-gray-400 mt-1">
                Aplicado sobre a margem (Venda - Custo).
              </p>
            </div>

            <button
              onClick={handleSaveCommission}
              disabled={isLoading}
              className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-blue-700 transition shadow-md disabled:opacity-50"
            >
              {isLoading ? "Salvando..." : "Salvar Alterações"}
            </button>
          </div>
        </div>

        {/* Card Impressora */}
        <div className="bg-white p-6 rounded-xl shadow-md h-fit border-l-4 border-gray-600">
          <h2 className="text-lg font-bold mb-4 text-gray-700 flex items-center border-b pb-2">
            <i className="fas fa-print text-gray-600 mr-2"></i> Impressora de
            Cupom
          </h2>
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                Dispositivo
              </label>
              <select
                className="w-full border border-gray-300 rounded-lg p-2.5 bg-white outline-none focus:ring-2 focus:ring-gray-500 transition"
                value={selectedPrinter}
                onChange={(e) => setSelectedPrinter(e.target.value)}
              >
                <option value="">Padrão do Windows</option>
                {printers.map((p) => (
                  <option key={p.name} value={p.name}>
                    {p.name}
                  </option>
                ))}
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
            <button
              onClick={handleBackup}
              className="w-full bg-green-600 text-white py-3 rounded-lg font-bold hover:bg-green-700 transition shadow-md flex justify-center items-center gap-2"
            >
              <i className="fas fa-download"></i> FAZER BACKUP
            </button>
            <button
              onClick={handleRestore}
              className="w-full bg-white border-2 border-orange-500 text-orange-600 py-3 rounded-lg font-bold hover:bg-orange-50 transition shadow-sm flex justify-center items-center gap-2"
            >
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
              onChange={(e) => setNewRole(e.target.value)}
            />
            <button
              type="submit"
              className="bg-purple-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-purple-700 transition shadow-sm"
            >
              +
            </button>
          </form>
          <div className="space-y-2 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
            {roles.length === 0 && (
              <p className="text-gray-400 text-sm text-center py-2">
                Nenhum cargo cadastrado.
              </p>
            )}
            {roles.map((role) => (
              <div
                key={role.id}
                className="flex justify-between items-center p-2 bg-gray-50 rounded border border-gray-100 group hover:border-purple-200 transition"
              >
                <span className="text-sm font-medium text-gray-700">
                  {role.nome}
                </span>
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
          <i className="fas fa-users-cog text-indigo-600 mr-2"></i> Usuários de
          Acesso (Login)
        </h2>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Formulário */}
          <div className="lg:w-1/3 border-r pr-6 border-gray-100">
            <h3 className="font-semibold text-gray-600 mb-4 text-sm uppercase tracking-wide">
              Novo Usuário
            </h3>
            <form onSubmit={handleAddUser} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                  Nome
                </label>
                <input
                  className="w-full border border-gray-300 rounded-lg p-2 outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Ex: João Silva"
                  value={newUser.nome}
                  onChange={(e) =>
                    setNewUser({ ...newUser, nome: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                  Login
                </label>
                <input
                  className="w-full border border-gray-300 rounded-lg p-2 outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Ex: joao.vendas"
                  value={newUser.username}
                  onChange={(e) =>
                    setNewUser({ ...newUser, username: e.target.value })
                  }
                  required
                />
              </div>

              {/* CAMPO DE SENHA COM OLHO */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                  Senha
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    className="w-full border border-gray-300 rounded-lg p-2 pr-10 outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="******"
                    value={newUser.password}
                    onChange={(e) =>
                      setNewUser({ ...newUser, password: e.target.value })
                    }
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2 top-2 text-gray-400 hover:text-indigo-600 focus:outline-none"
                  >
                    <i
                      className={`fas ${showPassword ? "fa-eye-slash" : "fa-eye"}`}
                    ></i>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                  Permissão
                </label>
                <select
                  className="w-full border border-gray-300 rounded-lg p-2 bg-white outline-none focus:ring-2 focus:ring-indigo-500"
                  value={newUser.cargo}
                  onChange={(e) =>
                    setNewUser({ ...newUser, cargo: e.target.value })
                  }
                >
                  <option value="caixa">Caixa (Restrito)</option>
                  <option value="admin">Administrador (Total)</option>
                </select>
              </div>
              <button
                type="submit"
                className="w-full bg-indigo-600 text-white py-2.5 rounded-lg font-bold hover:bg-indigo-700 transition shadow-md transform active:scale-95"
              >
                CRIAR ACESSO
              </button>
            </form>
          </div>

          {/* Lista */}
          <div className="flex-1">
            <h3 className="font-semibold text-gray-600 mb-4 text-sm uppercase tracking-wide">
              Usuários Cadastrados
            </h3>
            <div className="overflow-hidden rounded-lg border border-gray-200 shadow-sm">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Nome
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Login
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                      Permissão
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                      Ação
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {systemUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50 transition">
                      <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                        {user.nome}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500 font-mono">
                        {user.username}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`px-2 py-1 text-xs font-semibold rounded-full ${
                            user.cargo === "admin"
                              ? "bg-purple-100 text-purple-800"
                              : "bg-green-100 text-green-800"
                          }`}
                        >
                          {user.cargo === "admin" ? "Admin" : "Caixa"}
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
                      <td
                        colSpan="4"
                        className="px-4 py-8 text-center text-gray-400 text-sm"
                      >
                        Nenhum usuário encontrado.
                      </td>
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
