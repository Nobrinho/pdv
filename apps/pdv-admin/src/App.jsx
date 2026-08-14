import React, { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { queryClient } from "./queryClient";
import { api, clearSession, getBaseUrl, getStoredUser, getToken, setUnauthorizedHandler } from "./api";
import { Icon } from "./Icon";

// Limpa o cache (memória + persistido) ao encerrar a sessão do admin.
const clearAdminCache = () => {
  try {
    queryClient.clear();
    localStorage.removeItem("syscontrol-admin-rq-cache");
  } catch {
    /* ignore */
  }
};

const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const blockedStatuses = ["blocked", "suspended", "cancelled"];

function statusLabel(status) {
  const map = {
    active: "Ativa",
    trial: "Teste",
    blocked: "Bloqueada",
    suspended: "Suspensa",
    cancelled: "Cancelada",
    past_due: "Vencida",
  };
  return map[status] || status || "Indefinido";
}

function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const result = await api.login({ email, password });
      onLogin(result.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login-shell">
      <form className="login-card" onSubmit={submit}>
        <div className="brand-mark">
          <Icon name="shield-check" size={22} />
        </div>
        <h1>SysControl Admin</h1>
        <p>{getBaseUrl()}</p>

        <label>
          Email
          <input value={email} onChange={(event) => setEmail(event.target.value)} />
        </label>
        <label>
          Senha
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>

        {error && <div className="error">{error}</div>}

        <button disabled={loading}>
          <Icon name={loading ? "loader" : "log-in"} className={loading ? "icon-spin" : ""} />
          {loading ? "Entrando" : "Entrar"}
        </button>
      </form>
    </main>
  );
}

function StoreRow({ store, onBlock, onUnblock, onDetails, busy }) {
  const blocked = blockedStatuses.includes(store.status);
  return (
    <tr>
      <td className="cell-main">
        <strong>{store.nome}</strong>
        <span className="mono">#{store.id} {store.cidade ? `- ${store.cidade}` : ""}</span>
      </td>
      <td data-label="Status">
        <span className={`pill ${blocked ? "danger" : "ok"}`}>{statusLabel(store.status)}</span>
      </td>
      <td data-label="Plano">{store.plano_nome || "Padrao"}</td>
      <td className="num" data-label="Faturamento">{money.format(store.faturamento || 0)}</td>
      <td className="num" data-label="Vendas">{store.total_vendas || 0}</td>
      <td className="num" data-label="Usuários">{store.total_usuarios || 0}</td>
      <td className="num" data-label="Produtos">{store.total_produtos || 0}</td>
      <td className="actions" data-label="Ações">
        <button className="ghost" disabled={busy} onClick={() => onDetails(store)}>
          <Icon name="eye" size={15} />
          Detalhes
        </button>
        {blocked ? (
          <button className="ghost ok" disabled={busy} onClick={() => onUnblock(store)}>
            <Icon name="lock-open" size={15} />
            Liberar
          </button>
        ) : (
          <button className="ghost danger" disabled={busy} onClick={() => onBlock(store)}>
            <Icon name="ban" size={15} />
            Bloquear
          </button>
        )}
      </td>
    </tr>
  );
}

