// =============================================================
// useReportData.js — Hook para processamento de dados de relatório
// =============================================================
import { useState, useEffect, useMemo, useCallback } from "react";
import dayjs from "dayjs";
import { useAlert } from "../context/AlertSystem";
import { api } from "../services/api";

const standardizeMethod = (method) => {
  if (!method) return "Outros";
  const upper = method.toUpperCase().trim();
  if (upper === "PIX") return "Pix";
  if (upper === "DINHEIRO") return "Dinheiro";
  if (upper.includes("CRÉDITO") || upper.includes("CREDITO"))
    return "Crédito";
  if (upper.includes("DÉBITO") || upper.includes("DEBITO")) return "Débito";
  if (upper.includes("FIADO")) return "Fiado";
  if (upper.includes("MÚLTIPLOS") || upper.includes("MULTIPLOS"))
    return "Múltiplos";
  return method.charAt(0).toUpperCase() + method.slice(1).toLowerCase();
};

const useReportData = () => {
  const { showAlert } = useAlert();

  const [allSales, setAllSales] = useState([]);
  const [allServices, setAllServices] = useState([]);
  const [allPeople, setAllPeople] = useState([]);
  const [defaultCommission, setDefaultCommission] = useState(0.3);

  // --- FILTROS ---
  const [periodType, setPeriodType] = useState("weekly");
  const [startDate, setStartDate] = useState(
    dayjs().startOf("week").format("YYYY-MM-DD"),
  );
  const [endDate, setEndDate] = useState(
    dayjs().endOf("week").format("YYYY-MM-DD"),
  );
  const [selectedSeller, setSelectedSeller] = useState("all");
  const [selectedPayment, setSelectedPayment] = useState("all");

  // --- RESULTADOS ---
  const [metrics, setMetrics] = useState({
    faturamento: 0,
    custo: 0,
    maoDeObra: 0,
    acrescimos: 0,
    descontos: 0,
    comissoes: 0,
    lucro: 0,
  });
  const [filteredSales, setFilteredSales] = useState([]);
  const [laborSummary, setLaborSummary] = useState([]);
  const [paymentSummary, setPaymentSummary] = useState([]);
  const [loading, setLoading] = useState(false);

  const paymentMethods = useMemo(() => {
    const methods = new Set();
    allSales.forEach((s) => {
      if (s.lista_pagamentos && s.lista_pagamentos.length > 0) {
        s.lista_pagamentos.forEach((p) =>
          methods.add(standardizeMethod(p.metodo)),
        );
      } else {
        methods.add(standardizeMethod(s.forma_pagamento));
      }
    });
    return Array.from(methods).sort();
  }, [allSales]);

  // --- LOAD ---
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const startTimestamp = startDate
        ? dayjs(startDate).startOf("day").valueOf()
        : undefined;
      const endTimestamp = endDate
        ? dayjs(endDate).endOf("day").valueOf()
        : undefined;

      const sales = await api.sales.list({
        startDate: startTimestamp,
        endDate: endTimestamp,
      });
      const services = await api.services.list({
        startDate: startTimestamp,
        endDate: endTimestamp,
      });
      const people = await api.people.list();
      const configComissao = await api.config.get("comissao_padrao");

      setAllSales(sales.sort((a, b) => b.data_venda - a.data_venda));
      setAllServices(
        services.sort((a, b) => b.data_servico - a.data_servico),
      );
      setAllPeople(people);

      if (configComissao) setDefaultCommission(parseFloat(configComissao));
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      showAlert("Erro ao carregar dados do banco.", "Erro", "error");
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, showAlert]);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (startDate && endDate) loadData();
  }, [startDate, endDate]);

  // --- PERIOD CHANGE ---
  const handlePeriodChange = useCallback((type) => {
    setPeriodType(type);
    const now = dayjs();
    if (type === "weekly") {
      setStartDate(now.startOf("week").format("YYYY-MM-DD"));
      setEndDate(now.endOf("week").format("YYYY-MM-DD"));
    } else if (type === "monthly") {
      setStartDate(now.startOf("month").format("YYYY-MM-DD"));
      setEndDate(now.endOf("month").format("YYYY-MM-DD"));
    } else if (type === "yearly") {
      setStartDate(now.startOf("year").format("YYYY-MM-DD"));
      setEndDate(now.endOf("year").format("YYYY-MM-DD"));
    }
  }, []);

  // --- PROCESS DATA ---
  const processData = useCallback(() => {
    let vendasFiltradas = allSales.filter((s) => {
      const isSeller =
        selectedSeller === "all" || s.vendedor_id === parseInt(selectedSeller);
      const metodoNormalizado = standardizeMethod(s.forma_pagamento);
      let isPayment =
        selectedPayment === "all" || metodoNormalizado === selectedPayment;

      if (
        !isPayment &&
        s.lista_pagamentos &&
        s.lista_pagamentos.length > 0
      ) {
        isPayment = s.lista_pagamentos.some(
          (p) => standardizeMethod(p.metodo) === selectedPayment,
        );
      }
      return isSeller && isPayment;
    });

    let servicosFiltrados = allServices;

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

      let desconto = 0;
      if (venda.desconto_valor) {
        desconto =
          venda.desconto_tipo === "fixed"
            ? venda.desconto_valor
            : (subtotalProdutos * venda.desconto_valor) / 100;
      }

      const acrescimo = venda.acrescimo || 0;
      const valorFinalProdutos = subtotalProdutos - desconto;
      const custoReal = venda.custo_total_real || 0;
      const receitaLoja = valorFinalProdutos + acrescimo;

      let comissao = 0;
      if (
        venda.comissao_real !== undefined &&
        venda.comissao_real !== null
      ) {
        comissao = venda.comissao_real;
      } else {
        const taxa = vendedor?.comissao_fixa
          ? vendedor.comissao_fixa / 100
          : defaultCommission;
        if (valorFinalProdutos > 0) comissao = valorFinalProdutos * taxa;
      }

      const moVenda = venda.mao_de_obra || 0;

      if (!venda.cancelada) {
        let valorConsiderado = 0;
        if (selectedPayment === "all") {
          valorConsiderado = receitaLoja;
          if (
            venda.lista_pagamentos &&
            venda.lista_pagamentos.length > 0
          ) {
            venda.lista_pagamentos.forEach((p) =>
              addPaymentToMap(p.metodo, p.valor),
            );
          } else {
            addPaymentToMap(venda.forma_pagamento, receitaLoja);
          }
        } else {
          if (
            venda.lista_pagamentos &&
            venda.lista_pagamentos.length > 0
          ) {
            const pgFiltrados = venda.lista_pagamentos.filter(
              (p) => standardizeMethod(p.metodo) === selectedPayment,
            );
            valorConsiderado = pgFiltrados.reduce(
              (acc, p) => acc + p.valor,
              0,
            );
          } else {
            valorConsiderado = receitaLoja;
          }
          addPaymentToMap(selectedPayment, valorConsiderado);
        }

        const ratio =
          receitaLoja > 0 && selectedPayment !== "all"
            ? valorConsiderado / receitaLoja
            : 1;

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

    const arrayPagamentos = Object.entries(mapPagamentos)
      .map(([metodo, valor]) => ({ metodo, valor }))
      .sort((a, b) => b.valor - a.valor);

    const mapMO = {};
    vendasFiltradas.forEach((v) => {
      if (!v.cancelada && v.mao_de_obra > 0 && v.trocador_id) {
        if (!mapMO[v.trocador_id])
          mapMO[v.trocador_id] = {
            nome: v.trocador_nome,
            total: 0,
            qtd: 0,
          };
        mapMO[v.trocador_id].total += v.mao_de_obra;
        mapMO[v.trocador_id].qtd += 1;
      }
    });
    servicosFiltrados.forEach((s) => {
      if (s.trocador_id) {
        let nomeTrocador =
          s.trocador_nome ||
          allPeople.find((p) => p.id === s.trocador_id)?.nome ||
          "Desconhecido";
        if (!mapMO[s.trocador_id])
          mapMO[s.trocador_id] = { nome: nomeTrocador, total: 0, qtd: 0 };
        mapMO[s.trocador_id].total += s.valor;
        mapMO[s.trocador_id].qtd += 1;
      }
    });

    setLaborSummary(Object.values(mapMO));
    setFilteredSales(vendasProcessadas);
    setPaymentSummary(arrayPagamentos);

    const lucroLiquido =
      totalFaturamentoPecas -
      (totalCustoPecas + totalComissoes + totalDespesaMO);

    setMetrics({
      faturamento: totalFaturamentoPecas,
      custo: totalCustoPecas,
      maoDeObra: totalDespesaMO,
      acrescimos: totalAcrescimos,
      descontos: totalDescontos,
      comissoes: totalComissoes,
      lucro: lucroLiquido,
    });
  }, [
    allSales,
    allServices,
    allPeople,
    selectedSeller,
    selectedPayment,
    defaultCommission,
  ]);

  useEffect(() => {
    processData();
  }, [
    allSales,
    allServices,
    selectedSeller,
    selectedPayment,
    defaultCommission,
  ]);

  return {
    // State
    allSales,
    allPeople,
    metrics,
    filteredSales,
    laborSummary,
    paymentSummary,
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
    standardizeMethod,
  };
};

export default useReportData;
export { standardizeMethod };
