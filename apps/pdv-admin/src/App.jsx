import React, { useEffect, useMemo, useState } from "react";
import { api, clearSession, getBaseUrl, getStoredUser, getToken } from "./api";

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
  const [email, setEmail] = useState("admin@syscontrol.local");
  const [password, setPassword] = useState("admin123");
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
          <i className="fas fa-shield-halved"></i>
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
          <i className={`fas ${loading ? "fa-circle-notch fa-spin" : "fa-right-to-bracket"}`}></i>
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
      <td>
        <strong>{store.nome}</strong>
        <span>#{store.id} {store.cidade ? `- ${store.cidade}` : ""}</span>
      </td>
      <td>
        <span className={`pill ${blocked ? "danger" : "ok"}`}>{statusLabel(store.status)}</span>
      </td>
      <td>{store.plano_nome || "Padrao"}</td>
      <td>{money.format(store.faturamento || 0)}</td>
      <td>{store.total_vendas || 0}</td>
      <td>{store.total_usuarios || 0}</td>
      <td>{store.total_produtos || 0}</td>
      <td className="actions">
        <button className="ghost" disabled={busy} onClick={() => onDetails(store)}>
          <i className="fas fa-eye"></i>
          Detalhes
        </button>
        {blocked ? (
          <button className="ghost ok" disabled={busy} onClick={() => onUnblock(store)}>
            <i className="fas fa-lock-open"></i>
            Liberar
          </button>
        ) : (
          <button className="ghost danger" disabled={busy} onClick={() => onBlock(store)}>
            <i className="fas fa-ban"></i>
            Bloquear
          </button>
        )}
      </td>
    </tr>
  );
}