function StoreDrawer({ store, onClose }) {
  const queryClient = useQueryClient();
  const usersQuery = useQuery({ queryKey: ["admin-store-users", store.id], queryFn: () => api.storeUsers(store.id) });
  const devicesQuery = useQuery({ queryKey: ["admin-store-devices", store.id], queryFn: () => api.storeDevices(store.id) });
  const users = usersQuery.data || [];
  const devices = devicesQuery.data || [];
  const loading = usersQuery.isLoading || devicesQuery.isLoading;
  const [actionError, setError] = useState("");
  const error = actionError || usersQuery.error?.message || devicesQuery.error?.message || "";
  const [busyDevice, setBusyDevice] = useState(null);
  const [busyUser, setBusyUser] = useState(null);

  const reloadUsers = () => queryClient.invalidateQueries({ queryKey: ["admin-store-users", store.id] });
  const reloadDevices = () => queryClient.invalidateQueries({ queryKey: ["admin-store-devices", store.id] });

  const resetPassword = async (user) => {
    setBusyUser(user.id);
    setError("");
    try {
      const res = await api.resetUserPassword(store.id, user.id);
      if (res.success) window.alert(`Nova senha de ${user.username}: ${res.password}\n\nAnote e repasse ao usuario.`);
      else setError(res.error || "Falha ao resetar senha.");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyUser(null);
    }
  };

  const toggleUser = async (user) => {
    setBusyUser(user.id);
    setError("");
    try {
      const res = await api.setUserActive(store.id, user.id, !user.ativo);
      if (res.success) await reloadUsers();
      else setError(res.error || "Falha ao alterar usuario.");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyUser(null);
    }
  };

  const toggleDevice = async (device) => {
    setBusyDevice(device.id);
    try {
      if (device.autorizado) await api.blockDevice(store.id, device.id);
      else await api.authorizeDevice(store.id, device.id);
      await reloadDevices();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyDevice(null);
    }
  };

  const removeDevice = async (device) => {
    if (!window.confirm(`Excluir o dispositivo "${device.nome_maquina}"? Ele libera uma vaga do limite do plano.`)) return;
    setBusyDevice(device.id);
    try {
      const res = await api.deleteDevice(store.id, device.id);
      if (res.success) await reloadDevices();
      else setError(res.error || "Falha ao excluir dispositivo.");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyDevice(null);
    }
  };

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <aside className="drawer" onClick={(e) => e.stopPropagation()}>
        <header className="drawer-head">
          <div>
            <h2>{store.nome}</h2>
            <p>#{store.id} · {statusLabel(store.status)} · {store.plano_nome || "Padrao"}</p>
          </div>
          <button className="ghost" onClick={onClose} aria-label="Fechar"><Icon name="x" size={18} /></button>
        </header>

        {error && <div className="error wide">{error}</div>}

        <section className="drawer-block">
          <h3><Icon name="users" size={14} /> Usuarios ({users.length})</h3>
          {loading ? <p className="muted">Carregando...</p> : (
            <div className="detail-list">
              {users.map((u) => (
                <div key={u.id} className="detail-card">
                  <div className="detail-info">
                    <strong>{u.nome}</strong>
                    <span>{u.username} · {u.cargo}</span>
                  </div>
                  <span className={`pill ${u.ativo ? "ok" : "danger"}`}>{u.ativo ? "Ativo" : "Inativo"}</span>
                  <div className="detail-actions">
                    <button className="ghost" disabled={busyUser === u.id} onClick={() => resetPassword(u)}>
                      <Icon name="key" size={15} /> Senha
                    </button>
                    <button className={`ghost ${u.ativo ? "danger" : "ok"}`} disabled={busyUser === u.id} onClick={() => toggleUser(u)}>
                      <Icon name={u.ativo ? "user-x" : "user-check"} size={15} />
                      {u.ativo ? "Desativar" : "Ativar"}
                    </button>
                  </div>
                </div>
              ))}
              {!users.length && <p className="muted">Nenhum usuario.</p>}
            </div>
          )}
        </section>

        <section className="drawer-block">
          <h3><Icon name="monitor" size={14} /> Dispositivos ({devices.length})</h3>
          {loading ? <p className="muted">Carregando...</p> : (
            <div className="detail-list">
              {devices.map((d) => (
                <div key={d.id} className="detail-card">
                  <div className="detail-info">
                    <strong>{d.nome_maquina}</strong>
                    <span className="mono">{d.device_id}</span>
                  </div>
                  <span className={`pill ${d.autorizado ? "ok" : "danger"}`}>{d.autorizado ? "Autorizado" : "Bloqueado"}</span>
                  <div className="detail-actions">
                    <button className={`ghost ${d.autorizado ? "danger" : "ok"}`} disabled={busyDevice === d.id} onClick={() => toggleDevice(d)}>
                      <Icon name={d.autorizado ? "ban" : "check"} size={15} />
                      {d.autorizado ? "Bloquear" : "Autorizar"}
                    </button>
                    <button className="ghost danger" disabled={busyDevice === d.id} onClick={() => removeDevice(d)} title="Excluir dispositivo">
                      <Icon name="trash-2" size={15} />
                    </button>
                  </div>
                </div>
              ))}
              {!devices.length && <p className="muted">Nenhum dispositivo.</p>}
            </div>
          )}
        </section>
      </aside>
    </div>
  );
}

