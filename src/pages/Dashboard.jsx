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

// Registrar componentes do Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const Dashboard = () => {
  const [stats, setStats] = useState({
    faturamento: 0,
    lucro: 0,
    vendasCount: 0,
    maoDeObra: 0,
    comissoes: 0,
  });

  const [chartData, setChartData] = useState({
    labels: [],
    datasets: [],
  });

  const [lowStock, setLowStock] = useState([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    // 1. Carregar Totais
    const statsData = await window.api.getDashboardStats();
    setStats(statsData);

    // 2. Carregar Gráfico Semanal
    const weeklyData = await window.api.getWeeklySales();
    setChartData({
      labels: weeklyData.labels,
      datasets: [
        {
          label: "Faturamento (R$)",
          data: weeklyData.data,
          backgroundColor: "rgba(59, 130, 246, 0.6)", // Cor azul Tailwind
          borderRadius: 4,
        },
      ],
    });

    // 3. Carregar Estoque Baixo
    const stockData = await window.api.getLowStock();
    setLowStock(stockData);
  };

  const formatCurrency = (val) => `R$ ${val?.toFixed(2).replace(".", ",")}`;

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: "top" },
      title: { display: false },
    },
    scales: {
      y: { beginAtZero: true },
    },
  };

  return (
    <div className="p-6 h-full flex flex-col overflow-y-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">
        Painel de Controle
      </h1>

      {/* Cards de Totais */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 font-bold uppercase">
                Faturamento (Hoje)
              </p>
              <p className="text-xl font-bold text-gray-800">
                {formatCurrency(stats.faturamento)}
              </p>
            </div>
            <i className="fas fa-dollar-sign text-blue-200 text-3xl"></i>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 font-bold uppercase">
                Lucro Líquido
              </p>
              <p className="text-xl font-bold text-green-600">
                {formatCurrency(stats.lucro)}
              </p>
            </div>
            <i className="fas fa-chart-line text-green-200 text-3xl"></i>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-yellow-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 font-bold uppercase">
                Vendas (Qtd)
              </p>
              <p className="text-xl font-bold text-yellow-600">
                {stats.vendasCount}
              </p>
            </div>
            <i className="fas fa-shopping-cart text-yellow-200 text-3xl"></i>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-orange-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 font-bold uppercase">
                Mão de Obra
              </p>
              <p className="text-xl font-bold text-orange-600">
                {formatCurrency(stats.maoDeObra)}
              </p>
            </div>
            <i className="fas fa-wrench text-orange-200 text-3xl"></i>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-purple-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 font-bold uppercase">
                Comissões
              </p>
              <p className="text-xl font-bold text-purple-600">
                {formatCurrency(stats.comissoes)}
              </p>
            </div>
            <i className="fas fa-users text-purple-200 text-3xl"></i>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-[300px]">
        {/* Gráfico */}
        <div className="flex-[2] bg-white p-6 rounded-xl shadow-md flex flex-col">
          <h2 className="text-lg font-bold text-gray-800 mb-4">
            Desempenho Semanal
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
            Estoque Baixo
          </h2>
          <div className="overflow-y-auto flex-1">
            <ul className="space-y-3">
              {lowStock.map((p) => (
                <li
                  key={p.id}
                  className="flex justify-between items-center p-3 bg-red-50 rounded-lg border border-red-100"
                >
                  <div>
                    <p className="font-medium text-gray-800 text-sm">
                      {p.descricao}
                    </p>
                    <p className="text-xs text-gray-500">Cód: {p.codigo}</p>
                  </div>
                  <span className="bg-red-200 text-red-800 text-xs font-bold px-2 py-1 rounded">
                    {p.estoque_atual} un
                  </span>
                </li>
              ))}
              {lowStock.length === 0 && (
                <p className="text-gray-400 text-center py-4 text-sm">
                  Nenhum produto com estoque baixo.
                </p>
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
