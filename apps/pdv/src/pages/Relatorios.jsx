// @ts-nocheck
import React, { useEffect, useMemo, useState } from "react";
import { Icon } from "../components/ui/Icon";
import dayjs from "dayjs";
import "dayjs/locale/pt-br";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { useAlert } from "../context/AlertSystem";
import { formatCurrency } from "../utils/format";
import useReportData, { standardizeMethod } from "../hooks/useReportData";
import StatCard from "../components/ui/StatCard";
import PageSkeleton from "../components/ui/PageSkeleton";
import Button from "../components/ui/Button";
import { Input, Select } from "../components/ui/Input";

dayjs.locale("pt-br");

const MONO = { fontFamily: "var(--font-mono)", fontVariantNumeric: "tabular-nums" };
const TH =
  "px-[18px] py-[11px] text-[10px] font-semibold uppercase tracking-[var(--tracking-caps)] text-[var(--muted-foreground)]";
const CARD =
  "bg-[var(--card)] border border-[var(--border)] rounded-[var(--radius-xl)] shadow-[var(--shadow-xs)] overflow-hidden";

const Relatorios = () => {
  const { showAlert } = useAlert();
  const [page, setPage] = useState(1);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [showFilters, setShowFilters] = useState(false); // avançados colapsados no mobile
  const PAGE_SIZE = 100;

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
  const hasInvalidDateRange =
    startDate &&
    endDate &&
    dayjs(startDate).isAfter(dayjs(endDate));

  const totalPages = Math.ceil(filteredSales.length / PAGE_SIZE);
  const paginatedSales = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredSales.slice(start, start + PAGE_SIZE);
  }, [filteredSales, page]);

  useEffect(() => {
    setPage(1);
  }, [startDate, endDate, selectedSeller, selectedPayment, periodType]);

  const exportPDF = () => {
    if (isExportingPdf) return;
    if (hasInvalidDateRange) {
      return showAlert("Data inicial nao pode ser maior que a data final.", "Filtro invalido", "warning");
    }
    try {
      setIsExportingPdf(true);
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
    } finally {
      setIsExportingPdf(false);
    }
  };

  if (loading) {
    return <PageSkeleton cards={6} />;
  }

  const periodChip = (key, label) => (
    <button
      onClick={() => handlePeriodChange(key)}
      className={`px-4 py-1.5 text-sm rounded-full transition whitespace-nowrap ${
        periodType === key
          ? "bg-[var(--primary)] text-[var(--primary-foreground)] font-semibold"
          : "bg-[var(--muted)] text-[var(--muted-foreground)] hover:bg-[var(--hover-surface)]"
      }`}
    >
      {label}
    </button>
  );

  const filterLabel =
    "block text-[10px] font-semibold uppercase tracking-[var(--tracking-caps)] text-[var(--muted-foreground)] mb-1.5";

  return (
    <div className="p-4 md:p-6 h-full flex flex-col overflow-y-auto bg-surface-50 custom-scrollbar">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h1
          className="text-lg md:text-xl font-semibold text-[var(--foreground)] tracking-tight"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Relatórios
        </h1>
        <Button
          variant="outline"
          icon="fa-file-pdf"
          loading={isExportingPdf}
          disabled={hasInvalidDateRange}
          onClick={exportPDF}
          className="w-full sm:w-auto"
        >
          {isExportingPdf ? "Exportando..." : "Exportar PDF"}
        </Button>
      </div>

      {/* --- BARRA DE FILTROS --- */}
      <div className={`${CARD} p-4 mb-6 flex flex-col gap-4`}>
        {hasInvalidDateRange && (
          <div className="bg-[var(--warning-soft)] text-[var(--warning-soft-foreground)] border border-[var(--warning-soft-border)] rounded-[var(--radius-md)] p-2.5 text-xs font-semibold">
            Data inicial não pode ser maior que a data final.
          </div>
        )}
        {/* Filtros Rápidos */}
        <div className="flex items-center gap-2 border-b border-[var(--border)] pb-4">
          <div className="flex gap-2 overflow-x-auto flex-1">
            {periodChip("weekly", "Esta semana")}
            {periodChip("monthly", "Este mês")}
            {periodChip("yearly", "Este ano")}
          </div>
          <button
            onClick={() => setShowFilters((v) => !v)}
            className={`lg:hidden shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-md)] text-[11px] font-semibold uppercase tracking-wider transition ${
              selectedSeller !== "all" || selectedPayment !== "all"
                ? "bg-[var(--primary)] text-[var(--primary-foreground)]"
                : "bg-[var(--muted)] text-[var(--muted-foreground)]"
            }`}
          >
            <Icon name="sliders-horizontal" size={13} className={`transition-transform ${showFilters ? "rotate-180" : ""}`} />
            Filtros
          </button>
        </div>

        {/* Inputs */}
        <div className={`${showFilters ? "grid" : "hidden"} lg:grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end`}>
          <div>
            <label className={filterLabel}>Início</label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPeriodType("custom");
              }}
            />
          </div>
          <div>
            <label className={filterLabel}>Fim</label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPeriodType("custom");
              }}
            />
          </div>
          <div>
            <label className={filterLabel}>Vendedor</label>
            <Select
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
            </Select>
          </div>
          <div>
            <label className={filterLabel}>Pagamento</label>
            <Select
              value={selectedPayment}
              onChange={(e) => setSelectedPayment(e.target.value)}
            >
              <option value="all">Todos</option>
              {paymentMethods.map((method) => (
                <option key={method} value={method}>
                  {method}
                </option>
              ))}
            </Select>
          </div>
        </div>
      </div>

      {/* --- KPIS (Cards) --- */}
      <span className="text-[10px] font-semibold uppercase tracking-[var(--tracking-caps)] text-[var(--muted-foreground)] mb-3 ml-0.5">
        Indicadores financeiros
      </span>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4 mb-6 mt-3">
        <StatCard title="Fat. produtos" value={metrics.faturamento} color="blue" icon="fa-chart-line" tooltip="Valor total das peças vendidas (excluindo mão de obra)." />
        <StatCard title="Custos peças" value={metrics.custo} color="red" icon="fa-tags" tooltip="Custo de aquisição das peças vendidas." />
        <StatCard title="M.O. (despesa)" value={metrics.maoDeObra} color="orange" icon="fa-wrench" tooltip="Valor total pago aos mecânicos (serviços + vendas)." />
        <StatCard title="Acréscimos" value={metrics.acrescimos} color="green" icon="fa-plus-circle" tooltip="Taxas extras cobradas nas vendas." />
        <StatCard title="Descontos" value={metrics.descontos} color="gray" icon="fa-percent" tooltip="Total de descontos concedidos." />
        <StatCard title="Comissões" value={metrics.comissoes} color="purple" icon="fa-user-tag" tooltip="Valor devido aos vendedores sobre o faturamento de peças." />
      </div>

      {/* Lucro Líquido */}
      <div className="bg-[var(--success-soft)] p-4 rounded-[var(--radius-xl)] border border-[var(--success-soft-border)] mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[var(--tracking-caps)] text-[var(--success-soft-foreground)]">
            Lucro líquido real
          </p>
          <p className="text-xs text-[var(--success-soft-foreground)] opacity-80 mt-0.5">
            Fat. peças + acréscimos − (custo peças + comissões)
          </p>
        </div>
        <p className="text-3xl font-semibold text-[var(--money-positive)]" style={MONO}>
          {formatCurrency(metrics.lucro)}
        </p>
      </div>

      {/* --- TABELAS --- */}
      {selectedPayment === "Múltiplos" && (
        <div className="mb-6 bg-[var(--info-soft)] text-[var(--info-soft-foreground)] rounded-[var(--radius-xl)] border border-[var(--info-soft-border)] p-4">
          <h3 className="font-semibold mb-1.5 flex items-center gap-1.5">
            <Icon name="info" size={15} /> Vendas com múltiplos pagamentos
          </h3>
          <p className="text-sm opacity-80">
            Abaixo estão listadas as vendas onde foram utilizadas múltiplas formas de pagamento.
          </p>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-[500px]">
        {/* Esquerda: Vendas Detalhadas */}
        <div className={`${CARD} flex-[2] flex flex-col min-h-[300px]`}>
          <div className="px-[18px] py-3 border-b border-[var(--border)] flex justify-between items-center">
            <span className="text-[10px] font-semibold uppercase tracking-[var(--tracking-caps)] text-[var(--muted-foreground)]">
              Extrato de vendas
            </span>
            <span className="text-[11px] font-medium text-[var(--muted-foreground)] bg-[var(--muted)] px-2 py-0.5 rounded-[var(--radius-sm)] border border-[var(--border)]" style={MONO}>
              {filteredSales.length} registros
            </span>
          </div>
          <div className="overflow-y-auto flex-1 custom-scrollbar">
            <table className="min-w-full">
              <thead className="bg-[var(--content2)] sticky top-0 z-10">
                <tr>
                  <th className={`${TH} text-left`}>Data</th>
                  <th className={`${TH} text-left`}>Vendedor</th>
                  <th className={`${TH} text-right`}>Total venda</th>
                  <th className={`${TH} text-center`}>Pagto</th>
                  <th className={`${TH} text-right`}>Comissão</th>
                </tr>
              </thead>
              <tbody>
                {paginatedSales.map((v) => (
                  <tr
                    key={v.id}
                    className={`border-t border-[var(--border)] transition-colors ${v.cancelada ? "bg-[var(--danger-soft)]" : "hover:bg-[var(--hover-surface)]"}`}
                  >
                    <td className="px-[18px] py-3 text-[13px] text-[var(--foreground)]" style={MONO}>
                      {dayjs(v.data_venda).format("DD/MM HH:mm")}
                    </td>
                    <td className="px-[18px] py-3 text-[13px] text-[var(--foreground)]">{v.vendedor_nome}</td>
                    <td className="px-[18px] py-3 text-[13px] text-right font-semibold text-[var(--foreground)]" style={MONO}>
                      {formatCurrency(v.total_final)}
                    </td>
                    <td className="px-[18px] py-3 text-center text-xs">
                      {v.lista_pagamentos && v.lista_pagamentos.length > 0 ? (
                        <div className="flex flex-col gap-1 items-center">
                          {v.lista_pagamentos.map((p, i) => (
                            <span key={i} className="px-2 py-0.5 rounded-[var(--radius-sm)] bg-[var(--primary-soft)] text-[var(--primary-soft-foreground)] border border-[var(--primary-soft-border)] whitespace-nowrap text-[10px]">
                              {p.metodo}: {formatCurrency(p.valor)}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="px-2 py-0.5 rounded-[var(--radius-sm)] bg-[var(--muted)] text-[var(--muted-foreground)]">
                          {standardizeMethod(v.forma_pagamento) || "-"}
                        </span>
                      )}
                    </td>
                    <td className="px-[18px] py-3 text-[13px] text-right text-[var(--foreground)]" style={MONO}>
                      {v.cancelada ? "-" : formatCurrency(v.comissao_calculada)}
                    </td>
                  </tr>
                ))}
                {paginatedSales.length === 0 && (
                  <tr>
                    <td colSpan="5" className="p-8 text-center text-[var(--muted-foreground)]">
                      Nenhuma venda neste período.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="px-[18px] py-3 border-t border-[var(--border)] flex justify-between items-center shrink-0">
              <span className="text-[10px] font-semibold text-[var(--muted-foreground)] uppercase tracking-[var(--tracking-caps)]">
                Pág {page} de {totalPages} · {filteredSales.length} total
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
                  Anterior
                </Button>
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>
                  Próximo
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Direita: Resumos (quebras lado a lado) */}
        <div className="flex-1 flex flex-col gap-4 overflow-hidden min-h-[300px]">
          {/* Total recebido por método */}
          <div className={`${CARD} flex flex-col max-h-[50%]`}>
            <div className="px-[18px] py-3 border-b border-[var(--border)]">
              <span className="text-[10px] font-semibold uppercase tracking-[var(--tracking-caps)] text-[var(--muted-foreground)]">
                Total recebido por método
              </span>
            </div>
            <div className="overflow-y-auto flex-1 custom-scrollbar">
              <table className="min-w-full">
                <thead className="bg-[var(--content2)] sticky top-0">
                  <tr>
                    <th className={`${TH} text-left`}>Método</th>
                    <th className={`${TH} text-right`}>Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {paymentSummary.map((p, i) => (
                    <tr key={i} className="border-t border-[var(--border)] hover:bg-[var(--hover-surface)] transition-colors">
                      <td className="px-[18px] py-3 text-[13px] text-[var(--foreground)]">{p.metodo}</td>
                      <td className="px-[18px] py-3 text-[13px] text-right font-semibold text-[var(--foreground)]" style={MONO}>
                        {formatCurrency(p.valor)}
                      </td>
                    </tr>
                  ))}
                  {paymentSummary.length === 0 && (
                    <tr>
                      <td colSpan="2" className="p-4 text-center text-[var(--muted-foreground)] text-xs">
                        Sem dados
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Repasse mão de obra */}
          <div className={`${CARD} flex flex-col flex-1`}>
            <div className="px-[18px] py-3 border-b border-[var(--border)]">
              <span className="text-[10px] font-semibold uppercase tracking-[var(--tracking-caps)] text-[var(--muted-foreground)]">
                Repasse mão de obra
              </span>
            </div>
            <div className="overflow-y-auto flex-1 custom-scrollbar">
              <table className="min-w-full">
                <thead className="bg-[var(--content2)] sticky top-0">
                  <tr>
                    <th className={`${TH} text-left`}>Nome</th>
                    <th className={`${TH} text-right`}>A pagar</th>
                  </tr>
                </thead>
                <tbody>
                  {laborSummary.map((l, i) => (
                    <tr key={i} className="border-t border-[var(--border)] hover:bg-[var(--hover-surface)] transition-colors">
                      <td className="px-[18px] py-3 text-[13px] text-[var(--foreground)]">{l.nome}</td>
                      <td className="px-[18px] py-3 text-[13px] text-right font-semibold text-[var(--warning-icon)]" style={MONO}>
                        {formatCurrency(l.total)}
                      </td>
                    </tr>
                  ))}
                  {laborSummary.length === 0 && (
                    <tr>
                      <td colSpan="2" className="p-4 text-center text-[var(--muted-foreground)] text-xs">
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
