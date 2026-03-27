// @ts-nocheck
import React, { useState, useEffect } from "react";
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
import HistoricoPrecos from "./pages/HistoricoPrecos";
import Updater from "./components/Updater";
import Relatorios from "./pages/Relatorios";
import Clientes from "./pages/Clientes";
import { useAuth } from "./context/AuthContext";

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
];

function App() {
  const { user, login, logout, hasAccess, requestRouteAccess, unlockedRoutes } =
    useAuth();
  const [appVersion, setAppVersion] = useState("");

  const navigate = useNavigate();
  const location = useLocation();

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

  const handleMenuClick = (path) => {
    requestRouteAccess(path, navigate);
  };

  if (!user) {
    return <Login onLoginSuccess={(userData) => login(userData)} />;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-100 font-sans text-gray-900">
      <aside className="w-64 bg-gray-800 text-white flex flex-col flex-shrink-0 transition-all duration-300 shadow-2xl z-10">
        <div className="h-16 flex items-center justify-center border-b border-gray-700 bg-gray-900 shadow-md">
          <i className="fas fa-cubes text-blue-500 mr-2 text-xl"></i>
          <span className="text-lg font-bold tracking-wide">SysControl</span>
        </div>

        <div className="px-4 py-4 bg-gray-800 border-b border-gray-700 flex items-center justify-between">
          <div className="flex items-center">
            <div
              className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shadow-sm ${
                user.cargo === "admin"
                  ? "bg-purple-600 text-white"
                  : "bg-green-600 text-white"
              }`}
            >
              {user.nome.charAt(0).toUpperCase()}
            </div>
            <div className="ml-3 overflow-hidden">
              <p
                className="text-sm font-medium leading-none truncate w-32"
                title={user.nome}
              >
                {user.nome.split(" ")[0]}
              </p>
              <p className="text-xs text-gray-400 mt-1 capitalize flex items-center">
                <i
                  className={`fas ${
                    user.cargo === "admin"
                      ? "fa-shield-alt text-purple-400"
                      : "fa-cash-register text-green-400"
                  } mr-1`}
                ></i>
                {user.cargo === "admin" ? "Administrador" : "Caixa"}
              </p>
            </div>
          </div>
          <button
            onClick={logout}
            className="text-gray-500 hover:text-red-400 transition"
            title="Sair do Sistema"
          >
            <i className="fas fa-sign-out-alt"></i>
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto custom-scrollbar">
          {MENU_ITEMS.map((item) => {
            const isActive = location.pathname === item.path;
            const isLocked = !hasAccess(item.path);

            return (
              <button
                key={item.path}
                onClick={() => handleMenuClick(item.path)}
                className={`w-full flex items-center px-4 py-3 rounded-lg transition-all duration-200 group text-left relative ${
                  isActive
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-900/40"
                    : "text-gray-400 hover:bg-gray-700 hover:text-white"
                }`}
              >
                <i
                  className={`fas ${item.icon} w-6 text-center ${
                    isActive
                      ? "text-white"
                      : "text-gray-500 group-hover:text-white"
                  }`}
                ></i>
                <span className="ml-3 font-medium">{item.label}</span>
                {isLocked && (
                  <i className="fas fa-lock absolute right-3 text-xs text-gray-600 group-hover:text-red-400 transition-colors"></i>
                )}
                {!isLocked && item.restricted && user.cargo !== "admin" && (
                  <i
                    className="fas fa-unlock absolute right-3 text-xs text-green-500 transition-colors"
                    title="Liberado temporariamente"
                  ></i>
                )}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-700 bg-gray-900 flex justify-between items-center">
          <p className="text-xs text-gray-500">
            Versão {appVersion || "..."} by{" "}
            <a
              href="https://www.instagram.com/eminobre/"
              className="text-blue-400 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              @eminobre
            </a>
          </p>

          <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
        </div>
      </aside>

      <main className="flex-1 overflow-hidden relative flex flex-col bg-gray-50">
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
          <Route path="/config" element={hasAccess("/config") ? <Config /> : <Navigate to="/vendas" replace />} />

          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>

      {/* Auto Updater Component */}
      <Updater />
    </div>
  );
}

export default App;
