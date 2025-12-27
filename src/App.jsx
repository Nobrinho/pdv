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
import { useAlert } from "./context/AlertSystem";

// Definição de permissões por cargo
const PERMISSOES_CAIXA = [
  "/",
  "/vendas",
  "/servicos",
  "/recibos",
  "/historico",
];

function App() {
  const [user, setUser] = useState(null);
  const [appVersion, setAppVersion] = useState(""); // Estado para a versão
  const [showSupervisorModal, setShowSupervisorModal] = useState(false);
  const [pendingRoute, setPendingRoute] = useState(null);
  const [unlockedRoutes, setUnlockedRoutes] = useState([]);
  const { showAlert } = useAlert();

  const [adminUser, setAdminUser] = useState("");
  const [adminPass, setAdminPass] = useState("");

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

  const hasAccess = (path) => {
    if (user?.cargo === "admin") return true;
    const item = menuItems.find((i) => i.path === path);
    if (item && !item.restricted) return true;
    if (unlockedRoutes.includes(path)) return true;
    return false;
  };

  const handleMenuClick = (path) => {
    if (hasAccess(path)) {
      navigate(path);
    } else {
      setPendingRoute(path);
      setAdminUser("");
      setAdminPass("");
      setShowSupervisorModal(true);
    }
  };

  const handleSupervisorAuth = async (e) => {
    e.preventDefault();
    if (!adminUser || !adminPass)
      return showAlert("Preencha os dados do administrador.");

    try {
      const result = await window.api.loginAttempt({
        username: adminUser,
        password: adminPass,
      });

      if (result.success && result.user.cargo === "admin") {
        setUnlockedRoutes((prev) => [...prev, pendingRoute]);
        setShowSupervisorModal(false);
        navigate(pendingRoute);
      } else if (result.success) {
        showAlert("Este usuário não tem permissão de Administrador.");
      } else {
        showAlert("Senha ou usuário incorretos.");
      }
    } catch (error) {
      console.error(error);
      showAlert("Erro ao validar permissão.");
    }
  };

  if (!user) {
    return <Login onLoginSuccess={(userData) => setUser(userData)} />;
  }

  const menuItems = [
    {
      path: "/",
      label: "Painel",
      icon: "fa-tachometer-alt",
      restricted: false,
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
      restricted: true,
    },
    {
      path: "/historico",
      label: "Auditoria de Preços",
      icon: "fa-history",
      restricted: false,
    },
    { path: "/pessoas", label: "Equipe", icon: "fa-users", restricted: true },
    {
      path: "/relatorios",
      label: "Relatórios",
      icon: "fa-chart-line",
      restricted: true,
    },
    {
      path: "/config",
      label: "Configurações",
      icon: "fa-cog",
      restricted: true,
    },
  ];

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
            onClick={() => {
              setUser(null);
              setUnlockedRoutes([]);
            }}
            className="text-gray-500 hover:text-red-400 transition"
            title="Sair do Sistema"
          >
            <i className="fas fa-sign-out-alt"></i>
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto custom-scrollbar">
          {menuItems.map((item) => {
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
        {/* VERSÃO DINÂMICA AQUI */}
        <div className="p-4 border-t border-gray-700 bg-gray-900 flex justify-between items-center">
          <p className="text-xs text-gray-500">Versão {appVersion || "..."}</p>
          {/* Indicador de status (bolinha verde se conectado) */}
          <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
        </div>
      </aside>

      <main className="flex-1 overflow-hidden relative flex flex-col bg-gray-50">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/vendas" element={<Vendas />} />
          <Route path="/servicos" element={<Servicos />} />
          <Route path="/recibos" element={<Recibos />} />
          <Route path="/historico" element={<HistoricoPrecos />} />

          <Route
            path="/produtos"
            element={
              hasAccess("/produtos") ? <Produtos /> : <Navigate to="/" />
            }
          />
          <Route
            path="/pessoas"
            element={hasAccess("/pessoas") ? <Pessoas /> : <Navigate to="/" />}
          />
          <Route
            path="/relatorios"
            element={
              hasAccess("/relatorios") ? <Relatorios /> : <Navigate to="/" />
            }
          />
          <Route
            path="/config"
            element={hasAccess("/config") ? <Config /> : <Navigate to="/" />}
          />

          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>

      {/* Modal Supervisor */}
      {showSupervisorModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[100] animate-fade-in backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl p-8 w-96 max-w-[90%] transform transition-all scale-100 border border-gray-200">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <i className="fas fa-user-shield text-3xl text-red-600"></i>
              </div>
              <h2 className="text-xl font-bold text-gray-800">
                Acesso Restrito
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                É necessária autorização de administrador.
              </p>
            </div>

            <form onSubmit={handleSupervisorAuth} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                  Usuário Admin
                </label>
                <input
                  className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="Admin"
                  value={adminUser}
                  onChange={(e) => setAdminUser(e.target.value)}
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                  Senha
                </label>
                <input
                  type="password"
                  className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="••••••"
                  value={adminPass}
                  onChange={(e) => setAdminPass(e.target.value)}
                />
              </div>
              <button
                type="submit"
                className="w-full bg-red-600 text-white py-3 rounded-lg font-bold hover:bg-red-700 transition shadow-lg"
              >
                LIBERAR ACESSO
              </button>
              <button
                type="button"
                onClick={() => setShowSupervisorModal(false)}
                className="w-full bg-gray-100 text-gray-600 py-3 rounded-lg font-medium hover:bg-gray-200 transition"
              >
                Cancelar
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Auto Updater Component */}
      <Updater />
    </div>
  );
}

export default App;
