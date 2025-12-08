import React, { useState } from "react";
import { Routes, Route, Link, useLocation } from "react-router-dom";

// Importaremos as páginas aqui depois
const Dashboard = () => (
  <div className="p-8">
    <h1 className="text-2xl font-bold">Painel (Em construção)</h1>
  </div>
);
const Vendas = () => (
  <div className="p-8">
    <h1 className="text-2xl font-bold">PDV (Em construção)</h1>
  </div>
);

function App() {
  const location = useLocation();

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
    <div className="flex h-screen overflow-hidden bg-gray-100">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-800 text-white flex flex-col">
        <div className="h-20 flex items-center justify-center border-b border-gray-700">
          <span className="text-xl font-bold">SysControl</span>
        </div>
        <nav className="flex-1 px-4 py-4 space-y-2 overflow-y-auto">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center p-3 rounded-lg transition-colors ${
                location.pathname === item.path
                  ? "bg-blue-600 text-white"
                  : "text-gray-300 hover:bg-gray-700"
              }`}
            >
              <i className={`fas ${item.icon} w-6`}></i>
              <span className="ml-3 font-medium">{item.label}</span>
            </Link>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/vendas" element={<Vendas />} />
          {/* Outras rotas serão adicionadas conforme migrarmos */}
        </Routes>
      </main>
    </div>
  );
}

export default App;
