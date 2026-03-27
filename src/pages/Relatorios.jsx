// @ts-nocheck
import React from "react";
import dayjs from "dayjs";
import "dayjs/locale/pt-br";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { useAlert } from "../context/AlertSystem";
import { formatCurrency } from "../utils/format";
import useReportData, { standardizeMethod } from "../hooks/useReportData";
import StatCard from "../components/ui/StatCard";

dayjs.locale("pt-br");

const Relatorios = () => {
  const { showAlert } = useAlert();

  const {
    allPeople,
    metrics,
    filteredSales,
    laborSummary,
    paymentSummary,
    paymentMethods,
    loading,
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
  } = useReportData();

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
        doc.text("Total Recebido (Por Método)", 14, finalY + 15);
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
      const tableData = filteredSales.map((v) => {
        let pagamentoInfo = v.forma_pagamento || "-";
        if (v.lista_pagamentos && v.lista_pagamentos.length > 0) {
          pagamentoInfo = v.lista_pagamentos
            .map((p) => `${p.metodo}: ${formatCurrency(p.valor)}`)
            .join("\n");
        }

        return [
          dayjs(v.data_venda).format("DD/MM HH:mm"),
          v.vendedor_nome,
          formatCurrency(v.subtotal),
          v.acrescimo > 0 ? formatCurrency(v.acrescimo) : "-",
          v.desconto_valor > 0 ? formatCurrency(v.desconto_valor) : "-",
          formatCurrency(v.total_final),
          pagamentoInfo,
          v.cancelada ? "CANCELADA" : formatCurrency(v.comissao_calculada),
        ];
      });

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
            "Pagamento",
            "Comissão",
          ],
        ],
        body: tableData,
        didParseCell: function (data) {
          if (data.row.raw[7] === "CANCELADA") {
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

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
                      {v.lista_pagamentos && v.lista_pagamentos.length > 0 ? (
                        <div className="flex flex-col gap-1 items-center">
                          {v.lista_pagamentos.map((p, i) => (
                            <span key={i} className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-100 whitespace-nowrap text-[10px]">
                              {p.metodo}: {formatCurrency(p.valor)}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className={`px-2 py-0.5 rounded ${v.forma_pagamento === "Múltiplos" ? "bg-indigo-100 text-indigo-700" : "bg-gray-100 text-gray-600"}`}>
                          {standardizeMethod(v.forma_pagamento) || "-"}
                        </span>
                      )}
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
              Total Recebido (Por Método)
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
