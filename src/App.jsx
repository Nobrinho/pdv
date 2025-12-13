import React, { useState } from "react"; // Adicionado useState
import { Routes, Route, Link, useLocation, Navigate } from "react-router-dom";
import Produtos from "./pages/Produtos";
import Pessoas from "./pages/Pessoas";
import Vendas from "./pages/Vendas";
import Servicos from "./pages/Servicos";
import Recibos from "./pages/Recibos";
import Relatorios from "./pages/Relatorios";
import Dashboard from "./pages/Dashboard";
import Config from "./pages/Config";
import Login from "./pages/Login"; // Importe a tela de Login

// Componente para proteger rotas (opcional, mas boa prática)
// const PrivateRoute = ({ children }) => { ... }

function App() {
  const [user, setUser] = useState(null); // Estado do usuário logado
  const location = useLocation();

  // Se não houver usuário logado, mostra APENAS a tela de Login
  if (!user) {
    return <Login onLoginSuccess={(userData) => setUser(userData)} />;
  }

  // --- SE O USUÁRIO ESTIVER LOGADO, MOSTRA O SISTEMA ---

  const menuItems = [
    { path: "/", label: "Painel", icon: "fa-tachometer-alt" },
    { path: "/vendas", label: "Registrar Venda", icon: "fa-cash-register" },
    { path: "/servicos", label: "Serviços", icon: "fa-wrench" },
    { path: "/recibos", label: "Recibos", icon: "fa-receipt" },
    { path: "/produtos", label: "Produtos", icon: "fa-box-open" },
    { path: "/pessoas", label: "Pessoas", icon: "fa-users" },
    { path: "/relatorios", label: "Relatórios", icon: "fa-chart-line" },
    { path: "/config", label: "Configurações", icon: "fa-cog" },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-gray-100 font-sans text-gray-900">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-800 text-white flex flex-col flex-shrink-0 transition-all duration-300">
        <div className="h-16 flex items-center justify-center border-b border-gray-700 bg-gray-900 shadow-md">
          <i className="fas fa-cubes text-blue-500 mr-2 text-xl"></i>
          <span className="text-lg font-bold tracking-wide">SysControl</span>
        </div>

        {/* Info do Usuário */}
        <div className="px-4 py-3 bg-gray-700/50 border-b border-gray-700 flex items-center justify-between">
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-sm font-bold">
              {user.nome.charAt(0)}
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium leading-none">
                {user.nome.split(" ")[0]}
              </p>
              <p className="text-xs text-gray-400 mt-1 capitalize">
                {user.cargo}
              </p>
            </div>
          </div>
          <button
            onClick={() => setUser(null)}
            className="text-gray-400 hover:text-white"
            title="Sair"
          >
            <i className="fas fa-sign-out-alt"></i>
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center px-4 py-3 rounded-lg transition-all duration-200 group ${
                  isActive
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-900/50"
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
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-gray-700">
          <p className="text-xs text-gray-500 text-center">
            Versão 1.0.0 (Desktop)
          </p>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-hidden relative flex flex-col">
        <div className="flex-1 overflow-y-auto bg-gray-50">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/vendas" element={<Vendas />} />
            <Route path="/produtos" element={<Produtos />} />
            <Route path="/pessoas" element={<Pessoas />} />
            <Route path="/relatorios" element={<Relatorios />} />
            <Route path="/config" element={<Config />} />
            <Route path="/servicos" element={<Servicos />} />
            <Route path="/recibos" element={<Recibos />} />
            {/* Redirecionar qualquer rota desconhecida para o home */}
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}

export default App;
