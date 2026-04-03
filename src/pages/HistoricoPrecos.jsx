// @ts-nocheck
import React, { useState, useEffect, useCallback, useMemo } from "react";
import dayjs from "dayjs";
import "dayjs/locale/pt-br";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { formatCurrency } from "../utils/format";
import { api } from "../services/api";
import DataTable from "../components/ui/DataTable";
import StatusBadge from "../components/ui/StatusBadge";
import FormField from "../components/ui/FormField";

// Configura locale
dayjs.locale("pt-br");

const HistoricoPrecos = () => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  // Paginação server-side
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalRecords, setTotalRecords] = useState(0);
  const LIMIT = 100;

  // Filtros
  const [periodType, setPeriodType] = useState("custom");
  const [startDate, setStartDate] = useState(dayjs().subtract(30, "day").format("YYYY-MM-DD"));
  const [endDate, setEndDate] = useState(dayjs().format("YYYY-MM-DD"));
  const [searchTerm, setSearchTerm] = useState("");

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const result = await api.products.history({ page, limit: LIMIT });
      setHistory(result.data || []);
      setTotalPages(result.totalPages || 0);
      setTotalRecords(result.total || 0);
    } catch (error) {
      console.error("Erro ao carregar histórico:", error);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    loadData();
  }, [loadData]);

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

  const filteredHistory = useMemo(() => {
    let result = history;
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      result = result.filter(
        (h) => h.descricao.toLowerCase().includes(lower) || h.codigo.toLowerCase().includes(lower)
      );
    }
    return result;
  }, [history, searchTerm]);

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

      return [dayjs(item.data_alteracao).format("DD/MM/YY HH:mm"), item.codigo, item.descricao, textoPreco, textoEstoque, obs];
    });

    autoTable(doc, {
      startY: 40,
      head: [["Data", "Cód", "Produto", "Alteração Preço", "Alteração Estoque", "Detalhes"]],
      body: tableRows,
      theme: "grid",
      styles: { fontSize: 8 },
      headStyles: { fillColor: [44, 62, 80] },
    });

    doc.save(`auditoria_${dayjs().format("DD-MM-YYYY")}.pdf`);
  };

  const columns = [
    { 
      key: "data_alteracao", 
      label: "Data/Hora", 
      format: (v) => <span className="text-gray-500 font-medium">{dayjs(v).format("DD/MM/YY HH:mm")}</span> 
    },
    { 
      key: "produto", 
      label: "Produto", 
      format: (_, row) => (
        <div>
          <div className="font-black text-gray-800 uppercase text-[11px] leading-tight">{row.descricao}</div>
          <div className="text-[10px] text-gray-400 font-mono tracking-tighter">{row.codigo}</div>
        </div>
      )
    },
    {
      key: "preco",
      label: "Preço (Ant > Novo)",
      align: "center",
      format: (_, row) => {
        const isNovo = row.tipo_alteracao === "cadastro_inicial";
        if (isNovo) return <span className="font-black text-gray-800">{formatCurrency(row.preco_novo)}</span>;
        const subiu = row.preco_novo > (row.preco_antigo || 0);
        return (
          <div className="flex items-center justify-center gap-2">
            <span className="text-gray-300 line-through text-[10px]">{formatCurrency(row.preco_antigo)}</span>
            <i className={`fas fa-caret-right text-xs ${subiu ? 'text-red-500' : 'text-green-500'}`}></i>
            <span className={`font-black ${subiu ? 'text-red-600' : 'text-gray-900'}`}>{formatCurrency(row.preco_novo)}</span>
          </div>
        );
      }
    },
    {
      key: "estoque",
      label: "Estoque (Ant > Novo)",
      align: "center",
      format: (_, row) => {
        const isNovo = row.tipo_alteracao === "cadastro_inicial";
        if (isNovo) return <span className="font-black text-gray-800">{row.estoque_novo}</span>;
        const subiu = row.estoque_novo > (row.estoque_antigo || 0);
        return (
          <div className="flex items-center justify-center gap-2">
            <span className="text-gray-300 text-[10px]">{row.estoque_antigo}</span>
            <i className={`fas fa-long-arrow-alt-right text-xs ${subiu ? 'text-green-500' : 'text-red-400'}`}></i>
            <span className="font-black text-gray-900">{row.estoque_novo}</span>
          </div>
        );
      }
    },
    {
      key: "tipo_alteracao",
      label: "Evento",
      align: "center",
      format: (v) => {
        const map = {
          cadastro_inicial: { type: "info", label: "NOVO" },
          reposicao_estoque: { type: "success", label: "ESTOQUE" },
          alteracao_preco: { type: "warning", label: "PREÇO" },
          venda: { type: "secondary", label: "VENDA" }
        };
        const cfg = map[v] || { type: "secondary", label: "OUTRO" };
        return <StatusBadge type={cfg.type} label={cfg.label} />;
      }
    }
  ];

  return (
    <div className="p-4 md:p-6 h-full flex flex-col bg-gray-50 overflow-hidden">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-gray-800 tracking-tight">Histórico de Auditoria</h1>
          <p className="text-xs text-gray-500 mt-1 uppercase tracking-widest font-bold opacity-70">Monitoramento de preços e estoque</p>
        </div>

        <div className="flex gap-2 w-full md:w-auto">
          <button
            onClick={exportFullPDF}
            className="flex-1 md:flex-none bg-gray-800 text-white px-5 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-black transition shadow-lg active:scale-95 flex items-center justify-center gap-2"
          >
            <i className="fas fa-file-pdf"></i> Exportar Auditoria
          </button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mb-6 space-y-4">
        <div className="flex gap-2 overflow-x-auto pb-1 custom-scrollbar">
          {["weekly", "monthly", "yearly", "custom"].map((t) => (
            <button
              key={t}
              onClick={() => handlePeriodChange(t)}
              className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-full transition whitespace-nowrap ${
                periodType === t ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-400 hover:bg-gray-200"
              }`}
            >
              {t === "weekly" ? "Semana" : t === "monthly" ? "Mês" : t === "yearly" ? "Ano" : "Manual"}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-end">
          <div className="flex gap-2">
             <div className="flex-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block ml-1">De</label>
                <input type="date" className="w-full border border-gray-200 rounded-xl p-2.5 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-100" value={startDate} onChange={(e) => { setStartDate(e.target.value); setPeriodType("custom"); }} />
             </div>
             <div className="flex-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block ml-1">Até</label>
                <input type="date" className="w-full border border-gray-200 rounded-xl p-2.5 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-100" value={endDate} onChange={(e) => { setEndDate(e.target.value); setPeriodType("custom"); }} />
             </div>
          </div>
          <div className="lg:col-span-2">
             <FormField
                label="Filtrar na Lista"
                placeholder="Busque por descrição ou código do produto..."
                value={searchTerm}
                onChange={setSearchTerm}
                icon="fa-search"
             />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col">
        <DataTable
          columns={columns}
          data={filteredHistory}
          loading={loading}
          emptyMessage="Nenhuma alteração encontrada neste período."
        />
        
        {totalPages > 1 && (
          <div className="p-4 border-t border-gray-50 bg-gray-50/30 flex justify-between items-center shrink-0">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
              Pag {page} de {totalPages} • {totalRecords} total
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="bg-white border border-gray-200 text-gray-600 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-gray-100 disabled:opacity-30"
              >
                Anterior
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="bg-white border border-gray-200 text-gray-600 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-gray-100 disabled:opacity-30"
              >
                Próximo
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default HistoricoPrecos;
