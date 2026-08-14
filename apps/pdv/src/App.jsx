// @ts-nocheck
import React, { Suspense, lazy, useState, useEffect, useRef } from "react";
import {
  Routes,
  Route,
  useNavigate,
  useLocation,
  Navigate,
} from "react-router-dom";
import Updater from "./components/Updater";
import BottomNav from "./components/ui/BottomNav";
import { Icon } from "./components/ui/Icon";

import { useAuth } from "./context/AuthContext";
import { useTenant } from "./context/TenantContext";
import { useTheme } from "./context/ThemeContext";
import { api } from "./services/api";

const Produtos = lazy(() => import("./pages/Produtos"));
const Pessoas = lazy(() => import("./pages/Pessoas"));
const Vendas = lazy(() => import("./pages/Vendas"));
const Servicos = lazy(() => import("./pages/Servicos"));
const Recibos = lazy(() => import("./pages/Recibos"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Config = lazy(() => import("./pages/Config"));
const Login = lazy(() => import("./pages/Login"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const HistoricoPrecos = lazy(() => import("./pages/HistoricoPrecos"));
const EventLogs = lazy(() => import("./pages/EventLogs"));
const Relatorios = lazy(() => import("./pages/Relatorios"));
const Comissoes = lazy(() => import("./pages/Comissoes"));
const Despesas = lazy(() => import("./pages/Despesas"));
const Clientes = lazy(() => import("./pages/Clientes"));
const Orcamentos = lazy(() => import("./pages/Orcamentos"));
const MoreMenu = lazy(() => import("./pages/MoreMenu"));

// Barra inferior (mobile) — 5 itens fixos do design (o 5º "Mais" abre o menu).
const BOTTOM_NAV = [
  { path: "/", label: "Painel", lucide: "layout-dashboard" },
  { path: "/vendas", label: "Vendas", lucide: "shopping-cart" },
  { path: "/produtos", label: "Produtos", lucide: "package" },
  { path: "/clientes", label: "Clientes", lucide: "users" },
];

const PageFallback = () => (
  <div className="flex h-full items-center justify-center bg-surface-50 text-surface-500">
    <div className="flex flex-col items-center gap-3">
      <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary-600"></div>
      <span className="text-xs font-bold uppercase tracking-widest">Carregando...</span>
    </div>
  </div>
);

// Menu (ordem do handoff do redesign; ícones Lucide). "Caixa" não é item de
// navegação — é perfil de acesso (aparece como cargo do usuário, não aqui).
const MENU_ITEMS = [
  { path: "/", label: "Painel", lucide: "layout-dashboard", restricted: true },
  { path: "/vendas", label: "Venda", lucide: "shopping-cart", restricted: false },
  { path: "/produtos", label: "Produtos", lucide: "package", restricted: false },
  { path: "/servicos", label: "Serviços", lucide: "wrench", restricted: false },
  { path: "/recibos", label: "Recibos", lucide: "receipt", restricted: false },
  { path: "/orcamentos", label: "Orçamentos", lucide: "file-text", restricted: false },
  { path: "/clientes", label: "Clientes", lucide: "users", restricted: true },
  { path: "/comissoes", label: "Comissões", lucide: "hand-coins", restricted: true },
  { path: "/relatorios", label: "Relatórios", lucide: "line-chart", restricted: true },
  { path: "/despesas", label: "Despesas", lucide: "wallet", restricted: true },
  { path: "/pessoas", label: "Equipe", lucide: "users-round", restricted: true },
  { path: "/historico", label: "Auditoria de preços", lucide: "history", restricted: false },
  { path: "/config", label: "Configurações", lucide: "settings", restricted: true },
  // Logs de Eventos: rota acessível por URL direta, sem link na navegação.
];

function App() {
  const { user, login, logout, onboardingRequired, setOnboardingRequired, hasAccess, requestRouteAccess, unlockedRoutes } =
    useAuth();
  const { tenant } = useTenant();
  const { isDarkMode, toggleDarkMode } = useTheme();
  const [appVersion, setAppVersion] = useState("");
  const [desktopCollapsed, setDesktopCollapsed] = useState(() => {
    const saved = localStorage.getItem("sidebarCollapsed");
    return saved === "true";
  });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia("(min-width: 1024px)").matches : true,
  );
  // No mobile a sidebar vira drawer (sempre expandida); o "colapsar" so vale no desktop.
  const sidebarCollapsed = isDesktop ? desktopCollapsed : false;

  const navigate = useNavigate();
  const location = useLocation();
  const lastLoggedPathRef = useRef("");

  const sessionIdRef = useRef(null);

  // Buscar a versão assim que o componente montar
  useEffect(() => {
    const fetchVersion = async () => {
      try {
        const ver = await api.system.version();
        setAppVersion(ver);
      } catch (error) {
        console.error("Erro ao obter versão", error);
        setAppVersion("Dev");
      }
    };
    fetchVersion();
  }, []);

  useEffect(() => {
    if (!sessionIdRef.current) {
      const existing = sessionStorage.getItem("pdv_session_id");
      if (existing) {
        sessionIdRef.current = existing;
      } else {
        const newId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
        sessionStorage.setItem("pdv_session_id", newId);
        sessionIdRef.current = newId;
      }
    }
  }, []);

  const toggleSidebar = () => {
    setDesktopCollapsed((prev) => {
      const newVal = !prev;
      localStorage.setItem("sidebarCollapsed", String(newVal));
      return newVal;
    });
  };

  // Alterna entre desktop e mobile: fecha o drawer ao voltar pro desktop.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(min-width: 1024px)");
    const handler = (e) => {
      setIsDesktop(e.matches);
      if (e.matches) setMobileMenuOpen(false);
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const handleMenuClick = (path) => {
    if (user) {
      api.events.log({
        occurred_at_ms: Date.now(),
        event_category: "ui_click",
        event_type: "menu.click",
        screen: location.pathname,
        component: "SidebarMenu",
        action: "click",
        target_id: path,
        user_id: user.id,
        user_name: user.nome,
        session_id: sessionIdRef.current,
        severity: "info",
        message: `Clique no menu ${path}`,
        source: "ui",
      }).catch(() => {});
    }
    requestRouteAccess(path, navigate);
    setMobileMenuOpen(false);
  };

  useEffect(() => {
    if (!user) return;
    if (lastLoggedPathRef.current === location.pathname) return;
    lastLoggedPathRef.current = location.pathname;

    api.events.log({
      occurred_at_ms: Date.now(),
      event_category: "navigation",
      event_type: "route.enter",
      screen: location.pathname,
      component: "AppRouter",
      action: "enter",
      user_id: user.id,
      user_name: user.nome,
      session_id: sessionIdRef.current,
      severity: "info",
      message: `Navegou para ${location.pathname}`,
      source: "ui",
    }).catch(() => {});
  }, [location.pathname, user]);

  if (onboardingRequired === null) {
    return null; // Aguarda a checagem com o backend (sem tela branca graças à splash nativa)
  }

  if (onboardingRequired === true || location.pathname === "/onboarding") {
    return (
      <Suspense fallback={<PageFallback />}>
        <Onboarding />
      </Suspense>
    );
  }

  if (!user) {
    return (
      <Suspense fallback={<PageFallback />}>
        <Login onLoginSuccess={(userData) => login(userData)} />
      </Suspense>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-surface-50 font-sans text-surface-800 transition-colors duration-200">
      {/* Backdrop do drawer no mobile */}
      {mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 bg-black/50 z-[55] lg:hidden"
        ></div>
      )}
      <aside className={`${sidebarCollapsed ? "lg:w-20" : "lg:w-64"} w-64 bg-[var(--sidebar)] text-[var(--sidebar-foreground)] flex flex-col flex-shrink-0 transition-transform duration-300 shadow-2xl z-[60] fixed lg:relative inset-y-0 left-0 ${mobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
        {/* Toggle Button (desktop) */}
        <button
          onClick={toggleSidebar}
          className="hidden lg:flex absolute -right-3 top-20 bg-[var(--primary)] text-white w-6 h-6 rounded-full items-center justify-center shadow-lg transition-transform hover:scale-110 z-[70] active:scale-95"
          style={{ transform: sidebarCollapsed ? 'rotate(180deg)' : 'rotate(0deg)' }}
        >
          <Icon name="chevron-left" size={12} />
        </button>

        <div className={`h-16 flex items-center border-b border-white/10 overflow-hidden transition-all ${sidebarCollapsed ? "px-0 justify-center" : "px-4"}`}>
          <span className="w-8 h-8 rounded-lg bg-[var(--primary)] text-white flex items-center justify-center shrink-0 shadow-sm">
            <Icon name="store" size={18} />
          </span>
          {!sidebarCollapsed && <span className="ml-2.5 text-lg font-black tracking-tight truncate animate-fade-in text-white">SysControl</span>}
        </div>

        <div className={`py-4 border-b border-white/10 flex items-center transition-all ${sidebarCollapsed ? "px-2 justify-center" : "px-4 justify-between"}`}>
          <div className="flex items-center min-w-0">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center text-sm font-black shadow-sm transition-all bg-[var(--avatar-primary)] text-[var(--avatar-primary-foreground)]"
              title={user.nome}
            >
              {user.nome.charAt(0).toUpperCase()}
            </div>
            {!sidebarCollapsed && (
              <div className="ml-3 overflow-hidden animate-fade-in">
                <p
                  className="text-sm font-bold leading-none truncate w-32 text-white"
                  title={user.nome}
                >
                  {user.nome.split(" ")[0]}
                </p>
                <p className="text-[10px] text-[var(--sidebar-muted)] mt-1 capitalize flex items-center font-black">
                  {user.cargo === "admin" ? "Admin" : "Caixa"}
                </p>
              </div>
            )}
          </div>
          {!sidebarCollapsed && (
            <button
              onClick={logout}
              className="text-[var(--sidebar-muted)] hover:text-white transition px-2 animate-fade-in"
              title="Sair do Sistema"
            >
              <Icon name="power" size={16} />
            </button>
          )}
        </div>

        <nav className={`flex-1 space-y-1 overflow-y-auto custom-scrollbar transition-all ${sidebarCollapsed ? "px-2 py-4" : "px-3 py-4"}`}>
          {MENU_ITEMS.map((item) => {
            const isActive = location.pathname === item.path;
            const isLocked = !hasAccess(item.path);

            return (
              <button
                key={item.path}
                onClick={() => handleMenuClick(item.path)}
                title={sidebarCollapsed ? item.label : ""}
                className={`w-full flex items-center rounded-xl transition-all duration-200 group text-left relative overflow-hidden ${
                  sidebarCollapsed ? "justify-center h-12" : "px-4 py-2.5"
                } ${
                  isActive
                    ? "bg-[var(--primary)] text-white font-semibold shadow-sm"
                    : "text-[var(--sidebar-foreground)] hover:bg-white/5 hover:text-white"
                }`}
              >
                <Icon
                  name={item.lucide}
                  size={19}
                  className="shrink-0 transition-transform group-hover:scale-110"
                />
                {!sidebarCollapsed && (
                  <span className="ml-3 text-sm font-medium tracking-tight animate-fade-in">{item.label}</span>
                )}

                {!sidebarCollapsed && isLocked && (
                  <Icon name="lock" size={11} className="absolute right-3 text-[var(--sidebar-muted)]" />
                )}

                {sidebarCollapsed && isLocked && (
                   <div className="absolute top-1 right-1 w-2 h-2 bg-[var(--danger)] rounded-full border-2 border-[var(--sidebar)]"></div>
                )}
              </button>
            );
          })}
        </nav>

        <div className={`border-t border-white/10 transition-all ${sidebarCollapsed ? "p-4" : "px-4 py-3"}`}>
          <button
            onClick={toggleDarkMode}
            title={sidebarCollapsed ? (isDarkMode ? 'Modo Claro' : 'Modo Escuro') : ""}
            className={`w-full flex items-center rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all ${sidebarCollapsed ? "justify-center h-10" : "px-3 py-2.5 justify-between"}`}
          >
            <div className={`flex items-center text-[var(--sidebar-foreground)] ${sidebarCollapsed ? "" : "gap-3"}`}>
              <Icon name={isDarkMode ? "moon" : "sun"} size={16} />
              {!sidebarCollapsed && (
                <span className="text-[11px] font-black uppercase tracking-widest text-white">
                  {isDarkMode ? 'Noite' : 'Dia'}
                </span>
              )}
            </div>
            {!sidebarCollapsed && (
              <div className={`w-8 h-4 rounded-full p-0.5 transition-colors duration-200 ease-in-out ${isDarkMode ? 'bg-[var(--primary)]' : 'bg-white/20'}`}>
                <div className={`w-3 h-3 bg-white rounded-full shadow-sm transform transition-transform duration-200 ease-in-out ${isDarkMode ? 'translate-x-4' : 'translate-x-0'}`}></div>
              </div>
            )}
          </button>

        </div>

        {!sidebarCollapsed && (
          <div className="p-4 border-t border-white/10 flex justify-between items-center animate-fade-in">
            <p className="text-[9px] text-[var(--sidebar-muted)] font-black uppercase tracking-widest leading-none">
              v{appVersion || "..."}
            </p>
            <div className="w-2 h-2 rounded-full bg-[var(--success)] shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
          </div>
        )}
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar mobile */}
        <header className="lg:hidden flex items-center gap-2.5 h-14 px-4 border-b border-[var(--border)] bg-[var(--card)] z-40 flex-shrink-0">
          <span className="w-7 h-7 rounded-lg bg-[var(--primary)] text-white flex items-center justify-center shrink-0">
            <Icon name="store" size={16} />
          </span>
          <span className="font-black text-[var(--foreground)] tracking-tight">SysControl</span>
          {tenant.nome ? <span className="text-[var(--muted-foreground)] text-sm truncate">· {tenant.nome}</span> : null}
        </header>
        <main className="flex-1 overflow-hidden relative flex flex-col bg-surface-50 mobile-nav-space">
        <Suspense fallback={<PageFallback />}>
          <Routes>
            <Route path="/" element={hasAccess("/") ? <Dashboard /> : <Navigate to="/vendas" replace />} />
            <Route path="/vendas" element={hasAccess("/vendas") ? <Vendas /> : <Navigate to="/vendas" replace />} />
            <Route path="/servicos" element={hasAccess("/servicos") ? <Servicos /> : <Navigate to="/vendas" replace />} />
            <Route path="/recibos" element={hasAccess("/recibos") ? <Recibos /> : <Navigate to="/vendas" replace />} />
            <Route path="/historico" element={hasAccess("/historico") ? <HistoricoPrecos /> : <Navigate to="/vendas" replace />} />
            <Route path="/produtos" element={hasAccess("/produtos") ? <Produtos /> : <Navigate to="/vendas" replace />} />
            <Route path="/pessoas" element={hasAccess("/pessoas") ? <Pessoas /> : <Navigate to="/vendas" replace />} />
            <Route path="/clientes" element={hasAccess("/clientes") ? <Clientes /> : <Navigate to="/vendas" replace />} />
            <Route path="/orcamentos" element={hasAccess("/orcamentos") ? <Orcamentos /> : <Navigate to="/vendas" replace />} />
            <Route path="/relatorios" element={hasAccess("/relatorios") ? <Relatorios /> : <Navigate to="/vendas" replace />} />
            <Route path="/comissoes" element={hasAccess("/comissoes") ? <Comissoes /> : <Navigate to="/vendas" replace />} />
            <Route path="/despesas" element={hasAccess("/despesas") ? <Despesas /> : <Navigate to="/vendas" replace />} />
            <Route path="/config" element={hasAccess("/config") ? <Config /> : <Navigate to="/vendas" replace />} />
            <Route path="/mais" element={<MoreMenu />} />
            <Route path="/logs" element={hasAccess("/logs") ? <EventLogs /> : <Navigate to="/vendas" replace />} />

            <Route path="*" element={<Navigate to="/" />} />

          </Routes>
        </Suspense>
        </main>
      </div>

      {/* Barra de navegacao inferior (mobile) */}
      <BottomNav
        items={BOTTOM_NAV}
        currentPath={location.pathname}
        onNavigate={handleMenuClick}
        onMore={() => navigate("/mais")}
      />

      {/* Auto Updater Component */}
      <Updater />
    </div>
  );
}

export default App;
