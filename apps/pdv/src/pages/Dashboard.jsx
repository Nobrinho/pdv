// @ts-nocheck
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { formatCurrency } from "../utils/format";
import { api } from "../services/api";
import { useTheme } from "../context/ThemeContext";
import StatCard from "../components/ui/StatCard";
import PageSkeleton from "../components/ui/PageSkeleton";
import Button from "../components/ui/Button";
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

const getTodayRange = () => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return { startDate: start.getTime(), endDate: end.getTime() };
};

// queryFn do dashboard: agrega as chamadas e devolve um único objeto.
async function fetchDashboardData() {
  const [statsData, weeklyData, stockData, invStats] = await Promise.all([
    api.dashboard.stats(),
    api.dashboard.weeklySales(),
    api.dashboard.lowStock(),
    api.dashboard.inventoryStats(),
  ]);

  let movementData = statsData;
  if (!statsData.hasFinancialBreakdown) {
    const todayRange = getTodayRange();
    const [salesResult, servicesResult] = await Promise.all([
      api.sales.list(todayRange),
      api.services.list(todayRange),
    ]);
    const sales = Array.isArray(salesResult) ? salesResult : salesResult?.data || [];
    const services = Array.isArray(servicesResult) ? servicesResult : servicesResult?.data || [];
    const validSales = sales.filter((sale) => !sale.cancelada);
    movementData = {
      ...statsData,
      maoDeObra:
        validSales.reduce((total, sale) => total + Number(sale.mao_de_obra || 0), 0) +
        services.reduce((total, service) => total + Number(service.valor || 0), 0),
      comissoes: validSales.reduce((total, sale) => total + Number(sale.comissao_real || 0), 0),
    };
  }

  let inventoryData = invStats;
  if (!invStats.hasStockCounters) {
    const products = await api.products.list();
    inventoryData = {
      ...invStats,
      qtdZerados: products.filter((product) => Number(product.estoque_atual || 0) <= 0).length,
      qtdBaixoEstoque: products.filter((product) => {
        const stock = Number(product.estoque_atual || 0);
        return stock > 0 && stock <= 5;
      }).length,
      totalItensFisicos: products.reduce((total, product) => total + Number(product.estoque_atual || 0), 0),
    };
  }

  return {
    stats: movementData,
    inventoryStats: inventoryData,
    lowStock: stockData,
    chartData: {
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
    },
  };
}

