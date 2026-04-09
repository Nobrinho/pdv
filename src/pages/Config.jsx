import React, { useState, useEffect, useCallback, useRef } from "react";
import { useAlert } from "../context/AlertSystem";
import { useTenant } from "../context/TenantContext";
import { processLogoForThermal, processBackgroundImage } from "../context/TenantContext";
import { api } from "../services/api";
import DataTable from "../components/ui/DataTable";
import FormField from "../components/ui/FormField";
import StatusBadge from "../components/ui/StatusBadge";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/pt-br";

dayjs.extend(relativeTime);
dayjs.locale("pt-br");


const Config = () => {
  const { showAlert, showConfirm } = useAlert();
  const { tenant, saveTenantBatch, updateTenant } = useTenant();

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

  const availableThemes = [
    { id: "default", name: "Azul Padrão", color: "#3B82F6" },
    { id: "emerald", name: "Esmeralda", color: "#10B981" },
    { id: "rose", name: "Rosa", color: "#F43F5E" },
    { id: "amber", name: "Âmbar", color: "#F59E0B" },
    { id: "violet", name: "Violeta", color: "#8B5CF6" },
    { id: "cyan", name: "Ciano", color: "#06B6D4" },
    { id: "fuchsia", name: "Fúcsia", color: "#D946EF" },
    { id: "orange", name: "Laranja", color: "#F97316" },
    { id: "teal", name: "Verde Água", color: "#14B8A6" },
    { id: "slate", name: "Grafite", color: "#64748B" },
  ];

  // --- WHITE LABEL: Estado local da identidade ---
  const [identity, setIdentity] = useState({
    nome: "",
    subtitulo: "",
    endereco: "",
    cidade: "",
    telefone: "",
    documento: "",
    corPrimaria: "#2563EB",
    corSecundaria: "#4F46E5",
    devNome: "",
    devLink: "",
  });
  const [logoPreview, setLogoPreview] = useState("");
  const [bgPreview, setBgPreview] = useState("");
  const [savingIdentity, setSavingIdentity] = useState(false);
  const logoInputRef = useRef(null);
  const bgInputRef = useRef(null);

  // Sincronizar estado local com tenant carregado
  useEffect(() => {
    if (tenant) {
      setIdentity({
        nome: tenant.nome || "",
        subtitulo: tenant.subtitulo || "",
        endereco: tenant.endereco || "",
        cidade: tenant.cidade || "",
        telefone: tenant.telefone || "",
        documento: tenant.documento || "",
        corPrimaria: tenant.corPrimaria || "#2563EB",
        corSecundaria: tenant.corSecundaria || "#4F46E5",
        devNome: tenant.devNome || "",
        devLink: tenant.devLink || "",
      });
      setLogoPreview(tenant.logoBase64 || "");
      setBgPreview(tenant.bgBase64 || "");
    }
  }, [tenant]);

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

  // --- Handlers existentes ---
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

  // --- WHITE LABEL: Handlers de identidade ---
  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validar tipo
    if (!file.type.startsWith("image/")) {
      return showAlert("Selecione um arquivo de imagem válido.", "Formato Inválido", "error");
    }

    // Validar tamanho (max 5MB antes do processamento)
    if (file.size > 5 * 1024 * 1024) {
      return showAlert("A imagem deve ter no máximo 5MB.", "Arquivo Grande", "error");
    }

    try {
      const processed = await processLogoForThermal(file);
      setLogoPreview(processed);
      showAlert("Logo processada para impressora térmica (P&B, 200px).", "Pré-visualização", "success");
    } catch (err) {
      showAlert("Erro ao processar logo: " + err.message, "Erro", "error");
    }
  };

  const handleBgUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      return showAlert("Selecione um arquivo de imagem válido.", "Formato Inválido", "error");
    }

    if (file.size > 10 * 1024 * 1024) {
      return showAlert("A imagem deve ter no máximo 10MB.", "Arquivo Grande", "error");
    }

    try {
      const processed = await processBackgroundImage(file);
      setBgPreview(processed);
      showAlert("Background processado e otimizado.", "Pré-visualização", "success");
    } catch (err) {
      showAlert("Erro ao processar imagem: " + err.message, "Erro", "error");
    }
  };

  const handleSaveIdentity = async () => {
    if (!identity.nome.trim()) {
      return showAlert("O nome da loja é obrigatório.", "Atenção", "warning");
    }

    setSavingIdentity(true);
    try {
      await saveTenantBatch({
        ...identity,
        logoBase64: logoPreview,
        bgBase64: bgPreview,
      });
      showAlert("Identidade da loja atualizada com sucesso! As mudanças já estão visíveis.", "Sucesso", "success");
    } catch (error) {
      showAlert("Erro ao salvar identidade: " + error.message, "Erro", "error");
    } finally {
      setSavingIdentity(false);
    }
  };

  const userColumns = [
    { key: "nome", label: "Nome completo", bold: true },
    { key: "username", label: "Login / Usuário", format: (v) => <span className="font-mono text-surface-500">{v}</span> },
    { 
      key: "cargo", 
      label: "Permissão", 
      align: "center",
      format: (v) => {
        let type = "success";
        let label = "Vendedor";
        if (v === "admin") { type = "secondary"; label = "Administrador"; }
        else if (v === "caixa") { type = "warning"; label = "Caixa"; }
        else if (v) { label = v.charAt(0).toUpperCase() + v.slice(1); }
        return <StatusBadge type={type} label={label} />;
      }
    },
    {
      key: "actions",
      label: "Ação",
      align: "center",
      format: (_, row) => (
        <button
          onClick={() => handleDeleteUser(row.id)}
          className="text-red-400 hover:text-red-600 hover:bg-red-500/10 text-red-500 p-2 rounded-lg transition"
          title="Excluir Usuário"
        >
          <i className="fas fa-trash"></i>
        </button>
      )
    }
  ];

  return (
    <div className="p-4 md:p-6 h-full flex flex-col overflow-y-auto bg-surface-50 custom-scrollbar">
      <div className="mb-6">
        <h1 className="text-xl md:text-2xl font-black text-surface-800 tracking-tight">Painel de Configurações</h1>
        <p className="text-xs text-surface-500 mt-1">Ajuste taxas, gerencie usuários e personalize a identidade da loja.</p>
      </div>

      {/* ====== SEÇÃO: IDENTIDADE DA LOJA (WHITE LABEL) ====== */}
      <div className="bg-surface-100 p-6 rounded-2xl shadow-sm border border-surface-200 mb-6">
        <h2 className="text-sm font-black mb-6 text-surface-800 uppercase tracking-widest border-b pb-4 flex items-center gap-2">
          <i className="fas fa-palette text-primary"></i> Identidade da Loja
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Coluna 1: Dados básicos */}
          <div className="space-y-4">
            <h3 className="text-[10px] font-black text-surface-400 uppercase tracking-widest mb-2">Dados da Empresa</h3>
            <FormField
              label="Nome da Loja *"
              placeholder="Ex: Barba Pneus"
              value={identity.nome}
              onChange={(v) => setIdentity({ ...identity, nome: v })}
              icon="fa-store"
            />
            <FormField
              label="Subtítulo do Sistema"
              placeholder="Ex: Terminal de Vendas"
              value={identity.subtitulo}
              onChange={(v) => setIdentity({ ...identity, subtitulo: v })}
              icon="fa-tag"
            />
            <FormField
              label="Endereço"
              placeholder="Av. Principal, 100"
              value={identity.endereco}
              onChange={(v) => setIdentity({ ...identity, endereco: v })}
              icon="fa-map-marker-alt"
            />
            <FormField
              label="Cidade / UF"
              placeholder="Ex: São Paulo/SP"
              value={identity.cidade}
              onChange={(v) => setIdentity({ ...identity, cidade: v })}
              icon="fa-city"
            />
            <FormField
              label="Telefone"
              placeholder="(00) 00000-0000"
              value={identity.telefone}
              onChange={(v) => setIdentity({ ...identity, telefone: v })}
              icon="fa-phone"
            />
            <FormField
              label="CNPJ"
              placeholder="00.000.000/0000-00"
              value={identity.documento}
              onChange={(v) => setIdentity({ ...identity, documento: v })}
              icon="fa-file-alt"
            />
          </div>

          {/* Coluna 2: Cores + Dev */}
          <div className="space-y-4">
            <h3 className="text-[10px] font-black text-surface-400 uppercase tracking-widest mb-2">Aparência</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black text-surface-400 uppercase tracking-widest mb-1 ml-1 block">Cor Primária</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={identity.corPrimaria}
                    onChange={(e) => setIdentity({ ...identity, corPrimaria: e.target.value })}
                    className="w-10 h-10 rounded-lg border border-surface-200 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={identity.corPrimaria}
                    onChange={(e) => setIdentity({ ...identity, corPrimaria: e.target.value })}
                    className="flex-1 border border-surface-300 rounded-xl p-2 text-sm font-mono font-bold text-surface-600 outline-none"
                    maxLength={7}
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black text-surface-400 uppercase tracking-widest mb-1 ml-1 block">Cor Secundária</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={identity.corSecundaria}
                    onChange={(e) => setIdentity({ ...identity, corSecundaria: e.target.value })}
                    className="w-10 h-10 rounded-lg border border-surface-200 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={identity.corSecundaria}
                    onChange={(e) => setIdentity({ ...identity, corSecundaria: e.target.value })}
                    className="flex-1 border border-surface-300 rounded-xl p-2 text-sm font-mono font-bold text-surface-600 outline-none"
                    maxLength={7}
                  />
                </div>
              </div>
            </div>

            {/* Preview de cores */}
            <div className="p-4 rounded-xl border border-surface-200 bg-surface-50">
              <p className="text-[10px] font-black text-surface-400 uppercase tracking-widest mb-3">Pré-visualização</p>
              <div className="flex gap-2 mb-3">
                <div className="h-8 flex-1 rounded-lg" style={{ backgroundColor: identity.corPrimaria }}></div>
                <div className="h-8 flex-1 rounded-lg" style={{ backgroundColor: identity.corSecundaria }}></div>
              </div>
              <div className="h-2 rounded-full" style={{ background: `linear-gradient(90deg, ${identity.corPrimaria}, ${identity.corSecundaria})` }}></div>
            </div>

            <div className="pt-4 border-t border-surface-200">
              <h3 className="text-[10px] font-black text-surface-400 uppercase tracking-widest mb-3">Créditos do Desenvolvedor</h3>
              <FormField
                label="Nome / @usuario"
                placeholder="Ex: @eminobre"
                value={identity.devNome}
                onChange={(v) => setIdentity({ ...identity, devNome: v })}
                icon="fa-code"
              />
              <div className="mt-3">
                <FormField
                  label="Link (opcional)"
                  placeholder="https://instagram.com/..."
                  value={identity.devLink}
                  onChange={(v) => setIdentity({ ...identity, devLink: v })}
                  icon="fa-link"
                />
              </div>
            </div>
          </div>

          {/* Coluna 3: Uploads */}
          <div className="space-y-4">
            <h3 className="text-[10px] font-black text-surface-400 uppercase tracking-widest mb-2">Imagens</h3>

            {/* Logo para Recibo */}
            <div className="p-4 border border-surface-200 rounded-xl bg-surface-50">
              <label className="text-[10px] font-black text-surface-400 uppercase tracking-widest mb-2 block">
                Logo do Recibo (Impressora Térmica)
              </label>
              <p className="text-[9px] text-surface-400 mb-3 leading-relaxed">
                A imagem será automaticamente convertida para <strong>preto e branco</strong>, redimensionada para <strong>200px</strong> de largura e otimizada para impressão térmica.
              </p>
              <input ref={logoInputRef} type="file" accept="image/*" onChange={handleLogoUpload} className="hidden bg-surface-100 text-surface-800 border-surface-300 focus:ring-primary-500/20" />
              
              {logoPreview ? (
                <div className="flex items-center gap-3">
                  <div className="bg-surface-100 border border-surface-200 rounded-lg p-2 flex items-center justify-center" style={{ width: 80, height: 60 }}>
                    <img src={logoPreview} alt="Logo" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <button
                      onClick={() => logoInputRef.current?.click()}
                      className="text-xs font-bold text-primary hover:underline"
                    >
                      <i className="fas fa-redo mr-1"></i> Trocar
                    </button>
                    <button
                      onClick={() => setLogoPreview("")}
                      className="text-xs font-bold text-red-500 hover:underline"
                    >
                      <i className="fas fa-trash mr-1"></i> Remover
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => logoInputRef.current?.click()}
                  className="w-full border-2 border-dashed border-surface-300 rounded-xl py-6 text-center hover:border-surface-500 transition text-surface-400 hover:text-surface-600"
                >
                  <i className="fas fa-cloud-upload-alt text-2xl mb-2 block"></i>
                  <span className="text-xs font-bold">Clique para enviar logo</span>
                </button>
              )}
            </div>

            {/* Background do Login */}
            <div className="p-4 border border-surface-200 rounded-xl bg-surface-50">
              <label className="text-[10px] font-black text-surface-400 uppercase tracking-widest mb-2 block">
                Fundo da Tela de Login
              </label>
              <p className="text-[9px] text-surface-400 mb-3 leading-relaxed">
                Se nenhuma imagem for enviada, será usado um <strong>gradiente elegante</strong> com as cores primária e secundária.
              </p>
              <input ref={bgInputRef} type="file" accept="image/*" onChange={handleBgUpload} className="hidden bg-surface-100 text-surface-800 border-surface-300 focus:ring-primary-500/20" />

              {bgPreview ? (
                <div>
                  <div className="w-full h-24 rounded-lg overflow-hidden border border-surface-200 mb-2">
                    <img src={bgPreview} alt="Background" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => bgInputRef.current?.click()}
                      className="flex-1 text-xs font-bold text-primary hover:underline py-1"
                    >
                      <i className="fas fa-redo mr-1"></i> Trocar
                    </button>
                    <button
                      onClick={() => setBgPreview("")}
                      className="flex-1 text-xs font-bold text-red-500 hover:underline py-1"
                    >
                      <i className="fas fa-trash mr-1"></i> Remover
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => bgInputRef.current?.click()}
                  className="w-full border-2 border-dashed border-surface-300 rounded-xl py-6 text-center hover:border-surface-500 transition text-surface-400 hover:text-surface-600"
                >
                  <i className="fas fa-image text-2xl mb-2 block"></i>
                  <span className="text-xs font-bold">Clique para enviar imagem de fundo</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Botão Salvar Identidade */}
        <div className="mt-8 pt-6 border-t border-surface-200 flex justify-end">
          <button
            onClick={handleSaveIdentity}
            disabled={savingIdentity}
            className="bg-primary text-white px-8 py-3.5 rounded-xl font-black text-sm hover:bg-primary-700 transition shadow-md active:scale-95 disabled:opacity-50 flex items-center gap-2"
          >
            {savingIdentity ? (
              <><i className="fas fa-circle-notch fa-spin"></i> SALVANDO...</>
            ) : (
              <><i className="fas fa-save"></i> SALVAR IDENTIDADE</>
            )}
          </button>
        </div>
      </div>

      {/* ====== SEÇÕES EXISTENTES ====== */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
        {/* Card Comissão */}
        <div className="bg-surface-100 p-6 rounded-2xl shadow-sm border border-surface-200 flex flex-col">
          <h2 className="text-sm font-black mb-6 text-surface-800 uppercase tracking-widest border-b pb-4 flex items-center gap-2">
            <i className="fas fa-percent text-primary"></i> Taxas de Comissão
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
            className="w-full bg-primary text-white py-3.5 rounded-xl font-black text-sm hover:bg-primary-700 transition mt-6 shadow-md active:scale-95 disabled:opacity-50"
          >
            {isLoading ? "SALVANDO..." : "ATUALIZAR TAXAS"}
          </button>
        </div>

        {/* Card Temas (Local) */}
        <div className="bg-surface-100 p-6 rounded-2xl shadow-sm border border-surface-200 flex flex-col">
          <h2 className="text-sm font-black mb-6 text-surface-800 uppercase tracking-widest border-b pb-4 flex items-center gap-2">
            <i className="fas fa-paint-roller text-primary"></i> Interface Local (Temas)
          </h2>
          <p className="text-[11px] text-surface-500 mb-4 tracking-wide">
            A cor será aplicada instantaneamente apenas neste navegador (via localStorage).
          </p>
          <div className="flex flex-wrap gap-3 flex-1">
            {availableThemes.map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  updateTenant("corPrimaria", t.color);
                  setIdentity({...identity, corPrimaria: t.color});
                }}
                title={t.name}
                className={`w-10 h-10 rounded-full border-2 transition-transform ${identity.corPrimaria.toUpperCase() === t.color.toUpperCase() ? 'border-gray-900 scale-110 shadow-lg' : 'border-transparent shadow-sm hover:scale-105'}`}
                style={{ backgroundColor: t.color }}
              >
                {identity.corPrimaria.toUpperCase() === t.color.toUpperCase() && <i className="fas fa-check text-white text-xs drop-shadow-md"></i>}
              </button>
            ))}
          </div>
        </div>

        {/* Card Impressora e Backup */}
        <div className="space-y-6">
          <div className="bg-surface-100 p-6 rounded-2xl shadow-sm border border-surface-200">
             <h2 className="text-sm font-black mb-4 text-surface-800 uppercase tracking-widest border-b pb-4 flex items-center gap-2">
               <i className="fas fa-print text-surface-600"></i> Impressão
             </h2>
             <div className="flex gap-2 items-end">
               <div className="flex-1">
                 <label className="text-[10px] font-black text-surface-400 uppercase tracking-widest mb-1 block ml-1">Dispositivo Padrão</label>
                 <select
                   className="w-full border border-surface-300 rounded-xl p-2.5 bg-surface-100 outline-none focus:ring-2 focus:ring-primary-100 transition text-sm font-medium"
                   value={selectedPrinter}
                   onChange={(e) => setSelectedPrinter(e.target.value)}
                 >
                   <option value="">Configuração do Windows</option>
                   {printers.map((p) => <option key={p.name} value={p.name}>{p.name}</option>)}
                 </select>
               </div>
                <button
                  onClick={handleSavePrinter}
                  className="bg-primary px-5 py-2.5 rounded-xl font-bold text-xs hover:bg-primary-700 text-white transition shadow-md active:scale-95"
                >
                  OK
                </button>
             </div>
          </div>

          <div className="bg-surface-100 p-6 rounded-2xl shadow-sm border border-surface-200 grow">
             <h2 className="text-sm font-black mb-4 text-surface-800 uppercase tracking-widest border-b pb-4 flex items-center gap-2">
               <i className="fas fa-database text-green-600"></i> Manutenção Local
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
                  className="bg-orange-500/10 text-orange-600 border border-orange-500/20 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-orange-500/20 transition active:scale-95 flex flex-col items-center gap-2"
                >
                  <i className="fas fa-upload fa-lg"></i> Restaurar
                </button>
             </div>
          </div>

          {/* NOVO: Turso Cloud Sync Section */}
          <TursoSyncCard showAlert={showAlert} />
        </div>


        {/* Card Cargos */}
        <div className="bg-surface-100 p-6 rounded-2xl shadow-sm border border-surface-200 flex flex-col max-h-[400px]">
          <h2 className="text-sm font-black mb-4 text-surface-800 uppercase tracking-widest border-b pb-4 flex items-center gap-2">
            <i className="fas fa-id-badge text-purple-600"></i> Gerenciar Cargos
          </h2>
          <form onSubmit={handleAddRole} className="flex gap-2 mb-4">
            <input
              type="text"
              className="flex-1 border border-surface-300 rounded-xl p-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-purple-100 bg-surface-100 text-surface-800 border-surface-300 focus:ring-primary-500/20"
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
                className="flex justify-between items-center p-3 bg-surface-50 rounded-xl border border-surface-200 hover:border-purple-500/30 transition group"
              >
                <span className="text-sm font-bold text-surface-800 uppercase tracking-tight">{role.nome}</span>
                <button
                  onClick={() => handleDeleteRole(role.id)}
                  className="text-surface-300 hover:text-red-500 p-1.5 transition"
                  title="Excluir"
                >
                  <i className="fas fa-trash-alt text-xs"></i>
                </button>
              </div>
            ))}
            {roles.length === 0 && <p className="text-surface-400 text-[10px] text-center mt-10 uppercase tracking-widest font-black opacity-30">Nenhum cargo</p>}
          </div>
        </div>
      </div>

      {/* Gestão de Usuários */}
      <div className="bg-surface-100 p-6 rounded-2xl shadow-sm border border-surface-200">
        <h2 className="text-sm font-black mb-6 text-surface-800 uppercase tracking-widest border-b pb-4 flex items-center gap-2">
          <i className="fas fa-users-cog text-indigo-600"></i> Usuários de Acesso
        </h2>

        <div className="flex flex-col lg:flex-row gap-8">
          <form onSubmit={handleAddUser} className="lg:w-80 xl:w-96 space-y-4 shrink-0 bg-surface-50 p-6 rounded-2xl border border-surface-200">
            <h3 className="text-[10px] font-black text-surface-400 uppercase tracking-widest mb-4">Novo Acesso</h3>
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
                className="absolute right-3 top-[34px] text-surface-400 hover:text-indigo-600"
              >
                <i className={`fas ${showPassword ? "fa-eye-slash" : "fa-eye"} text-xs`}></i>
              </button>
            </div>

            <div>
              <label className="text-[10px] font-black text-surface-400 uppercase tracking-widest mb-1 ml-1 block">Permissão</label>
              <select
                className="w-full border border-surface-300 rounded-xl p-2.5 bg-surface-100 outline-none focus:ring-2 focus:ring-indigo-100 transition text-sm font-medium"
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
            <h3 className="text-[10px] font-black text-surface-400 uppercase tracking-widest mb-4 ml-4">Usuários com Acesso ao Terminal</h3>
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