function Dashboard({ user, onLogout }) {
  const queryClient = useQueryClient();
  const [view, setView] = useState("stores");
  const storesQuery = useQuery({ queryKey: ["admin-stores"], queryFn: () => api.stores() });
  const statsQuery = useQuery({ queryKey: ["admin-dashboard"], queryFn: () => api.dashboard().catch(() => null) });
  const billingQuery = useQuery({ queryKey: ["admin-billing"], queryFn: () => api.billing().catch(() => null) });
  const plansQuery = useQuery({ queryKey: ["admin-plans"], queryFn: () => api.plans().catch(() => []) });
  const stores = storesQuery.data || [];
  const stats = statsQuery.data || null;
  const billing = billingQuery.data || null;
  const plans = plansQuery.data || [];
  const loading =
    storesQuery.isFetching || statsQuery.isFetching || billingQuery.isFetching || plansQuery.isFetching;
  const [busyId, setBusyId] = useState(null);
  const [query, setQuery] = useState("");
  const [actionError, setError] = useState("");
  const error = actionError || storesQuery.error?.message || "";
  const [detailStore, setDetailStore] = useState(null);
  // Edição de planos (CRUD): overrides por id + linha de novo plano.
  const [planEdits, setPlanEdits] = useState({});
  const [newPlan, setNewPlan] = useState(null);
  const [savingPlan, setSavingPlan] = useState(null); // id ou "new"

  const refreshAll = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ["admin-stores"] }),
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] }),
      queryClient.invalidateQueries({ queryKey: ["admin-billing"] }),
      queryClient.invalidateQueries({ queryKey: ["admin-plans"] }),
    ]);

  const filteredStores = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return stores;
    return stores.filter((store) =>
      [store.id, store.nome, store.email, store.cidade, store.status]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term)),
    );
  }, [query, stores]);

  const totals = useMemo(
    () => ({
      stores: stats?.total_lojas ?? stores.length,
      active: stats?.lojas_ativas ?? stores.filter((s) => !blockedStatuses.includes(s.status)).length,
      blocked: stats?.lojas_bloqueadas ?? stores.filter((s) => blockedStatuses.includes(s.status)).length,
      revenue: stats?.faturamento_total ?? stores.reduce((sum, s) => sum + Number(s.faturamento || 0), 0),
      revenueMonth: stats?.faturamento_mes ?? 0,
      sales: stats?.total_vendas ?? 0,
      devices: stats?.total_dispositivos ?? 0,
      expenses: stores.reduce((sum, s) => sum + Number(s.despesas || 0), 0),
      net: stores.reduce((sum, s) => sum + Number(s.resultado_liquido ?? (Number(s.faturamento || 0) - Number(s.despesas || 0))), 0),
    }),
    [stats, stores],
  );

  const rankedStores = useMemo(
    () => [...stores].sort((a, b) => Number(b.faturamento || 0) - Number(a.faturamento || 0)),
    [stores],
  );

  // ---- Planos (CRUD) ----
  const planVal = (p, field) => {
    const e = planEdits[p.id];
    return e && field in e ? e[field] : p[field];
  };
  const setPlanField = (id, field, value) =>
    setPlanEdits((prev) => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  const planDirty = (p) => !!planEdits[p.id] && Object.keys(planEdits[p.id]).length > 0;

  const buildPlanPayload = (base) => ({
    id: base.id,
    nome: String(base.nome || "").trim(),
    preco_mensal: Number(base.preco_mensal) || 0,
    limite_usuarios: Number(base.limite_usuarios) || 0,
    limite_dispositivos: Number(base.limite_dispositivos) || 0,
    ativo: base.ativo == null ? true : !!base.ativo,
  });

  const savePlanRow = async (p) => {
    const payload = buildPlanPayload({ ...p, ...(planEdits[p.id] || {}) });
    if (!payload.nome) return setError("Informe o nome do plano.");
    setSavingPlan(p.id);
    try {
      await api.savePlan(payload);
      setPlanEdits((prev) => {
        const next = { ...prev };
        delete next[p.id];
        return next;
      });
      await refreshAll();
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingPlan(null);
    }
  };

  const saveNewPlan = async () => {
    const payload = buildPlanPayload(newPlan || {});
    if (!payload.nome) return setError("Informe o nome do novo plano.");
    delete payload.id;
    setSavingPlan("new");
    try {
      await api.savePlan(payload);
      setNewPlan(null);
      await refreshAll();
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingPlan(null);
    }
  };

  const blockStore = async (store) => {
    const motivo = window.prompt(`Motivo do bloqueio da loja ${store.nome}:`, "Bloqueio administrativo");
    if (motivo === null) return;
    setBusyId(store.id);
    try {
      await api.blockStore(store.id, motivo);
      await refreshAll();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  };

  const unblockStore = async (store) => {
    setBusyId(store.id);
    try {
      await api.unblockStore(store.id);
      await refreshAll();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  };

  const changePlan = async (sub, planoId) => {
    if (!planoId) return;
    setBusyId(sub.loja_id);
    try {
      await api.changePlan(sub.loja_id, Number(planoId));
      await refreshAll();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  };

  const registerPayment = async (sub) => {
    setBusyId(sub.loja_id);
    try {
      await api.registerPayment(sub.loja_id, {});
      await refreshAll();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  };

  const cancelSubscription = async (sub) => {
    if (!window.confirm(`Cancelar a assinatura da loja ${sub.loja_nome}? A loja perde o acesso.`)) return;
    setBusyId(sub.loja_id);
    try {
      await api.cancelStore(sub.loja_id, "Assinatura cancelada pelo admin");
      await refreshAll();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  };

  const runDunning = async () => {
    setError("");
    try {
      const res = await api.runDunning();
      window.alert(`Cobrança executada:\n${res.marcadas_vencidas} marcada(s) como vencida, ${res.bloqueadas} bloqueada(s). Carência: ${res.graceDays} dias.`);
      await refreshAll();
    } catch (err) {
      setError(err.message);
    }
  };

  const restoreFromFile = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,application/json";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      setError("");
      try {
        const parsed = JSON.parse(await file.text());
        const backup = parsed.backup || parsed;
        const nome = window.prompt("Nome da nova loja:", backup?.loja?.nome ? `${backup.loja.nome} (restaurada)` : "Loja restaurada");
        if (!nome) return;
        const adminUser = window.prompt("Usuario admin da nova loja:", "admin");
        if (!adminUser) return;
        const adminPass = window.prompt("Senha do admin (min 4):", "1234");
        if (!adminPass) return;
        const res = await api.restoreToNewStore({
          store: { nome },
          admin: { nome: "Administrador", username: adminUser, password: adminPass },
          backup,
        });
        if (res.success) {
          window.alert(`Loja restaurada! ID ${res.loja.id}.`);
          await refreshAll();
        } else {
          setError(res.error || "Falha ao restaurar.");
        }
      } catch (err) {
        setError(err.message);
      }
    };
    input.click();
  };

  return (
    <main className="app-shell">
      <aside>
        <div className="brand">
          <span><Icon name="shield-check" size={18} /></span>
          <div>
            <strong>SysControl</strong>
            <small>Admin</small>
          </div>
        </div>
        <nav>
          <button className={view === "stores" ? "nav-active" : ""} onClick={() => setView("stores")}>
            <Icon name="store" size={18} /> <span className="nav-label">Lojas</span>
          </button>
          <button className={view === "billing" ? "nav-active" : ""} onClick={() => setView("billing")}>
            <Icon name="line-chart" size={18} /> <span className="nav-label">Faturamento</span>
          </button>
          <button className={view === "subscriptions" ? "nav-active" : ""} onClick={() => setView("subscriptions")}>
            <Icon name="receipt-text" size={18} /> <span className="nav-label">Assinaturas</span>
          </button>
          <button className={view === "access" ? "nav-active" : ""} onClick={() => setView("access")}>
            <Icon name="users-round" size={18} /> <span className="nav-label">Acessos</span>
          </button>
        </nav>
        <button className="logout" onClick={onLogout}>
          <Icon name="log-out" size={18} /> <span className="nav-label">Sair</span>
        </button>
      </aside>

      <section className="content">
        <header>
          <div>
            <h1>
              {view === "stores" && "Controle de lojas"}
              {view === "billing" && "Faturamento da plataforma"}
              {view === "subscriptions" && "Assinaturas e planos"}
              {view === "access" && "Acessos e dispositivos"}
            </h1>
            <p>{user?.nome || user?.email}</p>
          </div>
          <div className="header-actions">
            {view === "subscriptions" && (
              <button className="refresh" onClick={runDunning} disabled={loading}>
                <Icon name="gavel" size={15} />
                Rodar cobrança
              </button>
            )}
            {view === "stores" && (
              <button className="refresh" onClick={restoreFromFile} disabled={loading}>
                <Icon name="cloud-upload" size={15} />
                Restaurar de backup
              </button>
            )}
            <button className="refresh primary" onClick={refreshAll} disabled={loading}>
              <Icon name={loading ? "loader" : "refresh-cw"} size={15} className={loading ? "icon-spin" : ""} />
              Atualizar
            </button>
          </div>
        </header>

        <div className="stats-grid">
          <article><span>Lojas</span><strong>{totals.stores}</strong></article>
          <article><span>Ativas</span><strong>{totals.active}</strong></article>
          <article><span>Bloqueadas</span><strong>{totals.blocked}</strong></article>
          <article><span>Faturamento</span><strong>{money.format(totals.revenue)}</strong></article>
          {view === "billing" && <article><span>Despesas</span><strong>{money.format(totals.expenses)}</strong></article>}
          {view === "billing" && <article><span>Resultado líquido</span><strong>{money.format(totals.net)}</strong></article>}
          {view === "billing" && <article><span>Vendas</span><strong>{totals.sales}</strong></article>}
          {view === "access" && <article><span>Dispositivos</span><strong>{totals.devices}</strong></article>}
          {view === "subscriptions" && <article><span>MRR</span><strong>{money.format(billing?.mrr || 0)}</strong></article>}
          {view === "subscriptions" && <article><span>ARR</span><strong>{money.format(billing?.arr || 0)}</strong></article>}
          {view === "subscriptions" && <article><span>Vencidas</span><strong>{billing?.assinaturas_vencidas || 0}</strong></article>}
        </div>

        {error && <div className="error wide">{error}</div>}

        {(view === "stores" || view === "access") && (
          <>
            <div className="toolbar">
              <div className="search">
                <Icon name="search" size={16} />
                <input
                  placeholder="Buscar por loja, ID, cidade ou status"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </div>
            </div>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Loja</th>
                    <th>Status</th>
                    <th>Plano</th>
                    <th>Faturamento</th>
                    <th>Vendas</th>
                    <th>Usuarios</th>
                    <th>Produtos</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStores.map((store) => (
                    <StoreRow
                      key={store.id}
                      store={store}
                      busy={busyId === store.id}
                      onBlock={blockStore}
                      onUnblock={unblockStore}
                      onDetails={setDetailStore}
                    />
                  ))}
                  {!loading && filteredStores.length === 0 && (
                    <tr>
                      <td colSpan="8" className="empty">Nenhuma loja encontrada.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        {view === "billing" && (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Loja</th>
                  <th>Plano</th>
                  <th>Status</th>
                  <th>Vendas</th>
                  <th>Faturamento</th>
                  <th>Despesas</th>
                  <th>Resultado</th>
                </tr>
              </thead>
              <tbody>
                {rankedStores.map((store, index) => {
                  const net = Number(store.resultado_liquido ?? (Number(store.faturamento || 0) - Number(store.despesas || 0)));
                  return (
                    <tr key={store.id}>
                      <td className="cell-main">
                        <strong>{index + 1}. {store.nome}</strong>
                        <span className="mono">#{store.id}</span>
                      </td>
                      <td data-label="Plano">{store.plano_nome || "Padrao"}</td>
                      <td data-label="Status"><span className={`pill ${blockedStatuses.includes(store.status) ? "danger" : "ok"}`}>{statusLabel(store.status)}</span></td>
                      <td className="num" data-label="Vendas">{store.total_vendas || 0}</td>
                      <td className="num" data-label="Faturamento">{money.format(store.faturamento || 0)}</td>
                      <td className="num" data-label="Despesas">{money.format(store.despesas || 0)}</td>
                      <td className="num" data-label="Resultado"><strong style={{ color: net < 0 ? "var(--money-negative)" : "var(--money-positive)" }}>{money.format(net)}</strong></td>
                    </tr>
                  );
                })}
                {!loading && rankedStores.length === 0 && (
                  <tr><td colSpan="7" className="empty">Sem dados de faturamento.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {view === "subscriptions" && (
          <>
            <div className="table-wrap" style={{ marginBottom: 18 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px" }}>
                <strong>Planos</strong>
                {!newPlan && (
                  <button
                    className="ghost ok"
                    onClick={() => setNewPlan({ nome: "", preco_mensal: 0, limite_usuarios: 3, limite_dispositivos: 1, ativo: true })}
                  >
                    <Icon name="plus" size={15} /> Novo plano
                  </button>
                )}
              </div>
              <table>
                <thead>
                  <tr><th>Plano</th><th>Preço/mês (R$)</th><th>Usuários</th><th>Dispositivos</th><th>Ativo</th><th>Lojas</th><th></th></tr>
                </thead>
                <tbody>
                  {plans.map((p) => {
                    const agg = (billing?.por_plano || []).find((x) => x.plano === p.nome);
                    const busy = savingPlan === p.id;
                    return (
                      <tr key={p.id}>
                        <td className="cell-main" data-label="Plano">
                          <input value={planVal(p, "nome") ?? ""} onChange={(e) => setPlanField(p.id, "nome", e.target.value)} style={{ width: "100%" }} />
                        </td>
                        <td className="num" data-label="Preço/mês">
                          <input type="number" min="0" step="1" value={planVal(p, "preco_mensal") ?? 0} onChange={(e) => setPlanField(p.id, "preco_mensal", e.target.value)} style={{ width: 90, textAlign: "right" }} />
                        </td>
                        <td className="num" data-label="Usuários">
                          <input type="number" min="0" value={planVal(p, "limite_usuarios") ?? 0} onChange={(e) => setPlanField(p.id, "limite_usuarios", e.target.value)} style={{ width: 70, textAlign: "right" }} />
                        </td>
                        <td className="num" data-label="Dispositivos">
                          <input type="number" min="0" value={planVal(p, "limite_dispositivos") ?? 0} onChange={(e) => setPlanField(p.id, "limite_dispositivos", e.target.value)} style={{ width: 70, textAlign: "right" }} />
                        </td>
                        <td data-label="Ativo">
                          <input type="checkbox" checked={!!planVal(p, "ativo")} onChange={(e) => setPlanField(p.id, "ativo", e.target.checked)} />
                        </td>
                        <td className="num" data-label="Lojas">{agg?.lojas || 0}</td>
                        <td className="actions" data-label="Ações">
                          <button className="ghost ok" disabled={busy || !planDirty(p)} onClick={() => savePlanRow(p)}>
                            {busy ? "Salvando…" : (<><Icon name="check" size={15} /> Salvar</>)}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {newPlan && (
                    <tr>
                      <td className="cell-main" data-label="Plano">
                        <input placeholder="Nome do plano" value={newPlan.nome} onChange={(e) => setNewPlan({ ...newPlan, nome: e.target.value })} style={{ width: "100%" }} autoFocus />
                      </td>
                      <td className="num" data-label="Preço/mês">
                        <input type="number" min="0" step="1" value={newPlan.preco_mensal} onChange={(e) => setNewPlan({ ...newPlan, preco_mensal: e.target.value })} style={{ width: 90, textAlign: "right" }} />
                      </td>
                      <td className="num" data-label="Usuários">
                        <input type="number" min="0" value={newPlan.limite_usuarios} onChange={(e) => setNewPlan({ ...newPlan, limite_usuarios: e.target.value })} style={{ width: 70, textAlign: "right" }} />
                      </td>
                      <td className="num" data-label="Dispositivos">
                        <input type="number" min="0" value={newPlan.limite_dispositivos} onChange={(e) => setNewPlan({ ...newPlan, limite_dispositivos: e.target.value })} style={{ width: 70, textAlign: "right" }} />
                      </td>
                      <td data-label="Ativo">
                        <input type="checkbox" checked={!!newPlan.ativo} onChange={(e) => setNewPlan({ ...newPlan, ativo: e.target.checked })} />
                      </td>
                      <td className="num">—</td>
                      <td className="actions">
                        <button className="ghost ok" disabled={savingPlan === "new"} onClick={saveNewPlan}>
                          {savingPlan === "new" ? "Criando…" : (<><Icon name="check" size={15} /> Criar</>)}
                        </button>
                        <button className="ghost" disabled={savingPlan === "new"} onClick={() => setNewPlan(null)}>
                          <Icon name="x" size={15} /> Cancelar
                        </button>
                      </td>
                    </tr>
                  )}
                  {!plans.length && !newPlan && <tr><td colSpan="7" className="empty">Nenhum plano.</td></tr>}
                </tbody>
              </table>
            </div>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Loja</th><th>Plano</th><th>Assinatura</th><th>Valor</th><th>Vencimento</th><th>Últ. pagamento</th><th></th></tr>
                </thead>
                <tbody>
                  {(billing?.assinaturas || []).map((sub) => {
                    const canceled = sub.assinatura_status === "cancelled" || sub.loja_status === "cancelled";
                    return (
                      <tr key={sub.loja_id}>
                        <td className="cell-main"><strong>{sub.loja_nome}</strong><span className="mono">#{sub.loja_id}</span></td>
                        <td className="cell-select" data-label="Plano">
                          <select
                            defaultValue=""
                            disabled={busyId === sub.loja_id}
                            onChange={(e) => changePlan(sub, e.target.value)}
                          >
                            <option value="">{sub.plano_nome || "Sem plano"}</option>
                            {plans.map((p) => (
                              <option key={p.id} value={p.id}>Trocar p/ {p.nome}</option>
                            ))}
                          </select>
                        </td>
                        <td data-label="Assinatura"><span className={`pill ${canceled ? "danger" : "ok"}`}>{statusLabel(sub.assinatura_status || sub.loja_status)}</span></td>
                        <td className="num" data-label="Valor">{money.format(sub.valor || sub.preco_mensal || 0)}</td>
                        <td className="num" data-label="Vencimento">{sub.vencimento ? String(sub.vencimento).slice(0, 10) : "-"}</td>
                        <td className="num" data-label="Últ. pagamento">{sub.ultimo_pagamento_em ? String(sub.ultimo_pagamento_em).slice(0, 10) : "-"}</td>
                        <td className="actions" data-label="Ações">
                          <button className="ghost ok" disabled={busyId === sub.loja_id} onClick={() => registerPayment(sub)}>
                            <Icon name="banknote" size={15} /> Pagamento
                          </button>
                          {!canceled && (
                            <button className="ghost danger" disabled={busyId === sub.loja_id} onClick={() => cancelSubscription(sub)}>
                              <Icon name="x" size={15} /> Cancelar
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {!(billing?.assinaturas || []).length && (
                    <tr><td colSpan="7" className="empty">Sem assinaturas.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      {detailStore && <StoreDrawer store={detailStore} onClose={() => setDetailStore(null)} />}
    </main>
  );
}

export default function App() {
  const [user, setUser] = useState(() => (getToken() ? getStoredUser() : null));

  useEffect(() => {
    // 401 global (token expirado) → volta ao login.
    setUnauthorizedHandler(() => {
      clearSession();
      clearAdminCache();
      setUser(null);
    });
    // Valida o token no boot: se expirou, cai para o login em vez de abrir
    // a interface "logada" que falha nas requisições.
    if (getToken()) {
      api
        .me()
        .then((u) => {
          if (u) setUser(u);
        })
        .catch(() => {
          clearSession();
          setUser(null);
        });
    }
    return () => setUnauthorizedHandler(null);
  }, []);

  if (!user) return <Login onLogin={setUser} />;

  return (
    <Dashboard
      user={user}
      onLogout={() => {
        clearSession();
        clearAdminCache();
        setUser(null);
      }}
    />
  );
}
