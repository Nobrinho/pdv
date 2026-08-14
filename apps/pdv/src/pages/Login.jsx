import React, { useState, useEffect, useCallback } from "react";
import { useAlert } from "../context/AlertSystem";
import { api } from "../services/api";
import { useTenant } from "../context/TenantContext";
import { Icon } from "../components/ui/Icon";

// Rótulo de campo (caps) e caixa de campo com ícone dentro — medidas do handoff:
// mobile 52px de altura, desktop 44px; foco = borda --ring + halo --ring-shadow.
const LB =
  "block text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--muted-foreground)] mb-2 ml-0.5";
const FIELD =
  "flex items-center gap-2.5 h-[52px] lg:h-11 px-3.5 lg:px-3 rounded-[var(--radius-md)] border border-[var(--input)] bg-[var(--card)] shadow-[var(--shadow-xs)] focus-within:border-[var(--ring)] focus-within:shadow-[0_0_0_3px_var(--ring-shadow)] transition";
const FIELD_INPUT =
  "flex-1 min-w-0 bg-transparent outline-none text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]";
const IN =
  "w-full h-[52px] lg:h-11 rounded-[var(--radius-md)] border border-[var(--input)] bg-[var(--card)] text-[var(--foreground)] px-3.5 text-sm outline-none transition focus:border-[var(--ring)] focus:shadow-[0_0_0_3px_var(--ring-shadow)] placeholder:text-[var(--muted-foreground)]";