// === COMPONENTE AUXILIAR: TursoSyncCard ===
const TursoSyncCard = ({ showAlert }) => {
  const [syncState, setSyncState] = useState({ syncStatus: "idle", lastSync: null });
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTokenVisible, setIsTokenVisible] = useState(false);
  
  const [cloudConfig, setCloudConfig] = useState({
    url: "",
    authToken: "",
  });

  useEffect(() => {
    const init = async () => {
      // 1. Busca o status de sync
      const status = await window.api.getSyncStatus();
      setSyncState(status);

      // 2. Busca a configuração de nuvem atual
      const config = await window.api.getCloudConfig();
      if (config) setCloudConfig(config);
    };
    init();

    const removeListener = window.api.onSyncEvent((data) => {
      setSyncState(data);
      if (data.syncStatus === "success") {
        setIsSyncing(false);
        setIsSaving(false);
      }
    });

    return () => removeListener && removeListener();
  }, []);

  const handleManualSync = async () => {
    setIsSyncing(true);
    const result = await window.api.forceSync();
    if (result.success) {
      showAlert("Banco de dados sincronizado com a nuvem!", "Nuvem", "success");
    } else {
      showAlert("Erro ao sincronizar: " + result.error, "Falha na Nuvem", "error");
    }
    setIsSyncing(false);
  };

  const handleSaveConfig = async () => {
    if (!cloudConfig.url || !cloudConfig.authToken) {
      return showAlert("Preencha a URL e o Token para conectar.", "Atenção", "warning");
    }

    setIsSaving(true);
    const result = await window.api.saveCloudConfig(cloudConfig);
    
    if (result.success) {
      showAlert("Configurações salvas e conexão estabelecida!", "Sucesso", "success");
    } else {
      showAlert("Erro ao conectar: " + result.error, "Falha", "error");
    }
    setIsSaving(false);
  };

  const getStatusInfo = () => {
    switch (syncState.syncStatus) {
      case "syncing": return { color: "text-blue-500", icon: "fa-sync fa-spin", label: "Sincronizando..." };
      case "success": return { color: "text-green-500", icon: "fa-check-circle", label: "Nuven Conectada" };
      case "error": return { color: "text-red-500", icon: "fa-exclamation-triangle", label: "Erro de Conexão" };
      default: return { color: "text-surface-400", icon: "fa-cloud", label: "Modo Offline" };
    }
  };

  const info = getStatusInfo();

  return (
    <div className="bg-surface-100 p-6 rounded-2xl shadow-sm border border-surface-200">
      <h2 className="text-sm font-black mb-4 text-surface-800 uppercase tracking-widest border-b pb-4 flex items-center gap-2">
        <i className="fas fa-cloud text-blue-500"></i> Sincronização em Nuvem (Turso)
      </h2>
      
      <div className="flex flex-col gap-4">
        {/* Status Indicator */}
        <div className="flex items-center justify-between p-3 bg-surface-50 rounded-xl border border-surface-200">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center bg-white shadow-sm ${info.color}`}>
              <i className={`fas ${info.icon} text-lg`}></i>
            </div>
            <div>
              <p className={`text-xs font-black uppercase tracking-tight ${info.color}`}>{info.label}</p>
              <p className="text-[10px] text-surface-500">
                {syncState.lastSync ? `Última: ${dayjs(syncState.lastSync).format("DD/MM HH:mm")}` : "Nunca sincronizado"}
              </p>
            </div>
          </div>
          <button
            onClick={handleManualSync}
            disabled={isSyncing || !cloudConfig.url}
            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition disabled:opacity-30"
            title="Sincronizar Agora"
          >
            <i className={`fas fa-sync ${isSyncing ? "fa-spin" : ""}`}></i>
          </button>
        </div>

        {/* Cloud Credentials Form */}
        <div className="space-y-4 pt-2">
          <h3 className="text-[10px] font-black text-surface-400 uppercase tracking-widest mb-2">Configurações de Acesso</h3>
          
          <FormField
            label="URL da Nuvem (Turso)"
            placeholder="libsql://...turso.io"
            value={cloudConfig.url}
            onChange={(v) => setCloudConfig({ ...cloudConfig, url: v })}
            icon="fa-globe"
          />

          <div className="relative">
            <FormField
              label="Token de Autenticação"
              type={isTokenVisible ? "text" : "password"}
              placeholder="Cole o token aqui..."
              value={cloudConfig.authToken}
              onChange={(v) => setCloudConfig({ ...cloudConfig, authToken: v })}
              icon="fa-key"
            />
            <button
              type="button"
              onClick={() => setIsTokenVisible(!isTokenVisible)}
              className="absolute right-3 top-[34px] text-surface-400 hover:text-blue-600"
            >
              <i className={`fas ${isTokenVisible ? "fa-eye-slash" : "fa-eye"} text-xs`}></i>
            </button>
          </div>

          <button
            onClick={handleSaveConfig}
            disabled={isSaving}
            className="w-full bg-surface-800 text-white py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-surface-900 transition shadow-md active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isSaving ? <i className="fas fa-circle-notch fa-spin"></i> : <i className="fas fa-save"></i>}
            {isSaving ? "CONFIGURANDO..." : "SALVAR E CONECTAR"}
          </button>
        </div>
      </div>
    </div>
  );
};


export default Config;

