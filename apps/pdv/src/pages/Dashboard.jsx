// @ts-nocheck
import React from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { formatCurrency } from "../utils/format";
import { api } from "../services/api";
import { useTheme } from "../context/ThemeContext";
import PageSkeleton from "../components/ui/PageSkeleton";
import { Card } from "../components/ui/Card";
import { Icon } from "../components/ui/Icon";

// Estilo de valor numérico do design: mono, tabular, tracking apertado.
const MONO = { fontFamily: "var(--font-mono)", fontVariantNumeric: "tabular-nums", letterSpacing: "-0.02em" };

/** Cartão de indicador (anatomia do handoff: caption caps + valor mono + sub). */
function Metric({ caption, value, sub, subTone = "muted" }) {
  return (
    <Card padding="none" className="p-5 flex flex-col gap-2">
      <span className="text-[10px] font-semibold uppercase tracking-[var(--tracking-caps)] text-[var(--muted-foreground)]">
        {caption}
      </span>
      <span className="text-[26px] leading-[1.1] font-semibold text-[var(--foreground)]" style={MONO}>
        {value}
      </span>
      {sub != null && (
        <span
          className="text-xs font-semibold"
          style={{ ...MONO, letterSpacing: "normal", color: subTone === "pos" ? "var(--money-positive)" : "var(--muted-foreground)" }}
        >
          {sub}
        </span>
      )}
    </Card>
  );
}
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
  const navigate = useNavigate();

  // Subtextos derivados (design mostra margem e ticket).
  const margem = stats.faturamento > 0 ? (stats.lucro / stats.faturamento) * 100 : 0;
  const ticket = stats.vendasCount > 0 ? stats.faturamento / stats.vendasCount : 0;

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
      <div className="flex justify-between items-center gap-3 mb-6">
        <h1 className="text-lg md:text-xl font-semibold text-[var(--foreground)] tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
          Painel de controle
        </h1>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 h-[34px] px-3 rounded-[var(--radius-md)] border border-[var(--border)] text-[13px] font-medium text-[var(--foreground)]">
            Hoje
          </div>
          <button
            onClick={() => refetch()}
            title="Atualizar"
            className="w-[34px] h-[34px] flex items-center justify-center rounded-[var(--radius-md)] border border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--hover-surface)] transition"
          >
            <Icon name="refresh-cw" size={16} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* --- 5 indicadores do dia --- */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4 mb-6">
        <Metric caption="Faturamento" value={formatCurrency(stats.faturamento)} />
        <Metric caption="Lucro líquido" value={formatCurrency(stats.lucro)} sub={`${margem.toFixed(1).replace(".", ",")}% margem`} />
        <Metric caption="Vendas" value={stats.vendasCount} sub={`ticket ${formatCurrency(ticket)}`} />
        <Metric caption="Mão de obra" value={formatCurrency(stats.maoDeObra)} />
        <Metric caption="Comissões" value={formatCurrency(stats.comissoes)} />
      </div>

      {/* --- Venda potencial + Situação do estoque --- */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.7fr_1fr] gap-4 mb-6">
        <Card
          padding="none"
          className="p-5 flex flex-col justify-between gap-2 bg-[var(--primary-soft)] border-[var(--primary-soft-border)] cursor-pointer"
          onClick={() => navigate("/produtos")}
        >
          <span className="text-[10px] font-semibold uppercase tracking-[var(--tracking-caps)] text-[var(--primary-soft-foreground)]">
            Venda potencial
          </span>
          <span className="text-[26px] leading-[1.1] font-semibold text-[var(--primary-soft-foreground)]" style={MONO}>
            {formatCurrency(inventoryStats.vendaPotencial)}
          </span>
          <span className="text-xs font-medium text-[var(--primary-soft-foreground)] opacity-80">
            Ticket total em prateleira · {inventoryStats.totalItensFisicos} itens
          </span>
        </Card>

        <Card padding="none" className="p-5 flex flex-col gap-3">
          <span className="text-[10px] font-semibold uppercase tracking-[var(--tracking-caps)] text-[var(--muted-foreground)]">
            Situação do estoque
          </span>
          <button
            onClick={() => navigate("/produtos")}
            className="flex items-center justify-between rounded-[var(--radius-md)] px-3 py-2 hover:bg-[var(--hover-surface)] transition text-left"
          >
            <span className="flex items-center gap-2 text-sm text-[var(--foreground)]">
              <Icon name="package-x" size={16} className="text-[var(--danger)]" /> Produtos zerados
            </span>
            <span className="text-sm font-semibold text-[var(--danger)]" style={MONO}>{inventoryStats.qtdZerados}</span>
          </button>
          <button
            onClick={() => navigate("/produtos")}
            className="flex items-center justify-between rounded-[var(--radius-md)] px-3 py-2 hover:bg-[var(--hover-surface)] transition text-left"
          >
            <span className="flex items-center gap-2 text-sm text-[var(--foreground)]">
              <Icon name="alert-triangle" size={16} className="text-[var(--warning-icon)]" /> Baixo estoque
            </span>
            <span className="text-sm font-semibold text-[var(--warning-icon)]" style={MONO}>{inventoryStats.qtdBaixoEstoque}</span>
          </button>
        </Card>
      </div>

      {/* --- GRÁFICOS E LISTAS --- */}
      <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-[400px]">
        {/* Gráfico */}
        <Card padding="none" className="flex-[2] p-6 flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-base font-semibold text-[var(--foreground)] tracking-tight" style={{ fontFamily: "var(--font-display)" }}>Desempenho semanal</h2>
            <span className="text-[10px] font-semibold bg-[var(--primary-soft)] text-[var(--primary-soft-foreground)] px-2 py-1 rounded-md uppercase border border-[var(--primary-soft-border)] tracking-[var(--tracking-caps)]">Faturamento real</span>
          </div>
          <div className="flex-1 relative w-full h-full min-h-[300px]">
            {chartData.datasets.length > 0 && (
              <Bar options={chartOptions} data={chartData} />
            )}
          </div>
        </Card>

        {/* Alerta Estoque */}
        <Card padding="none" className="flex-1 p-6 flex flex-col">
          <h2 className="text-base font-semibold text-[var(--foreground)] mb-6 flex items-center gap-2" style={{ fontFamily: "var(--font-display)" }}>
            <Icon name="truck" size={18} className="text-[var(--danger)]" /> Reposição urgente
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
                  <div className="w-16 h-16 bg-[var(--success-soft)] text-[var(--success)] rounded-full flex items-center justify-center mb-3">
                    <Icon name="circle-check" size={26} />
                  </div>
                  <p className="text-sm font-bold text-[var(--foreground)]">Estoque saudável</p>
                  <p className="text-[10px] text-[var(--muted-foreground)] uppercase font-medium">Tudo sob controle</p>
                </div>
              )}
            </ul>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
