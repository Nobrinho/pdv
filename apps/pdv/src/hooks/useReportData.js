// =============================================================
// useReportData.js — Dados de relatório (Comissões / Relatórios) via
// TanStack Query. Dois modos:
//   - Online: o relatório é calculado no servidor (/reports/sales).
//   - Local (Electron): busca dados crus e calcula no cliente (computeReport).
// A interface de retorno é a mesma dos dois lados.
// =============================================================
import { useMemo, useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import { api } from "../services/api";
import { buildDateRangeTimestamps, getPeriodRange } from "../utils/dateFilters";

const standardizeMethod = (method) => {
  if (!method) return "Outros";
  const upper = method.toUpperCase().trim();
  if (upper === "PIX") return "Pix";
  if (upper === "DINHEIRO") return "Dinheiro";
  if (upper.includes("CRÉDITO") || upper.includes("CREDITO")) return "Crédito";
  if (upper.includes("DÉBITO") || upper.includes("DEBITO")) return "Débito";
  if (upper.includes("FIADO")) return "Fiado";
  if (upper.includes("MÚLTIPLOS") || upper.includes("MULTIPLOS")) return "Múltiplos";
  return method.charAt(0).toUpperCase() + method.slice(1).toLowerCase();
};

const EMPTY_METRICS = {
  faturamento: 0,
  custo: 0,
  maoDeObra: 0,
  acrescimos: 0,
  descontos: 0,
  comissoes: 0,
  lucro: 0,
  despesas: 0,
  lucroLiquido: 0,
};

// Cálculo do relatório no cliente (modo local). Função pura.
function computeReport({ allSales, allServices, allPeople, selectedSeller, selectedPayment, defaultCommission, despesasTotal = 0 }) {
  const vendasFiltradas = allSales.filter((s) => {
    const isSeller = selectedSeller === "all" || s.vendedor_id === parseInt(selectedSeller);
    const metodoNormalizado = standardizeMethod(s.forma_pagamento);
    let isPayment = selectedPayment === "all" || metodoNormalizado === selectedPayment;
    if (!isPayment && s.lista_pagamentos && s.lista_pagamentos.length > 0) {
      isPayment = s.lista_pagamentos.some((p) => standardizeMethod(p.metodo) === selectedPayment);
    }
    return isSeller && isPayment;
  });

  const servicosFiltrados = allServices;

  let totalFaturamentoPecas = 0;
  let totalCustoPecas = 0;
  let totalDespesaMO = 0;
  let totalAcrescimos = 0;
  let totalDescontos = 0;
  let totalComissoes = 0;

  const mapPagamentos = {};
  const addPaymentToMap = (metodoRaw, valor) => {
    const metodo = standardizeMethod(metodoRaw);
    if (!metodo) return;
    if (!mapPagamentos[metodo]) mapPagamentos[metodo] = 0;
    mapPagamentos[metodo] += valor;
  };

  const vendasProcessadas = vendasFiltradas.map((venda) => {
    const vendedor = allPeople.find((p) => p.id === venda.vendedor_id);
    const subtotalProdutos = venda.subtotal;
    const desconto = venda.desconto_valor || 0;
    const acrescimo = venda.acrescimo || 0;
    const valorFinalProdutos = subtotalProdutos - desconto;
    const custoReal = venda.custo_total_real || 0;
    const receitaLoja = valorFinalProdutos + acrescimo;

    let comissao = 0;
    if (venda.comissao_real !== undefined && venda.comissao_real !== null) {
      comissao = venda.comissao_real;
    } else {
      const taxa = vendedor?.comissao_fixa ? vendedor.comissao_fixa / 100 : defaultCommission;
      if (valorFinalProdutos > 0) comissao = valorFinalProdutos * taxa;
    }

    const moVenda = venda.mao_de_obra || 0;

    if (!venda.cancelada) {
      let valorConsiderado = 0;
      if (selectedPayment === "all") {
        valorConsiderado = receitaLoja;
        if (venda.lista_pagamentos && venda.lista_pagamentos.length > 0) {
          venda.lista_pagamentos.forEach((p) => addPaymentToMap(p.metodo, p.valor));
        } else {
          addPaymentToMap(venda.forma_pagamento, receitaLoja);
        }
      } else {
        if (venda.lista_pagamentos && venda.lista_pagamentos.length > 0) {
          const pgFiltrados = venda.lista_pagamentos.filter(
            (p) => standardizeMethod(p.metodo) === selectedPayment,
          );
          valorConsiderado = pgFiltrados.reduce((acc, p) => acc + p.valor, 0);
        } else {
          valorConsiderado = receitaLoja;
        }
        addPaymentToMap(selectedPayment, valorConsiderado);
      }

      const ratio = receitaLoja > 0 && selectedPayment !== "all" ? valorConsiderado / receitaLoja : 1;

      totalFaturamentoPecas += valorConsiderado;
      totalCustoPecas += custoReal * ratio;
      totalDespesaMO += moVenda * ratio;
      totalAcrescimos += acrescimo * ratio;
      totalDescontos += desconto * ratio;
      totalComissoes += comissao * ratio;
    }

    return { ...venda, comissao_calculada: comissao };
  });

  servicosFiltrados.forEach((serv) => {
    totalDespesaMO += serv.valor;
  });

  const paymentSummary = Object.entries(mapPagamentos)
    .map(([metodo, valor]) => ({ metodo, valor }))
    .sort((a, b) => b.valor - a.valor);

  const mapMO = {};
  vendasFiltradas.forEach((v) => {
    if (!v.cancelada && v.mao_de_obra > 0 && v.trocador_id) {
      if (!mapMO[v.trocador_id]) mapMO[v.trocador_id] = { nome: v.trocador_nome, total: 0, qtd: 0 };
      mapMO[v.trocador_id].total += v.mao_de_obra;
      mapMO[v.trocador_id].qtd += 1;
    }
  });
  servicosFiltrados.forEach((s) => {
    if (s.trocador_id) {
      const nomeTrocador =
        s.trocador_nome || allPeople.find((p) => p.id === s.trocador_id)?.nome || "Desconhecido";
      if (!mapMO[s.trocador_id]) mapMO[s.trocador_id] = { nome: nomeTrocador, total: 0, qtd: 0 };
      mapMO[s.trocador_id].total += s.valor;
      mapMO[s.trocador_id].qtd += 1;
    }
  });

  // Resultado operacional (peças): faturamento − custo − comissões.
  const lucroOperacional = totalFaturamentoPecas - (totalCustoPecas + totalComissoes);
  // Lucro líquido: resultado operacional menos as despesas cadastradas no período.
  const lucroLiquido = lucroOperacional - (Number(despesasTotal) || 0);

  return {
    metrics: {
      faturamento: totalFaturamentoPecas,
      custo: totalCustoPecas,
      maoDeObra: totalDespesaMO,
      acrescimos: totalAcrescimos,
      descontos: totalDescontos,
      comissoes: totalComissoes,
      lucro: lucroOperacional,
      despesas: Number(despesasTotal) || 0,
      lucroLiquido,
    },
    filteredSales: vendasProcessadas,
    laborSummary: Object.values(mapMO),
    paymentSummary,
  };
}

const toArray = (res) => (Array.isArray(res) ? res : res?.data || []);

const useReportData = () => {
  const queryClient = useQueryClient();

  // --- FILTROS ---
  const [periodType, setPeriodType] = useState("weekly");
  const [startDate, setStartDate] = useState(dayjs().startOf("week").format("YYYY-MM-DD"));
  const [endDate, setEndDate] = useState(dayjs().endOf("week").format("YYYY-MM-DD"));
  const [selectedSeller, setSelectedSeller] = useState("all");
  const [selectedPayment, setSelectedPayment] = useState("all");

  const isOnlineReports = api.isRemote && !!api.reports;
  const validRange = !!(startDate && endDate);
  const { startTimestamp, endTimestamp } = buildDateRangeTimestamps(startDate, endDate);

  // Pessoas (cache compartilhado).
  const peopleQuery = useQuery({ queryKey: ["people"], queryFn: () => api.people.list() });
  const allPeople = peopleQuery.data || [];

  // ----- ONLINE: relatório calculado no servidor -----
  const onlineReportQuery = useQuery({
    queryKey: ["report-online", { startTimestamp, endTimestamp, selectedSeller, selectedPayment }],
    queryFn: () =>
      api.reports.sales({
        startDate: startTimestamp,
        endDate: endTimestamp,
        sellerId: selectedSeller !== "all" ? selectedSeller : undefined,
        payment: selectedPayment !== "all" ? selectedPayment : undefined,
      }),
    enabled: isOnlineReports && validRange,
  });

  // ----- LOCAL: dados crus + taxa de comissão -----
  const salesQuery = useQuery({
    queryKey: ["report-sales", { startTimestamp, endTimestamp }],
    queryFn: () => api.sales.list({ startDate: startTimestamp, endDate: endTimestamp }),
    enabled: !isOnlineReports && validRange,
  });
  const servicesQuery = useQuery({
    queryKey: ["report-services", { startTimestamp, endTimestamp }],
    queryFn: () => api.services.list({ startDate: startTimestamp, endDate: endTimestamp }),
    enabled: !isOnlineReports && validRange,
  });
  const commissionQuery = useQuery({
    queryKey: ["config", "comissao_padrao"],
    queryFn: () => api.config.get("comissao_padrao"),
    enabled: !isOnlineReports,
  });
  const defaultCommission = commissionQuery.data ? parseFloat(commissionQuery.data) : 0.3;

  // Despesas do período (modo local). No online já vêm no relatório do servidor.
  const expensesQuery = useQuery({
    queryKey: ["report-expenses", { startTimestamp, endTimestamp }],
    queryFn: () => api.expenses.list({ startDate: startTimestamp, endDate: endTimestamp }),
    enabled: !isOnlineReports && validRange,
  });
  const despesasTotal = Number(expensesQuery.data?.totals?.total) || 0;

  const allSales = useMemo(() => {
    if (isOnlineReports) return onlineReportQuery.data?.sales || [];
    return [...toArray(salesQuery.data)].sort((a, b) => b.data_venda - a.data_venda);
  }, [isOnlineReports, onlineReportQuery.data, salesQuery.data]);

  const allServices = useMemo(() => {
    if (isOnlineReports) return [];
    return [...toArray(servicesQuery.data)].sort((a, b) => b.data_servico - a.data_servico);
  }, [isOnlineReports, servicesQuery.data]);

  const paymentMethods = useMemo(() => {
    const methods = new Set();
    allSales.forEach((s) => {
      if (s.lista_pagamentos && s.lista_pagamentos.length > 0) {
        s.lista_pagamentos.forEach((p) => methods.add(standardizeMethod(p.metodo)));
      } else {
        methods.add(standardizeMethod(s.forma_pagamento));
      }
    });
    return Array.from(methods).sort();
  }, [allSales]);

  // Resultado processado (online vem pronto; local é calculado aqui).
  const processed = useMemo(() => {
    if (isOnlineReports) {
      const d = onlineReportQuery.data || {};
      const m = d.metrics || EMPTY_METRICS;
      // O servidor entrega snake_case (lucro_liquido); normaliza p/ a UI.
      return {
        metrics: {
          ...m,
          despesas: Number(m.despesas) || 0,
          lucroLiquido: Number(m.lucroLiquido ?? m.lucro_liquido ?? m.lucro) || 0,
        },
        filteredSales: d.sales || [],
        laborSummary: d.laborSummary || [],
        paymentSummary: d.paymentSummary || [],
      };
    }
    return computeReport({
      allSales,
      allServices,
      allPeople,
      selectedSeller,
      selectedPayment,
      defaultCommission,
      despesasTotal,
    });
  }, [
    isOnlineReports,
    onlineReportQuery.data,
    allSales,
    allServices,
    allPeople,
    selectedSeller,
    selectedPayment,
    defaultCommission,
    despesasTotal,
  ]);

  const loading = isOnlineReports
    ? onlineReportQuery.isLoading
    : salesQuery.isLoading || servicesQuery.isLoading || expensesQuery.isLoading;

  const derivePagination = (raw, fallbackLen) => {
    if (!raw || Array.isArray(raw)) return { page: 1, totalPages: 0, total: fallbackLen };
    return { page: raw.page || 1, totalPages: raw.totalPages || 0, total: raw.total || 0 };
  };
  const salesPagination = useMemo(
    () => derivePagination(salesQuery.data, allSales.length),
    [salesQuery.data, allSales.length],
  );
  const servicesPagination = useMemo(
    () => derivePagination(servicesQuery.data, allServices.length),
    [servicesQuery.data, allServices.length],
  );

  const handlePeriodChange = useCallback((type) => {
    setPeriodType(type);
    const range = getPeriodRange(type);
    if (range) {
      setStartDate(range.startDate);
      setEndDate(range.endDate);
    }
  }, []);

  // Recarrega o relatório (ex.: após baixar comissões).
  const loadData = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["report-online"] }),
      queryClient.invalidateQueries({ queryKey: ["report-sales"] }),
      queryClient.invalidateQueries({ queryKey: ["report-services"] }),
    ]);
  }, [queryClient]);

  return {
    // State
    allSales,
    allPeople,
    metrics: processed.metrics,
    filteredSales: processed.filteredSales,
    laborSummary: processed.laborSummary,
    paymentSummary: processed.paymentSummary,
    paymentMethods,
    loading,
    // Filtros
    periodType,
    startDate,
    endDate,
    selectedSeller,
    selectedPayment,
    setStartDate,
    setEndDate,
    setSelectedSeller,
    setSelectedPayment,
    setPeriodType,
    handlePeriodChange,
    // Ações
    loadData,
    salesPagination,
    servicesPagination,
    standardizeMethod,
  };
};

export default useReportData;
export { standardizeMethod };