const Dashboard = () => {
  const { isDarkMode } = useTheme();
  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["dashboard"],
    queryFn: fetchDashboardData,
  });
  const stats = data?.stats || { faturamento: 0, lucro: 0, vendasCount: 0, maoDeObra: 0, comissoes: 0 };
  const inventoryStats =
    data?.inventoryStats || {
      custoTotal: 0,
      vendaPotencial: 0,
      lucroProjetado: 0,
      qtdZerados: 0,
      qtdBaixoEstoque: 0,
      totalItensFisicos: 0,
    };
  const chartData = data?.chartData || { labels: [], datasets: [] };
  const lowStock = data?.lowStock || [];
  const loading = isFetching;

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { 
        display: false,
        labels: { color: isDarkMode ? "#9ca3af" : "#4b5563" }
      },
      tooltip: {
        backgroundColor: isDarkMode ? "#1f2937" : "#ffffff",
        titleColor: isDarkMode ? "#ffffff" : "#111827",
        bodyColor: isDarkMode ? "#d1d5db" : "#374151",
        borderColor: isDarkMode ? "#374151" : "#e5e7eb",
        borderWidth: 1,
        padding: 12,
        titleFont: { size: 14, weight: "bold" },
        bodyFont: { size: 13 },
        callbacks: {
          label: (context) => `Receita: ${formatCurrency(context.raw)}`
        }
      }
    },
    scales: { 
      x: {
        grid: { color: isDarkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)" },
        ticks: { color: isDarkMode ? "#9ca3af" : "#4b5563", font: { weight: 'bold', size: 10 } }
      },
      y: { 
        beginAtZero: true,
        grid: { color: isDarkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)" },
        ticks: { 
          color: isDarkMode ? "#9ca3af" : "#4b5563",
          callback: (value) => formatCurrency(value),
          font: { size: 10 }
        }
      } 
    },
  };

  if (isLoading) {
    return <PageSkeleton cards={5} />;
  }

  return (
    <div className="p-4 md:p-6 h-full flex flex-col overflow-y-auto bg-surface-50 custom-scrollbar">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-surface-800 tracking-tight">Painel de Controle</h1>
          <p className="text-xs text-surface-500 mt-1">Resumo operacional e saúde financeira do seu negócio.</p>
        </div>
        <Button variant="flat" size="sm" icon={`fa-rotate ${loading ? "fa-spin" : ""}`} onClick={() => refetch()}>
          Atualizar
        </Button>
      </div>

      {/* --- MOVIMENTO DO DIA --- */}
      <h2 className="text-[10px] font-black text-surface-400 uppercase tracking-widest mb-4 ml-1">
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
      <h2 className="text-[10px] font-black text-surface-400 uppercase tracking-widest mb-4 ml-1">
        Valorização de Estoque (Patrimônio)
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-gradient-to-br from-gray-900 to-gray-700 p-5 rounded-2xl shadow-lg border border-surface-900 text-white relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
             <i className="fas fa-vault text-6xl"></i>
          </div>
          <p className="text-[10px] text-surface-400 font-black uppercase tracking-widest mb-1">Custo Total (Investido)</p>
          <p className="text-3xl font-black tracking-tighter">{formatCurrency(inventoryStats.custoTotal)}</p>
          <p className="text-[10px] text-surface-400 mt-2 font-medium italic">Capital imobilizado em mercadoria</p>
        </div>

        <div className="bg-surface-100 p-5 rounded-2xl shadow-sm border border-surface-200 flex flex-col justify-between">
          <div>
            <p className="text-[10px] text-surface-400 font-black uppercase tracking-widest mb-1 text-primary-500">Venda Potencial</p>
            <p className="text-2xl font-black text-surface-800 tracking-tight">{formatCurrency(inventoryStats.vendaPotencial)}</p>
          </div>
          <p className="text-[10px] text-surface-400 mt-3 border-t pt-2 font-medium">Ticket total em prateleira</p>
        </div>

        <div className="bg-surface-100 p-5 rounded-2xl shadow-sm border border-surface-200 flex flex-col justify-between">
          <div>
            <p className="text-[10px] text-surface-400 font-black uppercase tracking-widest mb-1 text-green-600">Lucro Projetado</p>
            <p className="text-2xl font-black text-surface-800 tracking-tight">{formatCurrency(inventoryStats.lucroProjetado)}</p>
          </div>
          <p className="text-[10px] text-surface-400 mt-3 border-t pt-2 font-medium">Margem bruta acumulada</p>
        </div>

        <div className="bg-surface-100 p-5 rounded-2xl shadow-sm border-l-4 border-red-500 flex flex-col justify-between">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-bold text-surface-500 uppercase tracking-tighter">Produtos Zerados</span>
            <span className="bg-red-500 text-white px-2 py-0.5 rounded-full text-[10px] font-black">{inventoryStats.qtdZerados}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-surface-500 uppercase tracking-tighter">Baixo Estoque</span>
            <span className="bg-yellow-400 text-yellow-900 px-2 py-0.5 rounded-full text-[10px] font-black">{inventoryStats.qtdBaixoEstoque}</span>
          </div>
          <p className="text-[10px] text-surface-400 mt-3 border-t pt-2 text-right">Total Itens: <span className="font-bold text-surface-800">{inventoryStats.totalItensFisicos}</span></p>
        </div>
      </div>

      {/* --- GRÁFICOS E LISTAS --- */}
      <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-[400px]">
        {/* Gráfico */}
        <div className="flex-[2] bg-surface-100 p-6 rounded-2xl shadow-sm border border-surface-200 flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-black text-surface-800 tracking-tight">Desempenho Semanal</h2>
            <span className="text-[10px] font-bold bg-primary-50 text-primary-600 px-2 py-1 rounded-md uppercase border border-primary-100">Faturamento Real</span>
          </div>
          <div className="flex-1 relative w-full h-full min-h-[300px]">
            {chartData.datasets.length > 0 && (
              <Bar options={chartOptions} data={chartData} />
            )}
          </div>
        </div>

        {/* Alerta Estoque */}
        <div className="flex-1 bg-surface-100 p-6 rounded-2xl shadow-sm border border-surface-200 flex flex-col">
          <h2 className="text-lg font-black text-surface-800 mb-6 flex items-center gap-2">
            <i className="fas fa-shipping-fast text-red-500"></i> Reposição Urgente
          </h2>
          <div className="overflow-y-auto flex-1 custom-scrollbar pr-2">
            <ul className="space-y-4">
              {lowStock.map((p) => (
                <li
                  key={p.id}
                  className="flex justify-between items-center p-3.5 bg-surface-50 rounded-xl border border-surface-200 hover:border-red-200 transition-colors group"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-surface-800 text-sm truncate pr-2 group-hover:text-red-700 transition-colors">
                      {p.descricao}
                    </p>
                    <p className="text-[10px] text-surface-400 font-mono tracking-tighter uppercase">
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
                <div className="h-full flex flex-col items-center justify-center text-surface-300 py-10">
                  <div className="w-16 h-16 bg-green-500/10 text-green-600 rounded-full flex items-center justify-center mb-3">
                    <i className="fas fa-check text-2xl text-green-400"></i>
                  </div>
                  <p className="text-sm font-bold">Estoque saudável</p>
                  <p className="text-[10px] text-surface-400 uppercase font-medium">Tudo sob controle</p>
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
