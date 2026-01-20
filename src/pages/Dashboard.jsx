// @ts-nocheck
import React, { useState, useEffect } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
);

const Dashboard = () => {
  const [stats, setStats] = useState({
    faturamento: 0,
    lucro: 0,
    vendasCount: 0,
    maoDeObra: 0,
    comissoes: 0,
  });
  const [inventoryStats, setInventoryStats] = useState({
    custoTotal: 0,
    vendaPotencial: 0,
    lucroProjetado: 0,
    qtdZerados: 0,
    qtdBaixoEstoque: 0,
    totalItensFisicos: 0,
  });
  const [chartData, setChartData] = useState({ labels: [], datasets: [] });
  const [lowStock, setLowStock] = useState([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    // 1. Dados do Dia
    const statsData = await window.api.getDashboardStats();
    setStats(statsData);

    // 2. Gráfico Semanal
    const weeklyData = await window.api.getWeeklySales();
    setChartData({
      labels: weeklyData.labels,
      datasets: [
        {
          label: "Faturamento (R$)",
          data: weeklyData.data,
          backgroundColor: "rgba(59, 130, 246, 0.6)",
          borderRadius: 4,
        },
      ],
    });

    // 3. Estoque Baixo (Lista)
    const stockData = await window.api.getLowStock();
    setLowStock(stockData);

    // 4. Inteligência de Estoque (Novo)
    const invStats = await window.api.getInventoryStats();
    setInventoryStats(invStats);
  };

  const formatCurrency = (val) => `R$ ${val?.toFixed(2).replace(".", ",")}`;

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title: { display: false },
    },
    scales: { y: { beginAtZero: true } },
  };

  return (
    <div className="p-6 h-full flex flex-col overflow-y-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Painel de Controle</h1>
        <button
          onClick={loadDashboardData}
          className="text-blue-600 hover:text-blue-800 transition"
        >
          <i className="fas fa-sync-alt mr-1"></i> Atualizar
        </button>
      </div>

      {/* --- SECÇÃO 1: MOVIMENTO DO DIA --- */}
      <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-3">
        Movimento de Hoje
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-blue-500">
          <div className="flex justify-between">
            <div>
              <p className="text-xs text-gray-500 font-bold uppercase">
                Faturamento
              </p>
              <p className="text-xl font-bold text-gray-800">
                {formatCurrency(stats.faturamento)}
              </p>
            </div>
            <i className="fas fa-dollar-sign text-blue-200 text-2xl"></i>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-green-500">
          <div className="flex justify-between">
            <div>
              <p className="text-xs text-gray-500 font-bold uppercase">
                Lucro Líquido
              </p>
              <p className="text-xl font-bold text-green-600">
                {formatCurrency(stats.lucro)}
              </p>
            </div>
            <i className="fas fa-chart-line text-green-200 text-2xl"></i>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-yellow-500">
          <div className="flex justify-between">
            <div>
              <p className="text-xs text-gray-500 font-bold uppercase">
                Vendas (Qtd)
              </p>
              <p className="text-xl font-bold text-yellow-600">
                {stats.vendasCount}
              </p>
            </div>
            <i className="fas fa-shopping-cart text-yellow-200 text-2xl"></i>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-orange-500">
          <div className="flex justify-between">
            <div>
              <p className="text-xs text-gray-500 font-bold uppercase">
                Mão de Obra
              </p>
              <p className="text-xl font-bold text-orange-600">
                {formatCurrency(stats.maoDeObra)}
              </p>
            </div>
            <i className="fas fa-wrench text-orange-200 text-2xl"></i>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-purple-500">
          <div className="flex justify-between">
            <div>
              <p className="text-xs text-gray-500 font-bold uppercase">
                Comissões
              </p>
              <p className="text-xl font-bold text-purple-600">
                {formatCurrency(stats.comissoes)}
              </p>
            </div>
            <i className="fas fa-users text-purple-200 text-2xl"></i>
          </div>
        </div>
      </div>

      {/* --- SECÇÃO 2: INTELIGÊNCIA DE ESTOQUE (NOVO) --- */}
      <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-3 flex items-center">
        <i className="fas fa-boxes mr-2"></i> Valorização de Estoque
        (Patrimônio)
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-gradient-to-br from-gray-800 to-gray-700 p-4 rounded-xl shadow-md text-white">
          <p className="text-xs text-gray-300 font-bold uppercase mb-1">
            Custo Total (Investido)
          </p>
          <p className="text-2xl font-bold">
            {formatCurrency(inventoryStats.custoTotal)}
          </p>
          <p className="text-xs text-gray-400 mt-2">
            Dinheiro parado em mercadoria
          </p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <p className="text-xs text-gray-500 font-bold uppercase mb-1">
            Venda Potencial
          </p>
          <p className="text-2xl font-bold text-blue-600">
            {formatCurrency(inventoryStats.vendaPotencial)}
          </p>
          <p className="text-xs text-gray-400 mt-2">
            Se vender todo o estoque hoje
          </p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <p className="text-xs text-gray-500 font-bold uppercase mb-1">
            Lucro Projetado
          </p>
          <p className="text-2xl font-bold text-green-600">
            {formatCurrency(inventoryStats.lucroProjetado)}
          </p>
          <p className="text-xs text-gray-400 mt-2">Margem bruta acumulada</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-red-500 flex flex-col justify-center">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-bold text-gray-600">
              Produtos Zerados
            </span>
            <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-bold">
              {inventoryStats.qtdZerados}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm font-bold text-gray-600">
              Baixo Estoque
            </span>
            <span className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded text-xs font-bold">
              {inventoryStats.qtdBaixoEstoque}
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-2 text-right">
            Total Itens Físicos: {inventoryStats.totalItensFisicos}
          </p>
        </div>
      </div>

      {/* --- SECÇÃO 3: GRÁFICOS E LISTAS --- */}
      <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-[300px]">
        {/* Gráfico */}
        <div className="flex-[2] bg-white p-6 rounded-xl shadow-md flex flex-col">
          <h2 className="text-lg font-bold text-gray-800 mb-4">
            Desempenho Semanal (Vendas + Serviços)
          </h2>
          <div className="flex-1 relative w-full h-full min-h-[250px]">
            {chartData.datasets.length > 0 && (
              <Bar options={chartOptions} data={chartData} />
            )}
          </div>
        </div>

        {/* Alerta Estoque */}
        <div className="flex-1 bg-white p-6 rounded-xl shadow-md flex flex-col">
          <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
            <i className="fas fa-exclamation-triangle text-red-500 mr-2"></i>{" "}
            Reposição Urgente
          </h2>
          <div className="overflow-y-auto flex-1 custom-scrollbar">
            <ul className="space-y-3">
              {lowStock.map((p) => (
                <li
                  key={p.id}
                  className="flex justify-between items-center p-3 bg-red-50 rounded-lg border border-red-100"
                >
                  <div>
                    <p
                      className="font-medium text-gray-800 text-sm truncate w-32"
                      title={p.descricao}
                    >
                      {p.descricao}
                    </p>
                    <p className="text-xs text-gray-500 font-mono">
                      {p.codigo}
                    </p>
                  </div>
                  <span
                    className={`text-xs font-bold px-2 py-1 rounded ${p.estoque_atual === 0 ? "bg-red-600 text-white" : "bg-yellow-200 text-yellow-800"}`}
                  >
                    {p.estoque_atual} un
                  </span>
                </li>
              ))}
              {lowStock.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-gray-400">
                  <i className="fas fa-check-circle text-4xl mb-2 text-green-100"></i>
                  <p className="text-sm">Estoque saudável.</p>
                </div>
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
