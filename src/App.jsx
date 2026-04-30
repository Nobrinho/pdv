// @ts-nocheck
import React, { useState, useEffect, useRef } from "react";
import {
  Routes,
  Route,
  useNavigate,
  useLocation,
  Navigate,
} from "react-router-dom";
import Produtos from "./pages/Produtos";
import Pessoas from "./pages/Pessoas";
import Vendas from "./pages/Vendas";
import Servicos from "./pages/Servicos";
import Recibos from "./pages/Recibos";
import Dashboard from "./pages/Dashboard";
import Config from "./pages/Config";
import Login from "./pages/Login";
import Onboarding from "./pages/Onboarding";
import HistoricoPrecos from "./pages/HistoricoPrecos";
import EventLogs from "./pages/EventLogs";

import Updater from "./components/Updater";

import Relatorios from "./pages/Relatorios";
import Comissoes from "./pages/Comissoes";
import Clientes from "./pages/Clientes";
import { useAuth } from "./context/AuthContext";
import { useTenant } from "./context/TenantContext";
import { useTheme } from "./context/ThemeContext";

// Configuração do Menu (Estática)
const MENU_ITEMS = [
  {
    path: "/",
    label: "Painel",
    icon: "fa-tachometer-alt",
    restricted: true,
  },
  {
    path: "/vendas",
    label: "Registrar Venda",
    icon: "fa-cash-register",
    restricted: false,
  },
  {
    path: "/servicos",
    label: "Serviços",
    icon: "fa-wrench",
    restricted: false,
  },
  {
    path: "/recibos",
    label: "Recibos",
    icon: "fa-receipt",
    restricted: false,
  },
  {
    path: "/produtos",
    label: "Produtos",
    icon: "fa-box-open",
    restricted: false,
  },
  {
    path: "/historico",
    label: "Auditoria de Preços",
    icon: "fa-history",
    restricted: false,
  },
  {
    path: "/pessoas",
    label: "Equipe",
    icon: "fa-user-friends",
    restricted: true,
  },
  {
    path: "/relatorios",
    label: "Relatórios",
    icon: "fa-chart-line",
    restricted: true,
  },
  {
    path: "/comissoes",
    label: "Comissões",
    icon: "fa-hand-holding-usd",
    restricted: true,
  },
  {
    path: "/clientes",
    label: "Clientes",
    icon: "fa-users",
    restricted: true,
  },
  {
    path: "/config",
    label: "Configurações",
    icon: "fa-cog",
    restricted: true,
  },
  {
    path: "/logs",
    label: "Logs de Eventos",
    icon: "fa-clipboard-list",
    restricted: true,
  },
];

