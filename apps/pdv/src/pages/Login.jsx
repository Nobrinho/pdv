import React, { useState, useEffect, useCallback } from "react";
import { useAlert } from "../context/AlertSystem";
import { api } from "../services/api";
import { useTenant } from "../context/TenantContext";
import { Icon } from "../components/ui/Icon";

const Login = ({ onLoginSuccess }) => {
  const [isSetupMode, setIsSetupMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const { showAlert } = useAlert();
  const { tenant, reloadTenant } = useTenant();
  const [appVersion, setAppVersion] = useState("");
  const isOnlineMode = api.isRemote;
  const [dataMode, setDataMode] = useState(api.dataMode);
  // Sub-modo online: entrar em loja existente (join) ou criar nova loja
  const [onlineSubMode, setOnlineSubMode] = useState("join");
  // Campo de servidor fica oculto (avancado); loja e lembrada num chip.
  const [showServer, setShowServer] = useState(false);
  const [changingStore, setChangingStore] = useState(false);
  // Login por convite/link: ?c=<codigo> na URL embute a loja.
  const [inviteCode, setInviteCode] = useState(null);
  const [inviteStore, setInviteStore] = useState(null);

  // Login State
  const [lojaId, setLojaId] = useState(() =>
    isOnlineMode ? localStorage.getItem("syscontrol_online_loja_id") || "" : "",
  );
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [apiUrl, setApiUrl] = useState(() => api.baseUrl);

  // Create-store State (modo online)
  const [createData, setCreateData] = useState({
    lojaNome: "",
    cidade: "",
    telefone: "",
    documento: "",
    adminNome: "",
    adminUser: "",
    adminPass: "",
  });

  // Setup State
  const [setupData, setSetupData] = useState({
    nome: "",
    username: "",
    password: "",
    confirmPassword: "",
  });

  const checkStatus = useCallback(async () => {
    try {
      setLoading(true);
      const [hasUsers, ver] = await Promise.all([
        api.auth.checkExist(),
        api.config.getVersion()
      ]);
      setIsSetupMode(!isOnlineMode && !hasUsers);
      setAppVersion(ver || "1.0.0");
    } catch (error) {
      console.error("Erro ao iniciar login:", error);
      showAlert("Falha na conexão com o banco de dados. Verifique o servidor.", "Erro Crítico", "error");
    } finally {
      setLoading(false);
    }
  }, [showAlert, isOnlineMode]);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  // Le o codigo do convite da URL (?c=CODIGO) e resolve a loja.
  useEffect(() => {
    if (!isOnlineMode || typeof window === "undefined") return;
    let code = new URLSearchParams(window.location.search || "").get("c");
    if (!code && window.location.hash.includes("?")) {
      code = new URLSearchParams(window.location.hash.split("?")[1]).get("c");
    }
    if (!code) return;
    setInviteCode(code);
    api.invites
      .resolve(code)
      .then((r) => {
        if (r && r.success && r.loja) {
          setInviteStore(r.loja);
          setLojaId(String(r.loja.id));
          setChangingStore(false);
        }
      })
      .catch(() => {});
  }, [isOnlineMode]);

  const handleDataModeChange = (mode) => {
    if (mode === dataMode) return;
    if (mode === "online" && apiUrl) api.setApiUrl(apiUrl);
    api.setDataMode(mode);
    setDataMode(mode);
    window.location.reload();
  };

  const handleLogin = async (e) => {
    if (e) e.preventDefault();
    if (isOnlineMode && !lojaId) return showAlert("Informe o ID da loja.", "Atenção", "warning");
    if (!username || !password) return showAlert("Informe usuário e senha.", "Atenção", "warning");
    if (submitting) return;

    setSubmitting(true);
    try {
      // Modo online: usa join (registra dispositivo e respeita limites do plano).
      const result = isOnlineMode
        ? await api.auth.joinStore({ lojaId, codigo: inviteCode || undefined, username, password })
        : await api.auth.login({ lojaId, username, password });
      if (result.success) {
        if (isOnlineMode) {
          localStorage.setItem("syscontrol_online_loja_id", String(result.loja?.id || lojaId));
          await reloadTenant();
        }
        onLoginSuccess(result.user);
      } else {
        showAlert(result.error || "Credenciais inválidas.", "Acesso Negado", "error");
      }
    } catch (error) {
      console.error(error);
      showAlert(error.message || "Falha técnica no processo de login.", "Erro", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateStore = async (e) => {
    if (e) e.preventDefault();
    if (!createData.lojaNome.trim())
      return showAlert("Informe o nome da loja.", "Atenção", "warning");
    if (!createData.adminNome.trim() || !createData.adminUser.trim())
      return showAlert("Informe nome e usuário do administrador.", "Atenção", "warning");
    if (createData.adminPass.length < 4)
      return showAlert("A senha do administrador deve ter ao menos 4 dígitos.", "Senha Curta", "warning");
    if (submitting) return;

    setSubmitting(true);
    try {
      const created = await api.auth.createStore({
        store: {
          nome: createData.lojaNome,
          cidade: createData.cidade,
          telefone: createData.telefone,
          documento: createData.documento,
        },
        admin: {
          nome: createData.adminNome,
          username: createData.adminUser,
          password: createData.adminPass,
        },
        settings: [{ chave: "loja_nome", valor: createData.lojaNome }],
      });

      if (!created.success)
        return showAlert(created.error || "Falha ao criar loja.", "Erro", "error");

      // Login automático (join) na loja recém-criada.
      const joined = await api.auth.joinStore({
        lojaId: created.loja.id,
        username: createData.adminUser,
        password: createData.adminPass,
      });

      if (joined.success) {
        localStorage.setItem("syscontrol_online_loja_id", String(created.loja.id));
        await reloadTenant();
        showAlert(`Loja criada! Seu ID de loja é ${created.loja.id}. Guarde-o.`, "Loja criada", "success");
        onLoginSuccess(joined.user);
      } else {
        setOnlineSubMode("join");
        setLojaId(String(created.loja.id));
        showAlert(`Loja criada (ID ${created.loja.id}). Faça login para entrar.`, "Loja criada", "success");
      }
    } catch (error) {
      console.error(error);
      showAlert(error.message || "Erro ao criar loja online.", "Erro", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSetup = async (e) => {
    if (e) e.preventDefault();
    if (setupData.password !== setupData.confirmPassword)
      return showAlert("As senhas digitadas não coincidem.", "Divergência", "warning");
    if (setupData.password.length < 4)
      return showAlert("A senha deve possuir ao menos 4 dígitos.", "Senha Curta", "warning");
    if (submitting) return;

    setSubmitting(true);
    try {
      const result = await api.auth.register({
        nome: setupData.nome,
        username: setupData.username,
        password: setupData.password,
        cargo: "admin",
      });

      if (result.success) {
        showAlert("Administrador criado com sucesso! Use suas credenciais para acessar.", "Bem-vindo", "success");
        setIsSetupMode(false);
        setUsername(setupData.username);
        setPassword("");
      } else {
        showAlert("Erro no cadastro: " + result.error, "Falha", "error");
      }
    } catch (error) {
      showAlert("Erro ao realizar configuração inicial.", "Erro", "error");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading)
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-gray-950 text-white">
        <div className="relative">
          <div className="w-16 h-16 border-4 rounded-full animate-spin" style={{ borderColor: `${tenant.corPrimaria}33`, borderTopColor: tenant.corPrimaria }}></div>
          <div className="absolute inset-0 flex items-center justify-center">
             <Icon name="store" size={22} style={{ color: tenant.corPrimaria }} />
          </div>
        </div>
        <p className="mt-6 text-xs font-black uppercase tracking-widest text-surface-500 animate-pulse">Iniciando Terminal...</p>
      </div>
    );

  // Background: usa imagem customizada ou gradiente bonito como fallback
  const bgStyle = tenant.bgBase64
    ? {
        backgroundImage: `url(${tenant.bgBase64})`,
        backgroundSize: "cover",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "center",
      }
    : {};

  return (
    <div
      className={`min-h-[100dvh] w-full flex p-4 relative overflow-x-hidden overflow-y-auto font-sans select-none ${
        !tenant.bgBase64 ? "bg-gradient-to-br from-gray-900 via-gray-800 to-gray-950" : ""
      }`}
      style={bgStyle}
    >
      {/* Decoração de fundo quando não tem imagem customizada */}
      {!tenant.bgBase64 && (
        <>
          <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full opacity-15 blur-3xl" style={{ backgroundColor: tenant.corPrimaria }}></div>
          <div className="absolute bottom-[-15%] right-[-10%] w-[400px] h-[400px] rounded-full opacity-10 blur-3xl" style={{ backgroundColor: tenant.corSecundaria }}></div>
          <div className="absolute top-[40%] left-[50%] w-[200px] h-[200px] rounded-full opacity-5 blur-2xl" style={{ backgroundColor: tenant.corPrimaria }}></div>
        </>
      )}

      {/* Card de Login com Glass Effect */}
      <div className="bg-surface-100/90 backdrop-blur-xl rounded-3xl sm:rounded-[2.5rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.3)] overflow-hidden w-full max-w-[420px] m-auto flex flex-col border border-white/40 relative z-10">
        
        {/* Banner de Topo com cores dinâmicas */}
        <div
          className="py-6 sm:py-10 px-6 sm:px-8 text-center relative overflow-hidden"
          style={{ background: `linear-gradient(135deg, ${tenant.corPrimaria}, ${tenant.corSecundaria})` }}
        >
          <div className="absolute top-[-20%] right-[-10%] w-40 h-40 bg-surface-100/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-[-20%] left-[-10%] w-32 h-32 rounded-full blur-2xl" style={{ backgroundColor: `${tenant.corSecundaria}33` }}></div>
          
          <div className="relative z-10">
            <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-surface-100/20 backdrop-blur-md rounded-3xl mb-3 sm:mb-4 shadow-xl border border-white/30 transform rotate-12">
               <Icon name="store" size={40} className="text-white -rotate-12" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tighter mb-1">{tenant.nome}</h1>
            <div className="flex items-center justify-center gap-2">
               <div className="h-px bg-surface-100/30 w-8"></div>
               <p className="text-[10px] font-black uppercase tracking-widest text-white/70">
                 {isSetupMode ? "Setup Inicial" : tenant.subtitulo}
               </p>
               <div className="h-px bg-surface-100/30 w-8"></div>
            </div>
          </div>
        </div>

        <div className="p-6 sm:p-10">
          {api.isElectron && (
            <div className="mb-6 grid grid-cols-2 gap-2 rounded-2xl bg-surface-200/70 p-1 text-[10px] font-black uppercase tracking-widest">
              <button
                type="button"
                onClick={() => handleDataModeChange("local")}
                className={`rounded-xl px-3 py-2 transition ${
                  dataMode === "local"
                    ? "bg-surface-100 text-surface-900 shadow-sm"
                    : "text-surface-500 hover:text-surface-800"
                }`}
              >
                Local
              </button>
              <button
                type="button"
                onClick={() => handleDataModeChange("online")}
                className={`rounded-xl px-3 py-2 transition ${
                  dataMode === "online"
                    ? "bg-surface-100 text-surface-900 shadow-sm"
                    : "text-surface-500 hover:text-surface-800"
                }`}
              >
                Online
              </button>
            </div>
          )}

          {isOnlineMode && (
            <div className="mb-4 sm:mb-6 space-y-3">
              {showServer && (
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-surface-500 uppercase tracking-widest ml-1">Servidor da API</label>
                  <input
                    className="w-full bg-surface-50 border border-surface-200 p-3 rounded-2xl text-xs font-bold outline-none transition focus:bg-surface-100 text-surface-800"
                    placeholder="http://localhost:3333"
                    value={apiUrl}
                    onChange={(e) => setApiUrl(e.target.value)}
                    onBlur={() => api.setApiUrl(apiUrl)}
                  />
                </div>
              )}
              <div className="grid grid-cols-2 gap-2 rounded-2xl bg-surface-200/70 p-1 text-[10px] font-black uppercase tracking-widest">
                <button
                  type="button"
                  onClick={() => setOnlineSubMode("join")}
                  className={`rounded-xl px-3 py-2 transition ${
                    onlineSubMode === "join"
                      ? "bg-surface-100 text-surface-900 shadow-sm"
                      : "text-surface-500 hover:text-surface-800"
                  }`}
                >
                  Entrar
                </button>
                <button
                  type="button"
                  onClick={() => setOnlineSubMode("create")}
                  className={`rounded-xl px-3 py-2 transition ${
                    onlineSubMode === "create"
                      ? "bg-surface-100 text-surface-900 shadow-sm"
                      : "text-surface-500 hover:text-surface-800"
                  }`}
                >
                  Criar loja
                </button>
              </div>
              <button
                type="button"
                onClick={() => setShowServer((v) => !v)}
                className="text-[10px] font-bold text-surface-400 hover:text-surface-600 flex items-center gap-1 mx-auto transition"
              >
                <Icon name="gear" size={11} className="inline" /> {showServer ? "Ocultar servidor" : "Avançado: servidor"}
              </button>
            </div>
          )}

          {isOnlineMode && onlineSubMode === "create" ? (
            <form onSubmit={handleCreateStore} className="space-y-4 animate-fade-in">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1 col-span-2">
                  <label className="text-[10px] font-black text-surface-500 uppercase tracking-widest ml-1">Nome da loja</label>
                  <input className="w-full bg-surface-50 border border-surface-200 p-3.5 rounded-2xl text-sm font-bold outline-none focus:bg-surface-100 text-surface-800" value={createData.lojaNome} onChange={(e) => setCreateData({ ...createData, lojaNome: e.target.value })} placeholder="Minha Loja" required />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-surface-500 uppercase tracking-widest ml-1">Cidade / UF</label>
                  <input className="w-full bg-surface-50 border border-surface-200 p-3.5 rounded-2xl text-sm font-bold outline-none focus:bg-surface-100 text-surface-800" value={createData.cidade} onChange={(e) => setCreateData({ ...createData, cidade: e.target.value })} placeholder="Manaus - AM" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-surface-500 uppercase tracking-widest ml-1">Telefone</label>
                  <input className="w-full bg-surface-50 border border-surface-200 p-3.5 rounded-2xl text-sm font-bold outline-none focus:bg-surface-100 text-surface-800" value={createData.telefone} onChange={(e) => setCreateData({ ...createData, telefone: e.target.value })} placeholder="(00) 00000-0000" />
                </div>
              </div>
              <div className="pt-2 border-t border-surface-200 space-y-4">
                <p className="text-[10px] font-black text-surface-500 uppercase tracking-widest ml-1">Administrador da loja</p>
                <input className="w-full bg-surface-50 border border-surface-200 p-3.5 rounded-2xl text-sm font-bold outline-none focus:bg-surface-100 text-surface-800" value={createData.adminNome} onChange={(e) => setCreateData({ ...createData, adminNome: e.target.value })} placeholder="Nome do administrador" required />
                <div className="grid grid-cols-2 gap-3">
                  <input className="w-full bg-surface-50 border border-surface-200 p-3.5 rounded-2xl text-sm font-bold outline-none focus:bg-surface-100 text-surface-800" value={createData.adminUser} onChange={(e) => setCreateData({ ...createData, adminUser: e.target.value })} placeholder="Login" required />
                  <input type="password" className="w-full bg-surface-50 border border-surface-200 p-3.5 rounded-2xl text-sm font-bold outline-none focus:bg-surface-100 text-surface-800" value={createData.adminPass} onChange={(e) => setCreateData({ ...createData, adminPass: e.target.value })} placeholder="Senha" required />
                </div>
              </div>
              <button type="submit" disabled={submitting} className="w-full text-white h-14 rounded-2xl font-black text-sm uppercase tracking-[0.2em] transition active:scale-[0.98] flex justify-center items-center gap-3 shadow-2xl disabled:opacity-70 disabled:cursor-not-allowed" style={{ backgroundColor: tenant.corPrimaria, boxShadow: `0 12px 30px -10px ${tenant.corPrimaria}66` }}>
                {submitting ? (<><Icon name="refresh-cw" size={15} className="animate-spin inline" /> CRIANDO...</>) : (<>CRIAR LOJA <Icon name="plus" size={13} className="inline" /></>)}
              </button>
            </form>
          ) : isSetupMode ? (
            <form onSubmit={handleSetup} className="space-y-5 animate-slide-up">
              <div className="p-4 rounded-2xl border mb-6 flex gap-4" style={{ backgroundColor: `${tenant.corPrimaria}08`, borderColor: `${tenant.corPrimaria}22` }}>
                 <Icon name="sparkles" size={16} className="mt-1" style={{ color: tenant.corPrimaria }} />
                 <p className="text-[11px] leading-relaxed font-bold" style={{ color: `${tenant.corPrimaria}cc` }}>
                   Este é o primeiro acesso. Defina as credenciais do <strong>Administrador Geral</strong> para desbloquear o sistema.
                 </p>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-surface-500 uppercase tracking-widest ml-1">Nome Completo</label>
                <input
                  className="w-full bg-surface-50 border border-surface-200 p-3.5 rounded-2xl text-sm font-bold outline-none transition focus:ring-4 focus:bg-surface-100 text-surface-800"
                  style={{ "--tw-ring-color": `${tenant.corPrimaria}15` }}
                  onFocus={(e) => e.target.style.borderColor = tenant.corPrimaria}
                  onBlur={(e) => e.target.style.borderColor = ''}
                  value={setupData.nome}
                  onChange={(e) => setSetupData({ ...setupData, nome: e.target.value })}
                  required
                  placeholder="Seu nome"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-surface-500 uppercase tracking-widest ml-1">Usuário / Login</label>
                <input
                  className="w-full bg-surface-50 border border-surface-200 p-3.5 rounded-2xl text-sm font-bold outline-none transition focus:ring-4 focus:bg-surface-100 text-surface-800"
                  onFocus={(e) => e.target.style.borderColor = tenant.corPrimaria}
                  onBlur={(e) => e.target.style.borderColor = ''}
                  value={setupData.username}
                  onChange={(e) => setSetupData({ ...setupData, username: e.target.value })}
                  required
                  placeholder="Ex: admin"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-surface-400 uppercase tracking-widest ml-1">Senha</label>
                  <input
                    type="password"
                    className="w-full bg-surface-50 border border-surface-200 p-3.5 rounded-2xl text-sm font-bold outline-none transition focus:ring-4 focus:bg-surface-100"
                    onFocus={(e) => e.target.style.borderColor = tenant.corPrimaria}
                    onBlur={(e) => e.target.style.borderColor = ''}
                    value={setupData.password}
                    onChange={(e) => setSetupData({ ...setupData, password: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-surface-400 uppercase tracking-widest ml-1">Confirmação</label>
                  <input
                    type="password"
                    className="w-full bg-surface-50 border border-surface-200 p-3.5 rounded-2xl text-sm font-bold outline-none transition focus:ring-4 focus:bg-surface-100"
                    onFocus={(e) => e.target.style.borderColor = tenant.corPrimaria}
                    onBlur={(e) => e.target.style.borderColor = ''}
                    value={setupData.confirmPassword}
                    onChange={(e) => setSetupData({ ...setupData, confirmPassword: e.target.value })}
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-surface-900 border border-surface-700 text-white h-14 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-black transition shadow-xl mt-4 active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {submitting ? (<><Icon name="refresh-cw" size={15} className="animate-spin inline" /> Ativando...</>) : "Ativar Sistema"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleLogin} className="space-y-4 sm:space-y-6 animate-fade-in">
              {isOnlineMode && (
                inviteStore ? (
                  <div className="flex items-center gap-3 bg-surface-50 border rounded-2xl p-3 pl-4" style={{ borderColor: `${tenant.corPrimaria}44` }}>
                    <Icon name="store" size={18} style={{ color: tenant.corPrimaria }} />
                    <div>
                      <p className="text-[10px] font-black text-surface-400 uppercase tracking-widest leading-none">Entrando na loja</p>
                      <p className="text-sm font-black text-surface-800 leading-tight mt-0.5">{inviteStore.nome}</p>
                    </div>
                  </div>
                ) : lojaId && !changingStore ? (
                  <div className="flex items-center justify-between bg-surface-50 border border-surface-200 rounded-2xl p-3 pl-4">
                    <span className="text-sm font-black text-surface-700 flex items-center gap-2">
                      <Icon name="store" size={14} className="inline text-[var(--muted-foreground)]" /> Loja #{lojaId}
                    </span>
                    <button
                      type="button"
                      onClick={() => { setChangingStore(true); setLojaId(""); }}
                      className="text-[11px] font-bold text-primary hover:underline"
                    >
                      trocar
                    </button>
                  </div>
                ) : (
                  <div className="space-y-1 group">
                    <label className="text-[10px] font-black text-surface-500 uppercase tracking-widest ml-1 group-focus-within:text-primary transition">ID da loja</label>
                    <div className="relative">
                      <div className="login-icon absolute inset-y-0 left-0 flex items-center pl-4 text-surface-400 group-focus-within:text-primary transition">
                        <Icon name="store" size={18} />
                      </div>
                      <input
                        className="login-input w-full bg-surface-50 border border-surface-200 pl-12 p-4 rounded-2xl text-sm font-black focus:ring-4 focus:bg-surface-100 outline-none transition text-surface-800"
                        style={{ "--tw-ring-color": `${tenant.corPrimaria}15` }}
                        onFocus={(e) => e.target.style.borderColor = tenant.corPrimaria}
                        onBlur={(e) => e.target.style.borderColor = ''}
                        placeholder="Ex: 1"
                        value={lojaId}
                        onChange={(e) => setLojaId(e.target.value)}
                        autoFocus
                      />
                    </div>
                  </div>
                )
              )}

              <div className="space-y-1 group">
                <label className="text-[10px] font-black text-surface-500 uppercase tracking-widest ml-1 group-focus-within:text-primary transition">Usuário</label>
                <div className="relative">
                  <div className="login-icon absolute inset-y-0 left-0 flex items-center pl-4 text-surface-400 group-focus-within:text-primary transition">
                    <Icon name="user-circle" size={18} />
                  </div>
                  <input
                    className="login-input w-full bg-surface-50 border border-surface-200 pl-12 p-4 rounded-2xl text-sm font-black focus:ring-4 focus:bg-surface-100 outline-none transition text-surface-800"
                    style={{ "--tw-ring-color": `${tenant.corPrimaria}15` }}
                    onFocus={(e) => e.target.style.borderColor = tenant.corPrimaria}
                    onBlur={(e) => e.target.style.borderColor = ''}
                    placeholder="ID do usuário"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    autoFocus={!isOnlineMode}
                  />
                </div>
              </div>

              <div className="space-y-1 group">
                <label className="text-[10px] font-black text-surface-500 uppercase tracking-widest ml-1 group-focus-within:text-primary transition">Senha</label>
                <div className="relative">
                  <div className="login-icon absolute inset-y-0 left-0 flex items-center pl-4 text-surface-400 group-focus-within:text-primary transition">
                    <Icon name="shield" size={18} />
                  </div>
                  <input
                    type="password"
                    className="login-input w-full bg-surface-50 border border-surface-200 pl-12 p-4 rounded-2xl text-sm font-black focus:ring-4 focus:bg-surface-100 outline-none transition text-surface-800"
                    style={{ "--tw-ring-color": `${tenant.corPrimaria}15` }}
                    onFocus={(e) => e.target.style.borderColor = tenant.corPrimaria}
                    onBlur={(e) => e.target.style.borderColor = ''}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full text-white h-14 rounded-2xl font-black text-sm uppercase tracking-[0.2em] transition transform active:scale-[0.98] flex justify-center items-center gap-3 shadow-2xl disabled:opacity-70 disabled:cursor-not-allowed"
                style={{
                  backgroundColor: tenant.corPrimaria,
                  boxShadow: `0 12px 30px -10px ${tenant.corPrimaria}66`,
                }}
                onMouseEnter={(e) => { if (!submitting) e.currentTarget.style.filter = 'brightness(1.1)'; }}
                onMouseLeave={(e) => e.currentTarget.style.filter = ''}
              >
                {submitting ? (<><Icon name="refresh-cw" size={15} className="animate-spin inline" /> ENTRANDO...</>) : (<>ENTRAR <Icon name="arrow-right" size={13} className="inline" /></>)}
              </button>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="bg-surface-200/50 p-4 sm:p-6 text-center border-t border-surface-200">
           <div className="text-[9px] font-black text-surface-400 uppercase tracking-[0.2em] mb-2 sm:mb-3">
             v{appVersion} • build production
           </div>
           <div className="text-[10px] text-surface-500 font-bold">
             &copy; {new Date().getFullYear()} {tenant.nome}.
             {tenant.devNome && (
               <>
                 {" "}
                 {tenant.devLink ? (
                   <a href={tenant.devLink} className="text-primary hover:text-primary-700" target="_blank" rel="noopener noreferrer">
                     {tenant.devNome}
                   </a>
                 ) : (
                   <span>{tenant.devNome}</span>
                 )}
               </>
             )}
           </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
