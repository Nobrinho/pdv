// @ts-nocheck
import React, { useState, useEffect } from "react";
import dayjs from "dayjs";
import "dayjs/locale/pt-br"; // Importante para datas em PT-BR
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

// Configura locale
dayjs.locale("pt-br");

const HistoricoPrecos = () => {
  const [history, setHistory] = useState([]);
  const [filteredHistory, setFilteredHistory] = useState([]);

  // Filtros
  const [periodType, setPeriodType] = useState("custom"); // weekly, monthly, yearly, custom
  const [startDate, setStartDate] = useState(
    dayjs().subtract(30, "day").format("YYYY-MM-DD"),
  );
  const [endDate, setEndDate] = useState(dayjs().format("YYYY-MM-DD"));
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterData();
  }, [history, startDate, endDate, searchTerm]);

  const loadData = async () => {
    try {
      const data = await window.api.getProductHistory();
      setHistory(data || []);
    } catch (error) {
      console.error("Erro ao carregar histórico:", error);
    }
  };

  // --- CONTROLE DE PERÍODOS RÁPIDOS ---
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
    // Se for 'custom', não muda as datas automaticamente
  };

  // Lógica robusta de verificação de intervalo de datas (00:00 - 23:59)
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

  const filterData = () => {
    let result = history;

    // Filtro Data (Corrigido)
    result = result.filter((h) => isWithinRange(h.data_alteracao));

    // Filtro Texto
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      result = result.filter(
        (h) =>
          h.descricao.toLowerCase().includes(lower) ||
          h.codigo.toLowerCase().includes(lower),
      );
    }

    setFilteredHistory(result);
  };

  // Helper para formatar moeda com fallback para 0 se undefined
  const formatCurrency = (val) => {
    const valor = val === undefined || val === null ? 0 : val;
    return `R$ ${valor.toFixed(2).replace(".", ",")}`;
  };

  // --- RELATÓRIO COMPLETO (Técnico/Auditoria) ---
  const exportFullPDF = () => {
    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.text("Relatório de Auditoria de Estoque/Preço", 14, 20);
    doc.setFontSize(10);
    doc.text(
      `Período: ${dayjs(startDate).format("DD/MM/YYYY")} a ${dayjs(endDate).format("DD/MM/YYYY")}`,
      14,
      28,
    );
    doc.text(`Gerado em: ${dayjs().format("DD/MM/YYYY HH:mm")}`, 14, 33);

    const tableRows = filteredHistory.map((item) => {
      const diffPreco = item.preco_novo - (item.preco_antigo || 0);
      const diffEstoque = item.estoque_novo - (item.estoque_antigo || 0);

      let obs = "";
      let textoPreco = "";
      let textoEstoque = "";

      // Lógica de Exibição Baseada no Tipo
      if (item.tipo_alteracao === "cadastro_inicial") {
        obs = "Novo Cadastro";
        textoPreco = `Inicial: ${formatCurrency(item.preco_novo)}`;
        textoEstoque = `Inicial: ${item.estoque_novo}`;
      } else {
        // Alteração normal
        if (diffPreco !== 0)
          obs += `Preço: ${diffPreco > 0 ? "+" : ""}${formatCurrency(diffPreco)} `;
        if (diffEstoque !== 0)
          obs += `Estoque: ${diffEstoque > 0 ? "+" : ""}${diffEstoque}`;

        textoPreco = `${formatCurrency(item.preco_antigo || 0)} -> ${formatCurrency(item.preco_novo)}`;
        textoEstoque = `${item.estoque_antigo || 0} -> ${item.estoque_novo}`;
      }

      return [
        dayjs(item.data_alteracao).format("DD/MM/YY HH:mm"),
        item.codigo,
        item.descricao,
        textoPreco,
        textoEstoque,
        obs,
      ];
    });

    autoTable(doc, {
      startY: 40,
      head: [
        [
          "Data",
          "Cód",
          "Produto",
          "Alteração Preço",
          "Alteração Estoque",
          "Detalhes",
        ],
      ],
      body: tableRows,
      theme: "grid",
      styles: { fontSize: 8 },
      headStyles: { fillColor: [52, 73, 94] },
      columnStyles: {
        0: { cellWidth: 25 },
        1: { cellWidth: 20 },
        3: { cellWidth: 35 },
        4: { cellWidth: 25 },
      },
    });

    doc.save(`auditoria_completa_${dayjs().format("DD-MM-YYYY")}.pdf`);
  };

  // --- RELATÓRIO SIMPLIFICADO (Tabela de Preços/Vendas) ---
  const exportSimplePDF = () => {
    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.setTextColor(40);
    doc.text("Tabela de Atualização de Preços", 14, 20);

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(
      `Referência: Atualizações de ${dayjs(startDate).format("DD/MM/YYYY")} a ${dayjs(endDate).format("DD/MM/YYYY")}`,
      14,
      28,
    );
    doc.text(`Data de Emissão: ${dayjs().format("DD/MM/YYYY")}`, 14, 33);

    // --- LÓGICA DE UNICIDADE ---
    const uniqueProducts = [];
    const processedIds = new Set();

    filteredHistory.forEach((item) => {
      if (!processedIds.has(item.produto_id)) {
        processedIds.add(item.produto_id);
        uniqueProducts.push(item);
      }
    });

    uniqueProducts.sort((a, b) => a.descricao.localeCompare(b.descricao));

    const tableRows = uniqueProducts.map((item) => [
      item.descricao,
      item.codigo,
      formatCurrency(item.preco_novo),
      `${item.estoque_novo} un`,
      dayjs(item.data_alteracao).format("DD/MM/YYYY"),
    ]);

    autoTable(doc, {
      startY: 40,
      head: [["Produto", "Cód.", "Preço Atual", "Estoque", "Data Alteração"]],
      body: tableRows,
      theme: "striped",
      headStyles: { fillColor: [41, 128, 185] },
      styles: { fontSize: 10, cellPadding: 3 },
      columnStyles: {
        0: { cellWidth: "auto" },
        1: { cellWidth: 25 },
        2: { cellWidth: 30, halign: "right", fontStyle: "bold" },
        3: { cellWidth: 25, halign: "center" },
        4: { cellWidth: 30, halign: "center" },
      },
    });

    doc.save(`tabela_precos_${dayjs().format("DD-MM-YYYY")}.pdf`);
  };

  return (
    <div className="p-6 h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">
          Histórico de Alterações
        </h1>

        <div className="flex gap-2">
          <button
            onClick={exportSimplePDF}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 shadow-md flex items-center gap-2 transition"
            title="Gera uma lista limpa com preço e estoque atual (apenas 1 linha por produto)"
          >
            <i className="fas fa-file-invoice"></i> Tabela Simplificada
          </button>
          <button
            onClick={exportFullPDF}
            className="bg-gray-700 text-white px-4 py-2 rounded-lg hover:bg-gray-800 shadow-md flex items-center gap-2 transition"
            title="Gera relatório técnico completo com todas as mudanças (Auditoria)"
          >
            <i className="fas fa-file-contract"></i> Auditoria Completa
          </button>
        </div>
      </div>

      {/* Filtros */}
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

        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
              Início
            </label>
            <input
              type="date"
              className="border rounded p-2 text-sm"
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
              className="border rounded p-2 text-sm"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPeriodType("custom");
              }}
            />
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
              Buscar Produto
            </label>
            <input
              type="text"
              className="w-full border rounded p-2 text-sm"
              placeholder="Nome ou Código..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Tabela de Visualização */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden flex-1 flex flex-col border border-gray-200">
        <div className="overflow-y-auto flex-1">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Data
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Produto
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                  Preço (Ant / Novo)
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                  Estoque (Ant / Novo)
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                  Tipo
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredHistory.map((item) => {
                const precoSubiu = item.preco_novo > (item.preco_antigo || 0);
                const estoqueSubiu =
                  item.estoque_novo > (item.estoque_antigo || 0);
                const isNovo = item.tipo_alteracao === "cadastro_inicial";

                return (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {dayjs(item.data_alteracao).format("DD/MM/YY HH:mm")}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <div className="font-medium">{item.descricao}</div>
                      <div className="text-xs text-gray-400">{item.codigo}</div>
                    </td>

                    {/* COLUNA PREÇO */}
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                      {isNovo ? (
                        <span className="font-bold text-gray-800">
                          {formatCurrency(item.preco_novo)}
                        </span>
                      ) : (
                        <>
                          <span className="text-gray-400 mr-2">
                            {formatCurrency(item.preco_antigo)}
                          </span>
                          <i
                            className={`fas fa-arrow-right text-xs mx-1 ${precoSubiu ? "text-red-400" : item.preco_novo < item.preco_antigo ? "text-green-500" : "text-gray-300"}`}
                          ></i>
                          <span
                            className={`font-bold ${precoSubiu ? "text-red-600" : "text-gray-800"}`}
                          >
                            {formatCurrency(item.preco_novo)}
                          </span>
                        </>
                      )}
                    </td>

                    {/* COLUNA ESTOQUE */}
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                      {isNovo ? (
                        <span className="font-bold text-gray-800">
                          {item.estoque_novo}
                        </span>
                      ) : (
                        <>
                          <span className="text-gray-400 mr-2">
                            {item.estoque_antigo}
                          </span>
                          <i
                            className={`fas fa-arrow-right text-xs mx-1 ${estoqueSubiu ? "text-green-500" : "text-red-400"}`}
                          ></i>
                          <span className="font-bold text-gray-800">
                            {item.estoque_novo}
                          </span>
                        </>
                      )}
                    </td>

                    {/* COLUNA TIPO */}
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm">
                      <span
                        className={`px-2 py-1 rounded-full text-xs ${
                          item.tipo_alteracao === "cadastro_inicial"
                            ? "bg-blue-100 text-blue-800"
                            : item.tipo_alteracao === "reposicao_estoque"
                              ? "bg-green-100 text-green-800"
                              : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {item.tipo_alteracao === "alteracao_preco"
                          ? "Preço"
                          : item.tipo_alteracao === "reposicao_estoque"
                            ? "Estoque"
                            : "Novo"}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {filteredHistory.length === 0 && (
                <tr>
                  <td colSpan="5" className="text-center py-10 text-gray-400">
                    Nenhum histórico encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default HistoricoPrecos;