const Login = ({ onLoginSuccess }) => {
  const [isSetupMode, setIsSetupMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const { showAlert } = useAlert();
  const { tenant, reloadTenant } = useTenant();
  const [appVersion, setAppVersion] = useState("");
  const isOnlineMode = api.isRemote;
  const [dataMode, setDataMode] = useState(api.dataMode);
  const [onlineSubMode, setOnlineSubMode] = useState("join");
  const [showServer, setShowServer] = useState(false);
  const [changingStore, setChangingStore] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [inviteCode, setInviteCode] = useState(null);
  const [inviteStore, setInviteStore] = useState(null);

  const [lojaId, setLojaId] = useState(() =>
    isOnlineMode ? localStorage.getItem("syscontrol_online_loja_id") || "" : "",
  );
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [apiUrl, setApiUrl] = useState(() => api.baseUrl);

  const [createData, setCreateData] = useState({
    lojaNome: "",
    cidade: "",
    telefone: "",
    documento: "",
    adminNome: "",
    adminUser: "",
    adminPass: "",
  });

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
        api.config.getVersion(),
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
      <div className="h-screen flex flex-col items-center justify-center bg-[var(--sidebar)]">
        <span className="w-14 h-14 rounded-[var(--radius-lg)] bg-[var(--primary)] flex items-center justify-center shadow-lg animate-pulse">
          <Icon name="wrench" size={26} className="text-white" />
        </span>
        <p className="mt-6 text-xs font-semibold uppercase tracking-[var(--tracking-caps)] text-[var(--sidebar-muted)]">
          Iniciando terminal…
        </p>
      </div>
    );

  const tabCls = (active) =>
    `pt-5 pb-3.5 text-sm font-semibold border-b-2 -mb-px transition ${
      active
        ? "border-[var(--primary)] text-[var(--primary)]"
        : "border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
    }`;

  const segCls = (active) =>
    `flex items-center justify-center gap-1.5 rounded-[var(--radius-sm)] px-3 py-2 text-[11px] font-semibold uppercase tracking-wide transition ${
      active ? "bg-[var(--card)] text-[var(--foreground)] shadow-sm" : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
    }`;

  const primaryBtn =
    "w-full h-[52px] lg:h-11 rounded-[var(--radius-md)] bg-[var(--primary)] text-white font-semibold text-sm hover:bg-[var(--primary-hover)] transition disabled:opacity-60 flex items-center justify-center gap-2";

  // ---- Conteúdo da marca (reaproveitado nos dois layouts) ----
  const Brand = () => (
    <>
      <span className="w-[46px] h-[46px] lg:w-14 lg:h-14 rounded-[var(--radius-lg)] bg-[var(--primary)] flex items-center justify-center shadow-lg shrink-0">
        <Icon name="wrench" size={24} className="text-white" />
      </span>
      <div>
        <h1 className="text-[22px] lg:text-2xl font-bold text-white tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
          SysControl
        </h1>
        <p className="text-[11px] uppercase tracking-[var(--tracking-caps)] text-[var(--sidebar-muted)] mt-1">
          {isSetupMode ? "Configuração inicial" : "Terminal de vendas"}
        </p>
      </div>
      {api.isElectron && dataMode === "local" && (
        <span className="inline-flex items-center gap-1.5 rounded-[var(--radius-full)] bg-white/5 border border-white/10 px-2.5 py-1 text-[11px] text-[var(--sidebar-muted)]" style={{ fontFamily: "var(--font-mono)" }}>
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--success)]" /> Modo local · offline
        </span>
      )}
    </>
  );

  const versionText = `v${appVersion}${api.isElectron ? " · app instalado" : ""} · © SysControl`;

  // ---- Corpo do formulário (abas + form + avançado) ----
  const formBody = (
    <>
      {isOnlineMode && (
        <div className="flex gap-6 border-b border-[var(--border)]">
          <button type="button" onClick={() => setOnlineSubMode("join")} className={tabCls(onlineSubMode === "join")}>
            Entrar
          </button>
          <button type="button" onClick={() => setOnlineSubMode("create")} className={tabCls(onlineSubMode === "create")}>
            Criar loja
          </button>
        </div>
      )}

      {isOnlineMode && onlineSubMode === "create" ? (
        <form onSubmit={handleCreateStore} className="flex flex-col gap-[18px]">
          <div>
            <label className={LB}>Nome da loja</label>
            <input className={IN} value={createData.lojaNome} onChange={(e) => setCreateData({ ...createData, lojaNome: e.target.value })} placeholder="Minha Loja" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LB}>Cidade / UF</label>
              <input className={IN} value={createData.cidade} onChange={(e) => setCreateData({ ...createData, cidade: e.target.value })} placeholder="Manaus - AM" />
            </div>
            <div>
              <label className={LB}>Telefone</label>
              <input className={IN} value={createData.telefone} onChange={(e) => setCreateData({ ...createData, telefone: e.target.value })} placeholder="(00) 00000-0000" />
            </div>
          </div>
          <div className="pt-1">
            <p className={LB}>Administrador da loja</p>
            <div className="flex flex-col gap-3">
              <input className={IN} value={createData.adminNome} onChange={(e) => setCreateData({ ...createData, adminNome: e.target.value })} placeholder="Nome do administrador" required />
              <div className="grid grid-cols-2 gap-3">
                <input className={IN} value={createData.adminUser} onChange={(e) => setCreateData({ ...createData, adminUser: e.target.value })} placeholder="Login" required />
                <input type="password" className={IN} value={createData.adminPass} onChange={(e) => setCreateData({ ...createData, adminPass: e.target.value })} placeholder="Senha" required />
              </div>
            </div>
          </div>
          <button type="submit" disabled={submitting} className={primaryBtn}>
            {submitting ? (<><Icon name="refresh-cw" size={15} className="animate-spin" /> Criando…</>) : (<>Criar loja <Icon name="arrow-right" size={16} /></>)}
          </button>
        </form>
      ) : isSetupMode ? (
        <form onSubmit={handleSetup} className="flex flex-col gap-[18px]">
          <div className="p-3 rounded-[var(--radius-md)] border border-[var(--primary-soft-border)] bg-[var(--primary-soft)] flex gap-3">
            <Icon name="sparkles" size={16} className="mt-0.5 text-[var(--primary-soft-foreground)] shrink-0" />
            <p className="text-[12px] leading-relaxed text-[var(--primary-soft-foreground)]">
              Este é o primeiro acesso. Defina as credenciais do <strong>administrador geral</strong> para desbloquear o sistema.
            </p>
          </div>
          <div>
            <label className={LB}>Nome completo</label>
            <input className={IN} value={setupData.nome} onChange={(e) => setSetupData({ ...setupData, nome: e.target.value })} required placeholder="Seu nome" />
          </div>
          <div>
            <label className={LB}>Usuário / login</label>
            <input className={IN} value={setupData.username} onChange={(e) => setSetupData({ ...setupData, username: e.target.value })} required placeholder="Ex: admin" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LB}>Senha</label>
              <input type="password" className={IN} value={setupData.password} onChange={(e) => setSetupData({ ...setupData, password: e.target.value })} required />
            </div>
            <div>
              <label className={LB}>Confirmação</label>
              <input type="password" className={IN} value={setupData.confirmPassword} onChange={(e) => setSetupData({ ...setupData, confirmPassword: e.target.value })} required />
            </div>
          </div>
          <button type="submit" disabled={submitting} className={primaryBtn}>
            {submitting ? (<><Icon name="refresh-cw" size={15} className="animate-spin" /> Ativando…</>) : "Ativar sistema"}
          </button>
        </form>
      ) : (
        <form onSubmit={handleLogin} className="flex flex-col gap-[18px]">
          {isOnlineMode && (
            inviteStore ? (
              <div className="flex items-center gap-3 rounded-[var(--radius-xl)] border border-[var(--primary-soft-border)] bg-[var(--primary-soft)] p-3">
                <Icon name="store" size={18} className="text-[var(--primary-soft-foreground)]" />
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[var(--tracking-caps)] text-[var(--primary-soft-foreground)] opacity-80 leading-none">Entrando na loja</p>
                  <p className="text-sm font-semibold text-[var(--primary-soft-foreground)] leading-tight mt-0.5">{inviteStore.nome}</p>
                </div>
              </div>
            ) : lojaId && !changingStore ? (
              <div className="flex items-center justify-between rounded-[var(--radius-xl)] border border-[var(--primary-soft-border)] bg-[var(--primary-soft)] p-3 pl-3.5">
                <span className="text-sm font-semibold text-[var(--primary-soft-foreground)] flex items-center gap-2">
                  <Icon name="store" size={16} /> Loja #{lojaId}
                </span>
                <button type="button" onClick={() => { setChangingStore(true); setLojaId(""); }} className="text-[12px] font-semibold text-[var(--primary)] hover:underline">
                  Trocar
                </button>
              </div>
            ) : (
              <div>
                <label className={LB}>ID da loja</label>
                <div className={FIELD}>
                  <Icon name="store" size={16} className="text-[var(--icon-muted)] shrink-0" />
                  <input className={FIELD_INPUT} placeholder="Ex: 1" value={lojaId} onChange={(e) => setLojaId(e.target.value)} autoFocus />
                </div>
              </div>
            )
          )}

          <div>
            <label className={LB}>Usuário</label>
            <div className={FIELD}>
              <Icon name="user" size={16} className="text-[var(--icon-muted)] shrink-0" />
              <input className={FIELD_INPUT} placeholder="Seu usuário" value={username} onChange={(e) => setUsername(e.target.value)} autoFocus={!isOnlineMode} />
            </div>
          </div>

          <div>
            <label className={LB}>Senha</label>
            <div className={FIELD}>
              <Icon name="lock" size={16} className="text-[var(--icon-muted)] shrink-0" />
              <input
                type={showPass ? "text" : "password"}
                className={FIELD_INPUT}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button type="button" onClick={() => setShowPass((v) => !v)} className="text-[var(--icon-muted)] hover:text-[var(--foreground)] shrink-0" aria-label={showPass ? "Ocultar senha" : "Mostrar senha"}>
                <Icon name="eye" size={16} />
              </button>
            </div>
          </div>

          <button type="submit" disabled={submitting} className={primaryBtn}>
            {submitting ? (<><Icon name="refresh-cw" size={15} className="animate-spin" /> Entrando…</>) : (<>Entrar <Icon name="arrow-right" size={16} /></>)}
          </button>
        </form>
      )}

      {(isOnlineMode || api.isElectron) && (
        <div className="text-center">
          {showServer && (
            <div className="mb-3 text-left rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--content2)] p-3 space-y-2.5">
              {api.isElectron && (
                <>
                  <div className="grid grid-cols-2 gap-1 rounded-[var(--radius-sm)] bg-[var(--background)] p-1 border border-[var(--border)]">
                    <button type="button" onClick={() => handleDataModeChange("local")} className={segCls(dataMode === "local")}>
                      <Icon name="hard-drive" size={13} /> Local
                    </button>
                    <button type="button" onClick={() => handleDataModeChange("online")} className={segCls(dataMode === "online")}>
                      <Icon name="cloud" size={13} /> Online
                    </button>
                  </div>
                  <p className="text-[11px] leading-relaxed text-[var(--muted-foreground)]">
                    {dataMode === "local"
                      ? "Local: valida o usuário no banco deste computador e funciona sem internet."
                      : "Online: conecta ao servidor da loja para sincronizar entre aparelhos."}
                  </p>
                </>
              )}
              {isOnlineMode && (
                <div>
                  <label className={LB}>Servidor da API</label>
                  <input
                    className={IN}
                    style={{ fontFamily: "var(--font-mono)" }}
                    placeholder="http://localhost:3333"
                    value={apiUrl}
                    onChange={(e) => setApiUrl(e.target.value)}
                    onBlur={() => api.setApiUrl(apiUrl)}
                  />
                </div>
              )}
            </div>
          )}
          <button type="button" onClick={() => setShowServer((v) => !v)} className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition">
            <Icon name="settings" size={12} /> {api.isElectron ? "Avançado" : "Avançado: servidor"}
            <Icon name="chevron-down" size={12} className={showServer ? "rotate-180 transition-transform" : "transition-transform"} />
          </button>
        </div>
      )}
    </>
  );

  return (
    <div className="min-h-[100dvh] relative flex flex-col lg:items-center lg:justify-center bg-[var(--sidebar)] font-sans select-none">
      {/* MARCA — cabeçalho escuro no mobile; absoluta no topo-esquerdo no desktop */}
      <div className="flex flex-col items-start gap-3.5 px-6 pt-8 pb-8 lg:absolute lg:top-16 lg:left-16 lg:p-0 lg:gap-4">
        <Brand />
      </div>

      {/* CORPO — branco full-screen no mobile; cartão 440px centralizado no desktop */}
      <div className="flex-1 lg:flex-none w-full lg:w-[440px] bg-[var(--background)] flex flex-col overflow-hidden lg:rounded-[var(--radius-xl)] lg:shadow-[var(--shadow-large)] lg:border lg:border-[var(--border)] lg:max-h-[calc(100dvh-4rem)]">
        <div className="flex-1 flex flex-col gap-[18px] px-6 lg:px-7 pt-1 pb-6 lg:py-6 overflow-y-auto">
          {formBody}
          <div className="mt-auto pt-4 text-center lg:hidden">
            <p className="text-[11px] text-[var(--muted-foreground)]" style={{ fontFamily: "var(--font-mono)" }}>{versionText}</p>
          </div>
        </div>
      </div>

      {/* VERSÃO — absoluta no rodapé-esquerdo (desktop) */}
      <p className="hidden lg:block lg:absolute lg:left-16 lg:bottom-14 text-[12px] text-[var(--sidebar-muted)]" style={{ fontFamily: "var(--font-mono)" }}>
        {versionText}
      </p>
    </div>
  );
};

export default Login;
