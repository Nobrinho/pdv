import React, { useState, useMemo } from "react";
import dayjs from "dayjs";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { ProductHistory } from "../types";
import { useProductHistory } from "../hooks/useProductHistory";
import HistoryTable from "../components/products/HistoryTable";
import HistoryFilters from "../components/products/HistoryFilters";

const HistoricoPrecos: React.FC = () => {
  const { history, isLoading } = useProductHistory();

  // Filtros
  const [periodType, setPeriodType] = useState("custom");
  const [startDate, setStartDate] = useState(dayjs().subtract(30, "day").format("YYYY-MM-DD"));
  const [endDate, setEndDate] = useState(dayjs().format("YYYY-MM-DD"));
  const [searchTerm, setSearchTerm] = useState("");

  const handlePeriodChange = (type: string) => {
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

  const filteredHistory = useMemo(() => {
    let result = history;
    const start = dayjs(startDate).startOf("day");
    const end = dayjs(endDate).endOf("day");

    result = result.filter((h) => {
      const date = dayjs(h.data_alteracao);
      return (
        date.isSame(start, "day") ||
        date.isSame(end, "day") ||
        (date.isAfter(start) && date.isBefore(end))
      );
    });

    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      result = result.filter(
        (h) =>
          (h.descricao || "").toLowerCase().includes(lower) ||
          (h.codigo || "").toLowerCase().includes(lower)
      );
    }

    return result;
  }, [history, startDate, endDate, searchTerm]);

  const formatCurrency = (val?: number | null) => {
    const valor = val === undefined || val === null ? 0 : val;
    return `R$ ${valor.toFixed(2).replace(".", ",")}`;
  };

  // --- EXPORTS ---
  const exportFullPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Relatório de Auditoria de Estoque/Preço", 14, 20);
    doc.setFontSize(10);
    doc.text(`Período: ${dayjs(startDate).format("DD/MM/YYYY")} a ${dayjs(endDate).format("DD/MM/YYYY")}`, 14, 28);
    doc.text(`Gerado em: ${dayjs().format("DD/MM/YYYY HH:mm")}`, 14, 33);

    const tableRows = filteredHistory.map((item) => {
      const diffPreco = item.preco_novo - (item.preco_antigo || 0);
      const diffEstoque = item.estoque_novo - (item.estoque_antigo || 0);

      let obs = "";
      let textoPreco = "";
      let textoEstoque = "";

      if (item.tipo_alteracao === "cadastro_inicial") {
        obs = "Novo Cadastro";
        textoPreco = `Inicial: ${formatCurrency(item.preco_novo)}`;
        textoEstoque = `Inicial: ${item.estoque_novo}`;
      } else {
        if (diffPreco !== 0) obs += `Preço: ${diffPreco > 0 ? "+" : ""}${formatCurrency(diffPreco)} `;
        if (diffEstoque !== 0) obs += `Estoque: ${diffEstoque > 0 ? "+" : ""}${diffEstoque}`;
        textoPreco = `${formatCurrency(item.preco_antigo || 0)} -> ${formatCurrency(item.preco_novo)}`;
        textoEstoque = `${item.estoque_antigo || 0} -> ${item.estoque_novo}`;
      }

      return [
        dayjs(item.data_alteracao).format("DD/MM/YY HH:mm"),
        item.codigo || "-",
        item.descricao || "Excluído",
        textoPreco,
        textoEstoque,
        obs,
      ];
    });

    autoTable(doc, {
      startY: 40,
      head: [["Data", "Cód", "Produto", "Alteração Preço", "Alteração Estoque", "Detalhes"]],
      body: tableRows,
      theme: "grid",
      styles: { fontSize: 8 },
      headStyles: { fillColor: [52, 73, 94] as any },
    });

    doc.save(`auditoria_${dayjs().format("DD-MM-YYYY")}.pdf`);
  };

  const exportSimplePDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Tabela de Atualização de Preços", 14, 20);
    doc.setFontSize(10);
    doc.text(`Referência: ${dayjs(startDate).format("DD/MM/YYYY")} a ${dayjs(endDate).format("DD/MM/YYYY")}`, 14, 28);

    const uniqueProducts: ProductHistory[] = [];
    const processedIds = new Set<number>();

    filteredHistory.forEach((item) => {
      if (!processedIds.has(item.produto_id)) {
        processedIds.add(item.produto_id);
        uniqueProducts.push(item);
      }
    });

    uniqueProducts.sort((a, b) => (a.descricao || "").localeCompare(b.descricao || ""));

    const tableRows = uniqueProducts.map((item) => [
      item.descricao || "Excluído",
      item.codigo || "-",
      formatCurrency(item.preco_novo),
      `${item.estoque_novo} un`,
      dayjs(item.data_alteracao).format("DD/MM/YYYY"),
    ]);

    autoTable(doc, {
      startY: 40,
      head: [["Produto", "Cód.", "Preço Atual", "Estoque", "Data Alteração"]],
      body: tableRows,
      theme: "striped",
      headStyles: { fillColor: [41, 128, 185] as any },
    });

    doc.save(`tabela_precos_${dayjs().format("DD-MM-YYYY")}.pdf`);
  };

  return (
    <div className="p-4 md:p-6 h-full flex flex-col bg-gray-50">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-800 tracking-tight flex items-center">
            <i className="fas fa-history mr-3 text-orange-500"></i> Histórico de Alterações
          </h1>
          <p className="text-gray-500 text-sm">Rastreamento de mudanças em preços e estoque.</p>
        </div>

        <div className="flex gap-2 w-full sm:w-auto">
          <button
            onClick={exportSimplePDF}
            className="flex-1 bg-white text-blue-600 border border-blue-200 px-4 py-2.5 rounded-xl font-bold hover:bg-blue-50 transition shadow-sm flex items-center justify-center gap-2"
          >
            <i className="fas fa-file-invoice"></i> Tabela
          </button>
          <button
            onClick={exportFullPDF}
            className="flex-1 bg-gray-800 text-white px-4 py-2.5 rounded-xl font-bold hover:bg-gray-900 transition shadow-lg flex items-center justify-center gap-2"
          >
            <i className="fas fa-file-contract"></i> Auditoria
          </button>
        </div>
      </div>

      <HistoryFilters
        periodType={periodType}
        onPeriodChange={handlePeriodChange}
        startDate={startDate}
        setStartDate={(val) => { setStartDate(val); setPeriodType("custom"); }}
        endDate={endDate}
        setEndDate={(val) => { setEndDate(val); setPeriodType("custom"); }}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
      />

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <i className="fas fa-circle-notch fa-spin text-orange-500 text-4xl"></i>
        </div>
      ) : (
        <HistoryTable history={filteredHistory} formatCurrency={formatCurrency} />
      )}
    </div>
  );
};

export default HistoricoPrecos;