function StoreDrawer({ store, onClose }) {
  const [users, setUsers] = useState([]);
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyDevice, setBusyDevice] = useState(null);
  const [busyUser, setBusyUser] = useState(null);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [u, d] = await Promise.all([api.storeUsers(store.id), api.storeDevices(store.id)]);
      setUsers(u);
      setDevices(d);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.id]);

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
      if (res.success) await load();
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
      await load();
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
      if (res.success) await load();
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
          <button className="ghost" onClick={onClose}><i className="fas fa-xmark"></i></button>
        </header>

        {error && <div className="error wide">{error}</div>}

        <section className="drawer-block">
          <h3><i className="fas fa-users"></i> Usuarios ({users.length})</h3>
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
                      <i className="fas fa-key"></i> Senha
                    </button>
                    <button className={`ghost ${u.ativo ? "danger" : "ok"}`} disabled={busyUser === u.id} onClick={() => toggleUser(u)}>
                      <i className={`fas ${u.ativo ? "fa-user-slash" : "fa-user-check"}`}></i>
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
          <h3><i className="fas fa-desktop"></i> Dispositivos ({devices.length})</h3>
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
                      <i className={`fas ${d.autorizado ? "fa-ban" : "fa-check"}`}></i>
                      {d.autorizado ? "Bloquear" : "Autorizar"}
                    </button>
                    <button className="ghost danger" disabled={busyDevice === d.id} onClick={() => removeDevice(d)} title="Excluir dispositivo">
                      <i className="fas fa-trash"></i>
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
  const [view, setView] = useState("stores");
  const [stores, setStores] = useState([]);
  const [stats, setStats] = useState(null);
  const [billing, setBilling] = useState(null);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [detailStore, setDetailStore] = useState(null);

  const loadAll = async () => {
    setLoading(true);
    setError("");
    try {
      const [s, st, bl, pl] = await Promise.all([
        api.stores(),
        api.dashboard().catch(() => null),
        api.billing().catch(() => null),
        api.plans().catch(() => []),
      ]);
      setStores(s);
      setStats(st);
      setBilling(bl);
      setPlans(pl);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

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

  const blockStore = async (store) => {
    const motivo = window.prompt(`Motivo do bloqueio da loja ${store.nome}:`, "Bloqueio administrativo");
    if (motivo === null) return;
    setBusyId(store.id);
    try {
      await api.blockStore(store.id, motivo);
      await loadAll();
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
      await loadAll();
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
      await loadAll();
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
      await loadAll();
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
      await loadAll();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  };

  const runDunning = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.runDunning();
      window.alert(`Cobrança executada:\n${res.marcadas_vencidas} marcada(s) como vencida, ${res.bloqueadas} bloqueada(s). Carência: ${res.graceDays} dias.`);
      await loadAll();
    } catch (err) {
      setError(err.message);
      setLoading(false);
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
        setLoading(true);
        const res = await api.restoreToNewStore({
          store: { nome },
          admin: { nome: "Administrador", username: adminUser, password: adminPass },
          backup,
        });
        if (res.success) {
          window.alert(`Loja restaurada! ID ${res.loja.id}.`);
          await loadAll();
        } else {
          setError(res.error || "Falha ao restaurar.");
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    input.click();
  };

  return (
    <main className="app-shell">
      <aside>
        <div className="brand">
          <span><i className="fas fa-shield-halved"></i></span>
          <div>
            <strong>SysControl</strong>
            <small>Admin</small>
          </div>
        </div>
        <nav>
          <button className={view === "stores" ? "nav-active" : ""} onClick={() => setView("stores")}>
            <i className="fas fa-store"></i> Lojas
          </button>
          <button className={view === "billing" ? "nav-active" : ""} onClick={() => setView("billing")}>
            <i className="fas fa-chart-line"></i> Faturamento
          </button>
          <button className={view === "subscriptions" ? "nav-active" : ""} onClick={() => setView("subscriptions")}>
            <i className="fas fa-file-invoice-dollar"></i> Assinaturas
          </button>
          <button className={view === "access" ? "nav-active" : ""} onClick={() => setView("access")}>
            <i className="fas fa-users-gear"></i> Acessos
          </button>
        </nav>
        <button className="logout" onClick={onLogout}>
          <i className="fas fa-arrow-right-from-bracket"></i>
          Sair
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
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {view === "subscriptions" && (
              <button className="refresh" onClick={runDunning} disabled={loading}>
                <i className="fas fa-gavel"></i>
                Rodar cobrança
              </button>
            )}
            {view === "stores" && (
              <button className="refresh" onClick={restoreFromFile} disabled={loading}>
                <i className="fas fa-cloud-arrow-up"></i>
                Restaurar de backup
              </button>
            )}
            <button className="refresh" onClick={loadAll} disabled={loading}>
              <i className={`fas ${loading ? "fa-circle-notch fa-spin" : "fa-rotate"}`}></i>
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
                <i className="fas fa-magnifying-glass"></i>
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
                  <th>#</th>
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
                      <td>{index + 1}</td>
                      <td><strong>{store.nome}</strong><span>#{store.id}</span></td>
                      <td>{store.plano_nome || "Padrao"}</td>
                      <td><span className={`pill ${blockedStatuses.includes(store.status) ? "danger" : "ok"}`}>{statusLabel(store.status)}</span></td>
                      <td>{store.total_vendas || 0}</td>
                      <td>{money.format(store.faturamento || 0)}</td>
                      <td>{money.format(store.despesas || 0)}</td>
                      <td><strong style={{ color: net < 0 ? "#991b1b" : "#166534" }}>{money.format(net)}</strong></td>
                    </tr>
                  );
                })}
                {!loading && rankedStores.length === 0 && (
                  <tr><td colSpan="8" className="empty">Sem dados de faturamento.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {view === "subscriptions" && (
          <>
            <div className="table-wrap" style={{ marginBottom: 18 }}>
              <table>
                <thead>
                  <tr><th>Plano</th><th>Preço/mês</th><th>Limites (usuários/disp.)</th><th>Lojas</th><th>Receita</th></tr>
                </thead>
                <tbody>
                  {plans.map((p) => {
                    const agg = (billing?.por_plano || []).find((x) => x.plano === p.nome);
                    return (
                      <tr key={p.id}>
                        <td><strong>{p.nome}</strong>{!p.ativo && <span>inativo</span>}</td>
                        <td>{money.format(p.preco_mensal || 0)}</td>
                        <td>{p.limite_usuarios} / {p.limite_dispositivos}</td>
                        <td>{agg?.lojas || 0}</td>
                        <td>{money.format(agg?.receita || 0)}</td>
                      </tr>
                    );
                  })}
                  {!plans.length && <tr><td colSpan="5" className="empty">Nenhum plano.</td></tr>}
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
                        <td><strong>{sub.loja_nome}</strong><span>#{sub.loja_id}</span></td>
                        <td>
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
                        <td><span className={`pill ${canceled ? "danger" : "ok"}`}>{statusLabel(sub.assinatura_status || sub.loja_status)}</span></td>
                        <td>{money.format(sub.valor || sub.preco_mensal || 0)}</td>
                        <td>{sub.vencimento ? String(sub.vencimento).slice(0, 10) : "-"}</td>
                        <td>{sub.ultimo_pagamento_em ? String(sub.ultimo_pagamento_em).slice(0, 10) : "-"}</td>
                        <td className="actions">
                          <button className="ghost ok" disabled={busyId === sub.loja_id} onClick={() => registerPayment(sub)}>
                            <i className="fas fa-money-bill-wave"></i> Pagamento
                          </button>
                          {!canceled && (
                            <button className="ghost danger" disabled={busyId === sub.loja_id} onClick={() => cancelSubscription(sub)}>
                              <i className="fas fa-xmark"></i> Cancelar
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

  if (!user) return <Login onLogin={setUser} />;

  return (
    <Dashboard
      user={user}
      onLogout={() => {
        clearSession();
        setUser(null);
      }}
    />
  );
}
