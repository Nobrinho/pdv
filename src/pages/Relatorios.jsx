// @ts-nocheck
import React, { useState, useEffect, useMemo } from "react";
import dayjs from "dayjs";
import "dayjs/locale/pt-br";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { useAlert } from "../context/AlertSystem";

dayjs.locale("pt-br");

const Relatorios = () => {
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

  const paymentMethods = useMemo(() => {
    const methods = new Set(
      allSales.map((s) => standardizeMethod(s.forma_pagamento)),
    );
    return Array.from(methods).sort();
  }, [allSales]);

  // --- MÉTRICAS ---
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

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    processData();
  }, [
    allSales,
    allServices,
    startDate,
    endDate,
    selectedSeller,
    selectedPayment,
    defaultCommission,
  ]);

  const loadData = async () => {
    try {
      const sales = await window.api.getSales();
      const services = await window.api.getServices();
      const people = await window.api.getPeople();
      const configComissao = await window.api.getConfig("comissao_padrao");

      setAllSales(sales.sort((a, b) => b.data_venda - a.data_venda));
      setAllServices(services.sort((a, b) => b.data_servico - a.data_servico));
      setAllPeople(people);

      if (configComissao) setDefaultCommission(parseFloat(configComissao));
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      showAlert("Erro ao carregar dados do banco.", "Erro", "error");
    }
  };

  const handlePeriodChange = (type) => {
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
  };

  const isWithinRange = (timestamp) => {
    const start = dayjs(startDate).startOf("day");
    const end = dayjs(endDate).endOf("day");
    const dateToCheck = dayjs(timestamp);
    return (
      dateToCheck.isSame(start) ||
      dateToCheck.isSame(end) ||
      (dateToCheck.isAfter(start) && dateToCheck.isBefore(end))
    );
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(val || 0);
  };

  const processData = () => {
    // 1. Filtragem de Vendas
    let vendasFiltradas = allSales.filter((s) => {
      const inDate = isWithinRange(s.data_venda);
      const isSeller =
        selectedSeller === "all" || s.vendedor_id === parseInt(selectedSeller);
      const metodoNormalizado = standardizeMethod(s.forma_pagamento);
      const isPayment =
        selectedPayment === "all" || metodoNormalizado === selectedPayment;

      return inDate && isSeller && isPayment;
    });

    // 2. Filtragem de Serviços
    let servicosFiltrados = allServices.filter((s) => {
      return isWithinRange(s.data_servico);
    });

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

      // --- CORREÇÃO DA COMISSÃO ---
      let comissao = 0;

      // 1. Tenta usar o valor calculado pelo Backend (Preciso)
      if (venda.comissao_real !== undefined && venda.comissao_real !== null) {
        comissao = venda.comissao_real;
      }
      // 2. Fallback: Se o backend não mandou (versão antiga ou venda sem itens), calcula estimativa no Front
      else {
        const taxa = vendedor?.comissao_fixa
          ? vendedor.comissao_fixa / 100
          : defaultCommission;
        if (valorFinalProdutos > 0) {
          comissao = valorFinalProdutos * taxa;
        }
      }

      const moVenda = venda.mao_de_obra || 0;

      if (!venda.cancelada) {
        const receitaLoja = valorFinalProdutos + acrescimo;

        totalFaturamentoPecas += receitaLoja;
        totalCustoPecas += custoReal;
        totalDespesaMO += moVenda;
        totalAcrescimos += acrescimo;
        totalDescontos += desconto;
        totalComissoes += comissao;

        addPaymentToMap(venda.forma_pagamento, receitaLoja);
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
          mapMO[v.trocador_id] = { nome: v.trocador_nome, total: 0, qtd: 0 };
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
  };

  const exportPDF = () => {
    try {
      const doc = new jsPDF();
      doc.setFontSize(18);
      doc.text("Relatório Gerencial", 14, 20);
      doc.setFontSize(10);
      doc.text(
        `Período: ${dayjs(startDate).format("DD/MM/YYYY")} a ${dayjs(endDate).format("DD/MM/YYYY")}`,
        14,
        28,
      );
      doc.text(
        "Filtro: " +
          (selectedPayment === "all" ? "Todos Pagamentos" : selectedPayment),
        14,
        33,
      );

      autoTable(doc, {
        startY: 40,
        head: [
          [
            "Faturamento (Peças)",
            "(-) Custo Peças",
            "(-) Mão de Obra Paga",
            "(-) Comissões",
            "= LUCRO",
          ],
        ],
        body: [
          [
            formatCurrency(metrics.faturamento),
            formatCurrency(metrics.custo),
            formatCurrency(metrics.maoDeObra),
            formatCurrency(metrics.comissoes),
            formatCurrency(metrics.lucro),
          ],
        ],
        theme: "grid",
        headStyles: { fillColor: [41, 128, 185] },
        styles: { halign: "center", fontSize: 10, fontStyle: "bold" },
      });

      let finalY = doc.lastAutoTable.finalY || 40;

      if (paymentSummary.length > 0) {
        doc.text("Faturamento por Método de Pagamento", 14, finalY + 15);
        autoTable(doc, {
          startY: finalY + 20,
          head: [["Método", "Valor Total"]],
          body: paymentSummary.map((p) => [p.metodo, formatCurrency(p.valor)]),
          theme: "grid",
        });
        finalY = doc.lastAutoTable.finalY;
      }

      if (laborSummary.length > 0) {
        doc.text("Pagamentos de Mão de Obra (Trocadores)", 14, finalY + 15);
        autoTable(doc, {
          startY: finalY + 20,
          head: [["Responsável", "Qtd Serviços", "Valor Pago"]],
          body: laborSummary.map((l) => [
            l.nome,
            l.qtd,
            formatCurrency(l.total),
          ]),
        });
        finalY = doc.lastAutoTable.finalY;
      }

      doc.text("Vendas Detalhadas", 14, finalY + 15);
      const tableData = filteredSales.map((v) => [
        dayjs(v.data_venda).format("DD/MM HH:mm"),
        v.vendedor_nome,
        formatCurrency(v.subtotal),
        v.acrescimo > 0 ? formatCurrency(v.acrescimo) : "-",
        v.desconto_valor > 0 ? formatCurrency(v.desconto_valor) : "-",
        formatCurrency(v.total_final),
        v.cancelada ? "CANCELADA" : formatCurrency(v.comissao_calculada),
      ]);

      autoTable(doc, {
        startY: finalY + 20,
        head: [
          [
            "Data",
            "Vendedor",
            "Subtotal",
            "Acrésc.",
            "Desc.",
            "Total",
            "Comissão",
          ],
        ],
        body: tableData,
        didParseCell: function (data) {
          if (data.row.raw[6] === "CANCELADA") {
            data.cell.styles.textColor = [255, 0, 0];
          }
        },
      });

      doc.save(`relatorio_${dayjs().format("YYYY-MM-DD")}.pdf`);
      showAlert("PDF gerado com sucesso!", "Exportação", "success");
    } catch (error) {
      console.error(error);
      showAlert("Erro ao gerar PDF.", "Erro", "error");
    }
  };

  const StatCard = ({ title, value, color, tooltip, icon }) => (
    <div
      className={`bg-white p-4 rounded-xl shadow-sm border-l-4 border-${color}-500 relative group cursor-help transition-transform hover:scale-[1.02] flex items-center justify-between`}
    >
      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block w-48 bg-gray-800 text-white text-xs rounded p-2 z-50 text-center shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
        {tooltip}
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-800"></div>
      </div>
      <div>
        <p className="text-xs text-gray-500 font-bold uppercase mb-1 w-fit">
          {title}
        </p>
        <p
          className={`text-xl font-bold text-${color === "blue" || color === "gray" ? "gray-800" : color + "-600"}`}
        >
          {formatCurrency(value)}
        </p>
      </div>
      {icon && (
        <i className={`fas ${icon} text-2xl text-${color}-200 opacity-50`}></i>
      )}
    </div>
  );

  return (
    <div className="p-4 md:p-6 h-full flex flex-col overflow-y-auto bg-gray-50">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h1 className="text-xl md:text-2xl font-bold text-gray-800">
          Relatórios Financeiros
        </h1>
        <button
          onClick={exportPDF}
          className="w-full sm:w-auto bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 shadow-md flex items-center justify-center gap-2 transition active:scale-95"
        >
          <i className="fas fa-file-pdf"></i> Exportar PDF
        </button>
      </div>

      {/* --- BARRA DE FILTROS APRIMORADA --- */}
      <div className="bg-white p-4 rounded-xl shadow-sm mb-6 border border-gray-100 flex flex-col gap-4">
        {/* Filtros Rápidos */}
        <div className="flex gap-2 border-b pb-4 overflow-x-auto">
          <button
            onClick={() => handlePeriodChange("weekly")}
            className={`px-4 py-1.5 text-sm rounded-full transition whitespace-nowrap ${periodType === "weekly" ? "bg-blue-600 text-white font-bold" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
          >
            Esta Semana
          </button>
          <button
            onClick={() => handlePeriodChange("monthly")}
            className={`px-4 py-1.5 text-sm rounded-full transition whitespace-nowrap ${periodType === "monthly" ? "bg-blue-600 text-white font-bold" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
          >
            Este Mês
          </button>
          <button
            onClick={() => handlePeriodChange("yearly")}
            className={`px-4 py-1.5 text-sm rounded-full transition whitespace-nowrap ${periodType === "yearly" ? "bg-blue-600 text-white font-bold" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
          >
            Este Ano
          </button>
        </div>

        {/* Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
              Início
            </label>
            <input
              type="date"
              className="w-full border rounded p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPeriodType("custom");
              }}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
              Fim
            </label>
            <input
              type="date"
              className="w-full border rounded p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPeriodType("custom");
              }}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
              Vendedor
            </label>
            <select
              className="w-full border rounded p-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none"
              value={selectedSeller}
              onChange={(e) => setSelectedSeller(e.target.value)}
            >
              <option value="all">Todos</option>
              {allPeople
                .filter((p) => p.cargo_nome === "Vendedor")
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nome}
                  </option>
                ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
              Pagamento
            </label>
            <select
              className="w-full border rounded p-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none"
              value={selectedPayment}
              onChange={(e) => setSelectedPayment(e.target.value)}
            >
              <option value="all">Todos</option>
              {paymentMethods.map((method) => (
                <option key={method} value={method}>
                  {method}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* --- KPIS (Cards) --- */}
      <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 ml-1">
        Indicadores Financeiros
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4 mb-6">
        <StatCard
          title="Fat. Produtos"
          value={metrics.faturamento}
          color="blue"
          icon="fa-chart-line"
          tooltip="Valor total das peças vendidas (excluindo Mão de Obra)."
        />
        <StatCard
          title="Custos Peças"
          value={metrics.custo}
          color="red"
          icon="fa-tags"
          tooltip="Custo de aquisição das peças vendidas."
        />
        <StatCard
          title="M.O. (Despesa)"
          value={metrics.maoDeObra}
          color="orange"
          icon="fa-wrench"
          tooltip="Valor TOTAL pago aos mecânicos (Serviços + Vendas)."
        />
        <StatCard
          title="Acréscimos"
          value={metrics.acrescimos}
          color="green"
          icon="fa-plus-circle"
          tooltip="Taxas extras cobradas nas vendas."
        />
        <StatCard
          title="Descontos"
          value={metrics.descontos}
          color="gray"
          icon="fa-percent"
          tooltip="Total de descontos concedidos."
        />
        <StatCard
          title="Comissões"
          value={metrics.comissoes}
          color="purple"
          icon="fa-user-tag"
          tooltip="Valor devido aos vendedores sobre o faturamento de peças."
        />
      </div>

      {/* Lucro Líquido */}
      <div className="bg-green-50 p-4 rounded-xl shadow-sm border border-green-200 mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div>
          <p className="text-sm text-green-700 font-bold uppercase">
            Lucro Líquido Real
          </p>
          <p className="text-xs text-green-600">
            Fat. Peças + Acréscimos - (Custo Peças + Comissões + Mão de Obra
            Total)
          </p>
        </div>
        <p className="text-3xl font-bold text-green-700 tracking-tight">
          {formatCurrency(metrics.lucro)}
        </p>
      </div>

      {/* --- TABELAS --- */}
      {selectedPayment === "Múltiplos" && (
        <div className="mb-6 bg-indigo-50 rounded-xl border border-indigo-200 p-4">
          <h3 className="text-indigo-800 font-bold mb-2 flex items-center">
            <i className="fas fa-info-circle mr-2"></i> Detalhamento de Vendas
            com Múltiplos Pagamentos
          </h3>
          <p className="text-sm text-indigo-600 mb-0">
            Abaixo estão listadas as vendas onde foram utilizadas múltiplas
            formas de pagamento.
          </p>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-[500px]">
        {/* Esquerda: Vendas Detalhadas */}
        <div className="flex-[2] bg-white rounded-xl shadow-md flex flex-col overflow-hidden border border-gray-100 min-h-[300px]">
          <div className="p-3 bg-gray-50 border-b font-bold text-gray-700 text-sm flex justify-between items-center">
            <span>Extrato de Vendas</span>
            <span className="text-xs bg-white px-2 py-1 rounded border text-gray-500">
              {filteredSales.length} registros
            </span>
          </div>
          <div className="overflow-y-auto flex-1 custom-scrollbar">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Data
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Vendedor
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                    Total Venda
                  </th>
                  <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">
                    Pagto
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                    Comissão
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredSales.map((v) => (
                  <tr
                    key={v.id}
                    className={`hover:bg-gray-50 ${v.cancelada ? "bg-red-50 text-red-400" : ""}`}
                  >
                    <td className="px-4 py-2 text-sm">
                      {dayjs(v.data_venda).format("DD/MM HH:mm")}
                    </td>
                    <td className="px-4 py-2 text-sm">{v.vendedor_nome}</td>
                    <td className="px-4 py-2 text-sm text-right font-medium">
                      {formatCurrency(v.total_final)}
                    </td>
                    <td className="px-4 py-2 text-center text-xs">
                      <span
                        className={`px-2 py-0.5 rounded ${v.forma_pagamento === "Múltiplos" ? "bg-indigo-100 text-indigo-700" : "bg-gray-100 text-gray-600"}`}
                      >
                        {standardizeMethod(v.forma_pagamento) || "-"}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-sm text-right text-purple-600">
                      {v.cancelada ? "-" : formatCurrency(v.comissao_calculada)}
                    </td>
                  </tr>
                ))}
                {filteredSales.length === 0 && (
                  <tr>
                    <td colSpan="5" className="p-8 text-center text-gray-400">
                      Nenhuma venda neste período.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Direita: Resumos */}
        <div className="flex-1 flex flex-col gap-4 overflow-hidden min-h-[300px]">
          {/* Tabela: Receita Produtos por Método */}
          <div className="bg-white rounded-xl shadow-md flex flex-col overflow-hidden max-h-[50%] border border-blue-100">
            <div className="p-3 bg-blue-50 border-b border-blue-100 font-bold text-blue-800 text-sm">
              Receita Produtos (Por Método)
            </div>
            <div className="overflow-y-auto flex-1 custom-scrollbar">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Método
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                      Valor
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {paymentSummary.map((p, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-4 py-2 text-sm text-gray-900">
                        {p.metodo}
                      </td>
                      <td className="px-4 py-2 text-sm text-right font-bold text-blue-600">
                        {formatCurrency(p.valor)}
                      </td>
                    </tr>
                  ))}
                  {paymentSummary.length === 0 && (
                    <tr>
                      <td
                        colSpan="2"
                        className="p-4 text-center text-gray-400 text-xs"
                      >
                        Sem dados
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Tabela: Mão de Obra a Pagar */}
          <div className="bg-white rounded-xl shadow-md flex flex-col overflow-hidden flex-1 border border-orange-100">
            <div className="p-3 bg-orange-50 border-b border-orange-100 font-bold text-orange-800 text-sm">
              Repasse Mão de Obra
            </div>
            <div className="overflow-y-auto flex-1 custom-scrollbar">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Nome
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                      A Pagar
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {laborSummary.map((l, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-4 py-2 text-sm text-gray-900">
                        {l.nome}
                      </td>
                      <td className="px-4 py-2 text-sm text-right font-bold text-orange-600">
                        {formatCurrency(l.total)}
                      </td>
                    </tr>
                  ))}
                  {laborSummary.length === 0 && (
                    <tr>
                      <td
                        colSpan="2"
                        className="p-4 text-center text-gray-400 text-xs"
                      >
                        Sem dados
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Relatorios;
