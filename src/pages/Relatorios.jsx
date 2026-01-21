// @ts-nocheck
import React, { useState, useEffect, useMemo } from "react";
import dayjs from "dayjs";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { useAlert } from "../context/AlertSystem";

const Relatorios = () => {
  const { showAlert } = useAlert();

  const [allSales, setAllSales] = useState([]);
  const [allServices, setAllServices] = useState([]);
  const [allPeople, setAllPeople] = useState([]);
  const [defaultCommission, setDefaultCommission] = useState(0.3);

  // --- FILTROS ---
  const [startDate, setStartDate] = useState(
    dayjs().startOf("month").format("YYYY-MM-DD"),
  );
  const [endDate, setEndDate] = useState(
    dayjs().endOf("month").format("YYYY-MM-DD"),
  );
  const [selectedSeller, setSelectedSeller] = useState("all");
  const [selectedPayment, setSelectedPayment] = useState("all");

  // Extrair métodos de pagamento únicos para o filtro
  const paymentMethods = useMemo(() => {
    const methods = new Set(allSales.map((s) => s.forma_pagamento));
    return Array.from(methods).sort();
  }, [allSales]);

  // --- MÉTRICAS E DADOS PROCESSADOS ---
  const [metrics, setMetrics] = useState({
    faturamento: 0,
    custoPecas: 0,
    despesaMaoDeObra: 0,
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

      // Ordenação inicial DESC (Mais recente primeiro)
      setAllSales(sales.sort((a, b) => b.data_venda - a.data_venda));
      setAllServices(services.sort((a, b) => b.data_servico - a.data_servico));
      setAllPeople(people);

      if (configComissao) setDefaultCommission(parseFloat(configComissao));
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      showAlert("Erro ao carregar dados do banco.", "Erro", "error");
    }
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
      const sDate = dayjs(s.data_venda);
      const inDate =
        sDate.isAfter(dayjs(startDate).subtract(1, "day")) &&
        sDate.isBefore(dayjs(endDate).add(1, "day"));
      const isSeller =
        selectedSeller === "all" || s.vendedor_id === parseInt(selectedSeller);
      const isPayment =
        selectedPayment === "all" || s.forma_pagamento === selectedPayment;

      return inDate && isSeller && isPayment;
    });

    // 2. Filtragem de Serviços (Despesa)
    let servicosFiltrados = allServices.filter((s) => {
      const sDate = dayjs(s.data_servico);
      return (
        sDate.isAfter(dayjs(startDate).subtract(1, "day")) &&
        sDate.isBefore(dayjs(endDate).add(1, "day"))
      );
    });

    // Ordenação forçada (Mais recente primeiro)
    vendasFiltradas.sort((a, b) => b.data_venda - a.data_venda);
    servicosFiltrados.sort((a, b) => b.data_servico - a.data_servico);

    // --- ACUMULADORES ---
    let totalFaturamentoPecas = 0;
    let totalCustoPecas = 0;
    let totalDespesaMO = 0;
    let totalAcrescimos = 0;
    let totalDescontos = 0;
    let totalComissoes = 0;

    const mapPagamentos = {};

    // Helper para somar pagamentos (Apenas Receita de Produto)
    const addPaymentToMap = (metodo, valor) => {
      if (!metodo) return;
      if (!mapPagamentos[metodo]) mapPagamentos[metodo] = 0;
      mapPagamentos[metodo] += valor;
    };

    // --- PROCESSAR VENDAS ---
    const vendasProcessadas = vendasFiltradas.map((venda) => {
      const vendedor = allPeople.find((p) => p.id === venda.vendedor_id);
      const taxaComissao = vendedor?.comissao_fixa
        ? vendedor.comissao_fixa / 100
        : defaultCommission;

      const subtotalProdutos = venda.subtotal;

      // Lógica de Desconto
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
      const comissao =
        valorFinalProdutos > 0 ? valorFinalProdutos * taxaComissao : 0;
      const moVenda = venda.mao_de_obra || 0;

      if (!venda.cancelada) {
        // Receita Real da Loja (Peças + Acréscimo - Desconto)
        const receitaLoja = valorFinalProdutos + acrescimo;

        totalFaturamentoPecas += receitaLoja;
        totalCustoPecas += custoReal;
        totalDespesaMO += moVenda; // MO entra como despesa a pagar
        totalAcrescimos += acrescimo;
        totalDescontos += desconto;
        totalComissoes += comissao;

        // Soma ao mapa de pagamentos (Receita Loja apenas)
        addPaymentToMap(venda.forma_pagamento, receitaLoja);
      }

      return { ...venda, comissao_calculada: comissao };
    });

    // --- PROCESSAR SERVIÇOS AVULSOS (Apenas Despesa) ---
    servicosFiltrados.forEach((serv) => {
      totalDespesaMO += serv.valor;
      // Serviços avulsos NÃO entram no Faturamento por Método (são despesa)
    });

    // Converter mapa de pagamentos para array ordenado por valor
    const arrayPagamentos = Object.entries(mapPagamentos)
      .map(([metodo, valor]) => ({ metodo, valor }))
      .sort((a, b) => b.valor - a.valor);

    // --- RESUMO DE MÃO DE OBRA ---
    const mapMO = {};

    // MO das Vendas
    vendasFiltradas.forEach((v) => {
      if (!v.cancelada && v.mao_de_obra > 0 && v.trocador_id) {
        if (!mapMO[v.trocador_id])
          mapMO[v.trocador_id] = { nome: v.trocador_nome, total: 0, qtd: 0 };
        mapMO[v.trocador_id].total += v.mao_de_obra;
        mapMO[v.trocador_id].qtd += 1;
      }
    });

    // MO dos Serviços Avulsos
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

    // --- CÁLCULO DE LUCRO LÍQUIDO ---
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

  // --- EXPORTAÇÃO PDF ---
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

      // 1. Resumo Financeiro
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

      // 2. Faturamento por Método (NOVO no PDF)
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

      // 3. Mão de Obra
      if (laborSummary.length > 0) {
        doc.text("Repasse de Mão de Obra (Trocadores)", 14, finalY + 15);
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

      // 4. Vendas Detalhadas
      doc.text("Extrato de Vendas", 14, finalY + 15);
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
      {/* Tooltip */}
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

      {/* --- BARRA DE FILTROS --- */}
      <div className="bg-white p-4 rounded-xl shadow-sm mb-6 border border-gray-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
            Início
          </label>
          <input
            type="date"
            className="w-full border rounded p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
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
            onChange={(e) => setEndDate(e.target.value)}
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

      {/* --- KPIS FINANCEIROS --- */}
      <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 ml-1">
        Indicadores Financeiros
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4 mb-6">
        <StatCard
          title="Faturamento"
          value={metrics.faturamento}
          color="blue"
          icon="fa-chart-line"
          tooltip="Valor total das peças vendidas (excluindo Mão de Obra)."
        />
        <StatCard
          title="Custos"
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

      {/* --- CARDS DE PAGAMENTO (NOVO) --- */}
      <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 ml-1">
        Faturamento por Método
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {paymentSummary.map((p, idx) => (
          <div
            key={idx}
            className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center"
          >
            <div>
              <p className="text-xs text-gray-500 font-bold uppercase">
                {p.metodo}
              </p>
              <p className="text-lg font-bold text-gray-800">
                {formatCurrency(p.valor)}
              </p>
            </div>
            <div
              className={`p-2 rounded-full ${p.metodo === "Múltiplos" ? "bg-indigo-50 text-indigo-500" : "bg-blue-50 text-blue-500"}`}
            >
              <i
                className={`fas ${p.metodo === "Múltiplos" ? "fa-layer-group" : "fa-money-bill-wave"}`}
              ></i>
            </div>
          </div>
        ))}
        {paymentSummary.length === 0 && (
          <p className="text-sm text-gray-400 col-span-4 bg-white p-4 rounded-xl border border-dashed">
            Sem dados de pagamento no período.
          </p>
        )}
      </div>

      {/* Lucro Líquido */}
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-6 rounded-xl shadow-sm border border-green-200 mb-8 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="bg-green-100 p-3 rounded-full text-green-600">
            <i className="fas fa-sack-dollar text-3xl"></i>
          </div>
          <div>
            <p className="text-sm text-green-800 font-bold uppercase">
              Resultado Líquido (Lucro)
            </p>
            <p className="text-xs text-green-600 mt-1">
              Cálculo: Faturamento + Acréscimos - (Custos + Comissões + M.O.
              Paga)
            </p>
          </div>
        </div>
        <p className="text-4xl font-black text-green-700 tracking-tight">
          {formatCurrency(metrics.lucro)}
        </p>
      </div>

      {/* --- TABELAS --- */}
      {/* Seção Condicional de Múltiplos */}
      {selectedPayment === "Múltiplos" && (
        <div className="mb-6 bg-indigo-50 rounded-xl border border-indigo-200 p-4">
          <h3 className="text-indigo-800 font-bold mb-2 flex items-center">
            <i className="fas fa-info-circle mr-2"></i> Detalhamento de Vendas
            com Múltiplos Pagamentos
          </h3>
          <p className="text-sm text-indigo-600 mb-0">
            Abaixo estão listadas as vendas onde foram utilizadas múltiplas
            formas de pagamento. O valor total exibido aqui corresponde à soma
            dessas vendas. (A quebra detalhada por sub-método será implementada
            na v2.0 com base na tabela `venda_pagamentos`).
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
                    Total
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
                        {v.forma_pagamento || "-"}
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

        {/* Direita: Resumos (MO a Pagar) */}
        <div className="w-full lg:w-1/3 bg-white rounded-xl shadow-md flex flex-col overflow-hidden border border-orange-100">
          <div className="p-3 bg-orange-50 border-b border-orange-100 font-bold text-orange-800 text-sm">
            Repasse Mão de Obra
          </div>
          <div className="overflow-y-auto flex-1 custom-scrollbar">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 sticky top-0 z-10">
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
  );
};

export default Relatorios;
