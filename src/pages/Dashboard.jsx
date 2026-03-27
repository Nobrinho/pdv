// @ts-nocheck
import React, { useState, useEffect } from "react";
import { formatCurrency } from "../utils/format";
import { api } from "../services/api";
import StatCard from "../components/ui/StatCard";
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
  const [loading, setLoading] = useState(false);
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
    try {
      setLoading(true);
      
      // Executar chamadas em paralelo para melhor performance
      const [statsData, weeklyData, stockData, invStats] = await Promise.all([
        api.dashboard.stats(),
        api.dashboard.weekly(),
        api.dashboard.lowStock(),
        api.dashboard.inventoryStats()
      ]);

      setStats(statsData);
      setLowStock(stockData);
      setInventoryStats(invStats);

      setChartData({
        labels: weeklyData.labels,
        datasets: [
          {
            label: "Faturamento (R$)",
            data: weeklyData.data,
            backgroundColor: "rgba(59, 130, 246, 0.7)",
            borderRadius: 6,
            hoverBackgroundColor: "rgba(37, 99, 235, 0.8)",
          },
        ],
      });
    } catch (error) {
      console.error("Erro ao carregar dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "#1f2937",
        padding: 12,
        titleFont: { size: 14, weight: "bold" },
        bodyFont: { size: 13 },
        callbacks: {
          label: (context) => `Receita: ${formatCurrency(context.raw)}`
        }
      }
    },
    scales: { 
      y: { 
        beginAtZero: true,
        ticks: { callback: (value) => formatCurrency(value) }
      } 
    },
  };

  if (loading && !stats.faturamento) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 h-full flex flex-col overflow-y-auto bg-gray-50 custom-scrollbar">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-gray-800 tracking-tight">Painel de Controle</h1>
          <p className="text-xs text-gray-500 mt-1">Resumo operacional e saúde financeira do seu negócio.</p>
        </div>
        <button
          onClick={loadDashboardData}
          className="flex items-center gap-2 text-blue-600 hover:text-blue-800 transition font-bold text-sm bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100"
        >
          <i className={`fas fa-sync-alt ${loading ? "animate-spin" : ""}`}></i> 
          Atualizar
        </button>
      </div>

      {/* --- MOVIMENTO DO DIA --- */}
      <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 ml-1">
        Movimento de Hoje
      </h2>
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4 mb-8">
        <StatCard
          title="Faturamento"
          value={stats.faturamento}
          color="blue"
          icon="fa-dollar-sign"
          tooltip="Total bruto vendido hoje."
        />
        <StatCard
          title="Lucro Líquido"
          value={stats.lucro}
          color="green"
          icon="fa-chart-line"
          tooltip="Resultando após descontar custos, comissões e mão de obra."
        />
        <StatCard
          title="Vendas"
          value={stats.vendasCount}
          color="indigo"
          icon="fa-shopping-cart"
          tooltip="Quantidade de cupons emitidos hoje."
          format={(v) => `${v} unid`}
        />
        <StatCard
          title="Mão de Obra"
          value={stats.maoDeObra}
          color="orange"
          icon="fa-wrench"
          tooltip="Total gerado em serviços de mecânica."
        />
        <StatCard
          title="Comissões"
          value={stats.comissoes}
          color="purple"
          icon="fa-user-tag"
          tooltip="Total a pagar em comissões para vendedores."
        />
      </div>

      {/* --- PATRIMÔNIO --- */}
      <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 ml-1">
        Valorização de Estoque (Patrimônio)
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-gradient-to-br from-gray-900 to-gray-700 p-5 rounded-2xl shadow-lg border border-gray-800 text-white relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
             <i className="fas fa-vault text-6xl"></i>
          </div>
          <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1">Custo Total (Investido)</p>
          <p className="text-3xl font-black tracking-tighter">{formatCurrency(inventoryStats.custoTotal)}</p>
          <p className="text-[10px] text-gray-400 mt-2 font-medium italic">Capital imobilizado em mercadoria</p>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
          <div>
            <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1 text-blue-500">Venda Potencial</p>
            <p className="text-2xl font-black text-gray-800 tracking-tight">{formatCurrency(inventoryStats.vendaPotencial)}</p>
          </div>
          <p className="text-[10px] text-gray-400 mt-3 border-t pt-2 font-medium">Ticket total em prateleira</p>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
          <div>
            <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1 text-green-600">Lucro Projetado</p>
            <p className="text-2xl font-black text-gray-800 tracking-tight">{formatCurrency(inventoryStats.lucroProjetado)}</p>
          </div>
          <p className="text-[10px] text-gray-400 mt-3 border-t pt-2 font-medium">Margem bruta acumulada</p>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border-l-4 border-red-500 flex flex-col justify-between">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-tighter">Produtos Zerados</span>
            <span className="bg-red-500 text-white px-2 py-0.5 rounded-full text-[10px] font-black">{inventoryStats.qtdZerados}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-tighter">Baixo Estoque</span>
            <span className="bg-yellow-400 text-yellow-900 px-2 py-0.5 rounded-full text-[10px] font-black">{inventoryStats.qtdBaixoEstoque}</span>
          </div>
          <p className="text-[10px] text-gray-400 mt-3 border-t pt-2 text-right">Total Itens: <span className="font-bold text-gray-700">{inventoryStats.totalItensFisicos}</span></p>
        </div>
      </div>

      {/* --- GRÁFICOS E LISTAS --- */}
      <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-[400px]">
        {/* Gráfico */}
        <div className="flex-[2] bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-black text-gray-800 tracking-tight">Desempenho Semanal</h2>
            <span className="text-[10px] font-bold bg-blue-50 text-blue-600 px-2 py-1 rounded-md uppercase border border-blue-100">Faturamento Real</span>
          </div>
          <div className="flex-1 relative w-full h-full min-h-[300px]">
            {chartData.datasets.length > 0 && (
              <Bar options={chartOptions} data={chartData} />
            )}
          </div>
        </div>

        {/* Alerta Estoque */}
        <div className="flex-1 bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col">
          <h2 className="text-lg font-black text-gray-800 mb-6 flex items-center gap-2">
            <i className="fas fa-shipping-fast text-red-500"></i> Reposição Urgente
          </h2>
          <div className="overflow-y-auto flex-1 custom-scrollbar pr-2">
            <ul className="space-y-4">
              {lowStock.map((p) => (
                <li
                  key={p.id}
                  className="flex justify-between items-center p-3.5 bg-gray-50 rounded-xl border border-gray-100 hover:border-red-200 transition-colors group"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-800 text-sm truncate pr-2 group-hover:text-red-700 transition-colors">
                      {p.descricao}
                    </p>
                    <p className="text-[10px] text-gray-400 font-mono tracking-tighter uppercase">
                      Cod: {p.codigo}
                    </p>
                  </div>
                  <div className={`
                    text-[10px] font-black px-2.5 py-1 rounded-lg border shadow-sm
                    ${p.estoque_atual === 0 
                      ? "bg-red-600 text-white border-red-700" 
                      : "bg-yellow-100 text-yellow-800 border-yellow-200"}
                  `}>
                    {p.estoque_atual} UN
                  </div>
                </li>
              ))}
              {lowStock.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-gray-300 py-10">
                  <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mb-3">
                    <i className="fas fa-check text-2xl text-green-400"></i>
                  </div>
                  <p className="text-sm font-bold">Estoque saudável</p>
                  <p className="text-[10px] text-gray-400 uppercase font-medium">Tudo sob controle</p>
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