function App() {
  const { user, login, logout, onboardingRequired, setOnboardingRequired, hasAccess, requestRouteAccess, unlockedRoutes } =
    useAuth();
  const { tenant } = useTenant();
  const { isDarkMode, toggleDarkMode } = useTheme();
  const [appVersion, setAppVersion] = useState("");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem("sidebarCollapsed");
    return saved === "true";
  });

  const navigate = useNavigate();
  const location = useLocation();
  const lastLoggedPathRef = useRef("");

  const sessionIdRef = useRef(null);

  // Buscar a versão assim que o componente montar
  useEffect(() => {
    const fetchVersion = async () => {
      try {
        const ver = await window.api.getAppVersion();
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
    setSidebarCollapsed(prev => {
      const newVal = !prev;
      localStorage.setItem("sidebarCollapsed", String(newVal));
      return newVal;
    });
  };

  const handleMenuClick = (path) => {
    if (user) {
      window.api?.logEvent?.({
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
      });
    }
    requestRouteAccess(path, navigate);
  };

  useEffect(() => {
    if (!user) return;
    if (lastLoggedPathRef.current === location.pathname) return;
    lastLoggedPathRef.current = location.pathname;

    window.api?.logEvent?.({
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
    });
  }, [location.pathname, user]);

  if (onboardingRequired === null) {
    return null; // Aguarda a checagem com o backend (sem tela branca graças à splash nativa)
  }

  if (onboardingRequired === true || location.pathname === "/onboarding") {
    return <Onboarding />;
  }

  if (!user) {
    return <Login onLoginSuccess={(userData) => login(userData)} />;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-surface-50 font-sans text-surface-800 transition-colors duration-200">
      <aside className={`${sidebarCollapsed ? "w-20" : "w-64"} bg-surface-100 text-surface-800 flex flex-col flex-shrink-0 transition-all duration-300 shadow-2xl z-[60] border-r border-surface-200 relative`}>
        {/* Toggle Button */}
        <button
          onClick={toggleSidebar}
          className="absolute -right-3 top-20 bg-primary-600 text-white w-6 h-6 rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-110 z-[70] active:scale-95"
          style={{ transform: sidebarCollapsed ? 'rotate(180deg)' : 'rotate(0deg)' }}
        >
          <i className="fas fa-chevron-left text-[10px]"></i>
        </button>

        <div className={`h-16 flex items-center justify-center border-b border-surface-200 bg-surface-100 shadow-sm overflow-hidden transition-all ${sidebarCollapsed ? "px-0" : "px-4"}`}>
          <i className="fas fa-store text-primary-500 text-xl"></i>
          {!sidebarCollapsed && <span className="ml-2 text-lg font-black tracking-tighter truncate animate-fade-in">{tenant.nome}</span>}
        </div>

        <div className={`py-4 bg-surface-100 border-b border-surface-200 flex items-center transition-all ${sidebarCollapsed ? "px-2 justify-center" : "px-4 justify-between"}`}>
          <div className="flex items-center">
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center text-sm font-black shadow-sm transition-all ${
                user.cargo === "admin"
                  ? "bg-purple-600 text-white"
                  : "bg-green-600 text-white"
              }`}
              title={user.nome}
            >
              {user.nome.charAt(0).toUpperCase()}
            </div>
            {!sidebarCollapsed && (
              <div className="ml-3 overflow-hidden animate-fade-in">
                <p
                  className="text-sm font-bold leading-none truncate w-32 text-surface-800"
                  title={user.nome}
                >
                  {user.nome.split(" ")[0]}
                </p>
                <p className="text-[10px] text-surface-500 mt-1 capitalize flex items-center font-black">
                  {user.cargo === "admin" ? "Admin" : "Caixa"}
                </p>
              </div>
            )}
          </div>
          {!sidebarCollapsed && (
            <button
              onClick={logout}
              className="text-surface-400 hover:text-red-500 transition px-2 animate-fade-in"
              title="Sair do Sistema"
            >
              <i className="fas fa-power-off text-sm"></i>
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
                  sidebarCollapsed ? "justify-center h-12" : "px-4 py-3"
                } ${
                  isActive
                    ? "bg-primary-600 text-white shadow-lg font-bold"
                    : "text-surface-600 hover:bg-surface-200"
                }`}
              >
                <i
                  className={`fas ${item.icon} text-lg w-6 text-center transition-transform group-hover:scale-110 ${
                    isActive
                      ? "text-white"
                      : "text-surface-500 group-hover:text-primary-600"
                  }`}
                ></i>
                {!sidebarCollapsed && (
                  <span className="ml-3 text-sm font-bold tracking-tight animate-fade-in">{item.label}</span>
                )}
                
                {!sidebarCollapsed && isLocked && (
                  <i className="fas fa-lock absolute right-3 text-[10px] text-surface-400"></i>
                )}
                
                {sidebarCollapsed && isLocked && (
                   <div className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border-2 border-surface-100"></div>
                )}
              </button>
            );
          })}
        </nav>

        <div className={`border-t border-surface-200 bg-surface-100 transition-all ${sidebarCollapsed ? "p-4" : "px-4 py-3"}`}>
          <button
            onClick={toggleDarkMode}
            title={sidebarCollapsed ? (isDarkMode ? 'Modo Claro' : 'Modo Escuro') : ""}
            className={`w-full flex items-center rounded-xl bg-surface-50 border border-surface-200 hover:bg-surface-200 transition-all shadow-sm ${sidebarCollapsed ? "justify-center h-10" : "px-3 py-2.5 justify-between"}`}
          >
            <div className={`flex items-center ${sidebarCollapsed ? "" : "gap-3"}`}>
              <i className={`fas ${isDarkMode ? 'fa-moon text-indigo-400' : 'fa-sun text-yellow-500'} w-4 text-center`}></i>
              {!sidebarCollapsed && (
                <span className="text-[11px] font-black uppercase tracking-widest text-surface-800">
                  {isDarkMode ? 'Noite' : 'Dia'}
                </span>
              )}
            </div>
            {!sidebarCollapsed && (
              <div className={`w-8 h-4 rounded-full p-0.5 transition-colors duration-200 ease-in-out ${isDarkMode ? 'bg-indigo-500' : 'bg-surface-300'}`}>
                <div className={`w-3 h-3 bg-white rounded-full shadow-sm transform transition-transform duration-200 ease-in-out ${isDarkMode ? 'translate-x-4' : 'translate-x-0'}`}></div>
              </div>
            )}
          </button>

        </div>

        {!sidebarCollapsed && (
          <div className="p-4 border-t border-surface-200 bg-surface-50 flex justify-between items-center animate-fade-in">
            <p className="text-[9px] text-surface-500 font-black uppercase tracking-widest leading-none">
              v{appVersion || "..."}
              {tenant.devNome && (
                <span className="block mt-1 opacity-60">
                  — {tenant.devNome}
                </span>
              )}
            </p>
            <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
          </div>
        )}
      </aside>

      <main className="flex-1 overflow-hidden relative flex flex-col bg-surface-50">
        <Routes>
          <Route path="/" element={hasAccess("/") ? <Dashboard /> : <Navigate to="/vendas" replace />} />
          <Route path="/vendas" element={hasAccess("/vendas") ? <Vendas /> : <Navigate to="/vendas" replace />} />
          <Route path="/servicos" element={hasAccess("/servicos") ? <Servicos /> : <Navigate to="/vendas" replace />} />
          <Route path="/recibos" element={hasAccess("/recibos") ? <Recibos /> : <Navigate to="/vendas" replace />} />
          <Route path="/historico" element={hasAccess("/historico") ? <HistoricoPrecos /> : <Navigate to="/vendas" replace />} />
          <Route path="/produtos" element={hasAccess("/produtos") ? <Produtos /> : <Navigate to="/vendas" replace />} />
          <Route path="/pessoas" element={hasAccess("/pessoas") ? <Pessoas /> : <Navigate to="/vendas" replace />} />
          <Route path="/clientes" element={hasAccess("/clientes") ? <Clientes /> : <Navigate to="/vendas" replace />} />
          <Route path="/relatorios" element={hasAccess("/relatorios") ? <Relatorios /> : <Navigate to="/vendas" replace />} />
          <Route path="/comissoes" element={hasAccess("/comissoes") ? <Comissoes /> : <Navigate to="/vendas" replace />} />
          <Route path="/config" element={hasAccess("/config") ? <Config /> : <Navigate to="/vendas" replace />} />
          <Route path="/logs" element={hasAccess("/logs") ? <EventLogs /> : <Navigate to="/vendas" replace />} />

          <Route path="*" element={<Navigate to="/" />} />

        </Routes>
      </main>

      {/* Auto Updater Component */}
      <Updater />
    </div>
  );
}

export default App;
