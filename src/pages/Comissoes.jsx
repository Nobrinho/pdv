import React, { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import "dayjs/locale/pt-br";
import { useAlert } from "../context/AlertSystem";
import { formatCurrency } from "../utils/format";
import useReportData from "../hooks/useReportData";
import { api } from "../services/api";

dayjs.locale("pt-br");

const Comissoes = () => {
  const { showAlert } = useAlert();
  const {
    allPeople,
    filteredSales,
    loading,
    periodType,
    startDate,
    endDate,
    selectedSeller,
    setStartDate,
    setEndDate,
    setSelectedSeller,
    setPeriodType,
    handlePeriodChange,
    loadData,
  } = useReportData();

  const [statusFilter, setStatusFilter] = useState("all"); // 'all', 'pending', 'paid'
  const [viewMode, setViewMode] = useState("condensed"); // 'condensed', 'detailed'
  const [selectedIds, setSelectedIds] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 100;

  // Derivação de dados filtrados
  const salesDisplay = useMemo(() => {
    let sales = filteredSales.filter(
      (v) => !v.cancelada && v.comissao_calculada > 0
    );

    if (statusFilter === "pending") {
      sales = sales.filter((v) => !v.comissao_paga);
    } else if (statusFilter === "paid") {
      sales = sales.filter((v) => v.comissao_paga);
    }

    return sales;
  }, [filteredSales, statusFilter]);

  const totalPages = Math.ceil(salesDisplay.length / PAGE_SIZE);
  const paginatedSalesDisplay = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return salesDisplay.slice(start, start + PAGE_SIZE);
  }, [salesDisplay, page]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter, startDate, endDate, selectedSeller, periodType, viewMode]);

  // KPIs
  const { totalPagar, totalPago, totalAcumulado } = useMemo(() => {
    let pagar = 0,
      pago = 0,
      acumulado = 0;

    filteredSales.forEach((v) => {
      if (v.cancelada || v.comissao_calculada <= 0) return;
      acumulado += v.comissao_calculada;
      if (v.comissao_paga) {
        pago += v.comissao_calculada;
      } else {
        pagar += v.comissao_calculada;
      }
    });

    return { totalPagar: pagar, totalPago: pago, totalAcumulado: acumulado };
  }, [filteredSales]);

  // Ações
  const handleToggleSelectMenu = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(
        salesDisplay.filter((v) => !v.comissao_paga).map((v) => v.id)
      );
    } else {
      setSelectedIds([]);
    }
  };

  const handlePaySelected = async () => {
    if (selectedIds.length === 0) {
      return showAlert("Selecione ao menos uma comissão para baixar.", "Aviso", "warning");
    }

    const conf = window.confirm(
      `Deseja registrar o pagamento de ${selectedIds.length} comissões selecionadas?`
    );
    if (!conf) return;

    setProcessing(true);
    try {
      const res = await api.sales.payCommissions(selectedIds);
      if (res.success) {
        showAlert("Comissões marcadas como pagas com sucesso!", "Sucesso", "success");
        setSelectedIds([]);
        await loadData(); // Recarrega os dados do hook UseReportData
      } else {
        showAlert("Falha ao registrar pagamento.", "Erro", "error");
      }
    } catch (error) {
      console.error(error);
      showAlert("Ocorreu um erro ao baixar as comissões.", "Erro", "error");
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 h-full flex flex-col overflow-y-auto bg-surface-50">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h1 className="text-xl md:text-2xl font-bold text-surface-800 flex items-center">
          <i className="fas fa-hand-holding-usd mr-3 text-indigo-600"></i>
          Gestor de Comissões
        </h1>
        {selectedIds.length > 0 && (
          <button
            onClick={handlePaySelected}
            disabled={processing}
            className="w-full sm:w-auto bg-green-600 text-white px-5 py-2.5 rounded-lg hover:bg-green-700 shadow-md flex items-center justify-center gap-2 font-bold transition active:scale-95 disabled:opacity-50"
          >
            <i className={`fas ${processing ? "fa-spinner fa-spin" : "fa-check-double"}`}></i>
            Baixar {selectedIds.length} Selecionada(s)
          </button>
        )}
      </div>

      {/* FILTROS */}
      <div className="bg-surface-100 p-4 rounded-xl shadow-sm mb-6 border border-surface-200 flex flex-col gap-4">
        <div className="flex gap-2 border-b pb-4 overflow-x-auto">
          <button
            onClick={() => handlePeriodChange("weekly")}
            className={`px-4 py-1.5 text-sm rounded-full transition whitespace-nowrap ${periodType === "weekly" ? "bg-indigo-600 text-white font-bold" : "bg-surface-200 text-surface-600 hover:bg-surface-300"}`}
          >
            Esta Semana
          </button>
          <button
            onClick={() => handlePeriodChange("monthly")}
            className={`px-4 py-1.5 text-sm rounded-full transition whitespace-nowrap ${periodType === "monthly" ? "bg-indigo-600 text-white font-bold" : "bg-surface-200 text-surface-600 hover:bg-surface-300"}`}
          >
            Este Mês
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
          <div>
            <label className="block text-xs font-bold text-surface-500 uppercase mb-1">Início</label>
            <input
              type="date"
              className="w-full border rounded p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-surface-100 text-surface-800 border-surface-300 focus:ring-primary-500/20"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPeriodType("custom");
              }}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-surface-500 uppercase mb-1">Fim</label>
            <input
              type="date"
              className="w-full border rounded p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-surface-100 text-surface-800 border-surface-300 focus:ring-primary-500/20"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPeriodType("custom");
              }}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-surface-500 uppercase mb-1">Vendedor</label>
            <select
              className="w-full border rounded p-2 text-sm bg-surface-100 focus:ring-2 focus:ring-indigo-500 outline-none"
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
            <label className="block text-xs font-bold text-surface-500 uppercase mb-1">Status de Repasse</label>
            <select
              className="w-full border           rounded p-2 text-sm bg-surface-100 focus:ring-2 focus:ring-indigo-500 outline-none"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">Exibir TUDO</option>
              <option value="pending">Apenas PENDENTES</option>
              <option value="paid">Apenas PAGAS</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-surface-500 uppercase mb-1">Visualização do Extrato</label>
            <div className="flex bg-surface-200 rounded-lg p-1 border">
              <button
                className={`flex-1 text-xs py-1.5 rounded transition ${viewMode === "condensed" ? "bg-surface-100 shadow text-indigo-700 font-bold" : "text-surface-500 hover:text-surface-800"}`}
                onClick={() => setViewMode("condensed")}
              >
                Condensado
              </button>
              <button
                 className={`flex-1 text-xs py-1.5 rounded transition ${viewMode === "detailed" ? "bg-surface-100 shadow text-indigo-700 font-bold" : "text-surface-500 hover:text-surface-800"}`}
                 onClick={() => setViewMode("detailed")}
              >
                Detalhado
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* KPIs Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-surface-100 rounded-xl shadow-sm border border-l-4 border-l-orange-500 p-4 flex items-center">
          <div className="p-3 bg-orange-100 text-orange-600 rounded-full mr-4">
            <i className="fas fa-exclamation-circle text-xl"></i>
          </div>
          <div>
            <p className="text-xs font-bold text-surface-500 uppercase">Total A Pagar (Pendentes)</p>
            <p className="text-2xl font-bold text-orange-600">{formatCurrency(totalPagar)}</p>
          </div>
        </div>
        <div className="bg-surface-100 rounded-xl shadow-sm border border-l-4 border-l-green-500 p-4 flex items-center">
          <div className="p-3 bg-green-100 text-green-600 rounded-full mr-4">
            <i className="fas fa-check-circle text-xl"></i>
          </div>
          <div>
             <p className="text-xs font-bold text-surface-500 uppercase">Total Já Pago</p>
             <p className="text-2xl font-bold text-green-600">{formatCurrency(totalPago)}</p>
          </div>
        </div>
        <div className="bg-surface-100 rounded-xl shadow-sm border p-4 flex items-center border-surface-200">
           <div className="p-3 bg-surface-200 text-surface-600 rounded-full mr-4">
            <i className="fas fa-wallet text-xl"></i>
          </div>
          <div>
             <p className="text-xs font-bold text-surface-500 uppercase">Comissões do Período</p>
             <p className="text-2xl font-bold text-surface-800">{formatCurrency(totalAcumulado)}</p>
          </div>
        </div>
      </div>

      {/* TABELA */}
      <div className="bg-surface-100 rounded-xl shadow-md overflow-hidden border border-surface-200 flex-1 flex flex-col min-h-[400px]">
        <div className="p-3 bg-surface-50 border-b flex justify-between items-center text-sm">
          <span className="font-bold text-surface-800">Holerite de Vendas</span>
          <span className="text-surface-500">{salesDisplay.length} vendas listadas</span>
        </div>
        <div className="overflow-y-auto flex-1 custom-scrollbar">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-surface-50 sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3 text-left w-10">
                  <input
                    type="checkbox"
                    className="w-4 h-4 text-indigo-600 rounded border-surface-300 focus:ring-indigo-500 cursor-pointer bg-surface-100 text-surface-800 border-surface-300 focus:ring-primary-500/20"
                    onChange={handleSelectAll}
                    checked={
                      salesDisplay.filter((v) => !v.comissao_paga).length > 0 &&
                      selectedIds.length === salesDisplay.filter((v) => !v.comissao_paga).length
                    }
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-bold text-surface-500 uppercase">Data</th>
                <th className="px-4 py-3 text-left text-xs font-bold text-surface-500 uppercase">Vendedor</th>
                <th className="px-4 py-3 text-right text-xs font-bold text-surface-500 uppercase">Fat. Produto</th>
                <th className="px-4 py-3 text-right text-xs font-bold text-surface-500 uppercase">Comissão Gerada</th>
                <th className="px-4 py-3 text-center text-xs font-bold text-surface-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {paginatedSalesDisplay.map((venda) => (
                <React.Fragment key={venda.id}>
                  {/* Linha Principal (Condensada) */}
                  <tr className={`hover:bg-surface-50 transition-colors ${selectedIds.includes(venda.id) ? "bg-primary-500/10 text-primary-600" : ""}`}>
                     <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          className="w-4 h-4 text-indigo-600 rounded border-surface-300 focus:ring-indigo-500 cursor-pointer disabled:opacity-30 bg-surface-100 text-surface-800 border-surface-300 focus:ring-primary-500/20"
                          disabled={venda.comissao_paga}
                          checked={selectedIds.includes(venda.id)}
                          onChange={() => handleToggleSelectMenu(venda.id)}
                        />
                     </td>
                     <td className="px-4 py-3 text-sm">{dayjs(venda.data_venda).format("DD/MM/YY HH:mm")}</td>
                     <td className="px-4 py-3 text-sm font-medium">{venda.vendedor_nome}</td>
                     <td className="px-4 py-3 text-sm text-right text-surface-600">
                        {formatCurrency(venda.subtotal - venda.desconto_valor)}
                     </td>
                     <td className="px-4 py-3 text-sm text-right font-bold text-indigo-700">
                        {formatCurrency(venda.comissao_calculada)}
                     </td>
                     <td className="px-4 py-3 text-center">
                        {venda.comissao_paga ? (
                           <div className="flex flex-col items-center justify-center">
                             <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-bold">
                               <i className="fas fa-check mr-1"></i> PAGO
                             </span>
                             <span className="text-[10px] text-green-600 mt-1 font-semibold">
                               {dayjs(venda.data_pagamento_comissao).format("DD/MM/YY HH:mm")}
                             </span>
                           </div>
                        ) : (
                           <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs font-bold">
                             PENDENTE
                           </span>
                        )}
                     </td>
                  </tr>

                  {/* Detalhamento (Se visionMode for Detailed) */}
                  {viewMode === "detailed" && (
                    <tr className="bg-surface-50 relative">
                       <td colSpan="6" className="p-0 border-b">
                         <div className="pl-14 pr-4 py-3 bg-gradient-to-r from-gray-50 to-white shadow-inner">
                           <table className="min-w-full text-xs text-surface-500">
                             <thead>
                                <tr>
                                  <th className="text-left py-1 text-surface-400">Produto</th>
                                  <th className="text-center py-1 text-surface-400">Tipo</th>
                                  <th className="text-right py-1 text-surface-400">Rateio Base(R$)</th>
                                  <th className="text-right py-1 text-surface-400">Com. Rateada</th>
                                </tr>
                             </thead>
                             <tbody>
                               {venda.itens && venda.itens.map((item, idxi) => {
                                 // Simulando rateio logico visual baseado no proporcional.
                                 // No hook original isso é agregado, mas podemos mostrar a participação do item.
                                 const itemBruto = item.preco_unitario * item.quantidade;
                                 const ratio = venda.subtotal > 0 ? itemBruto / venda.subtotal : 1;
                                 const descontoRateio = venda.desconto_valor * ratio;
                                 const liqItem = itemBruto - descontoRateio;
                                 return (
                                   <tr key={idxi} className="border-t border-dashed border-surface-200">
                                     <td className="py-1.5">{item.descricao} (x{item.quantidade})</td>
                                     <td className="py-1.5 text-center">{item.tipo ? item.tipo.toUpperCase() : "N/A"}</td>
                                     <td className="py-1.5 text-right font-medium">{formatCurrency(liqItem)}</td>
                                     <td className="py-1.5 text-right text-indigo-500 font-bold">
                                         ~ {formatCurrency(venda.comissao_calculada * ratio)}
                                     </td>
                                   </tr>
                                 )
                               })}
                             </tbody>
                           </table>
                         </div>
                       </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}

              {salesDisplay.length === 0 && (
                 <tr>
                   <td colSpan="6" className="text-center py-8 text-surface-500">
                     <i className="fas fa-inbox text-3xl mb-2 text-surface-300 block"></i>
                     Nenhuma comissão encontrada para este filtro.
                   </td>
                 </tr>
              )}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="p-4 border-t border-surface-50 bg-surface-50/30 flex justify-between items-center shrink-0">
            <span className="text-[10px] font-black text-surface-400 uppercase tracking-widest">
              Pag {page} de {totalPages} • {salesDisplay.length} total
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="bg-surface-100 border border-surface-200 text-surface-600 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-surface-200 disabled:opacity-30"
              >
                Anterior
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="bg-surface-100 border border-surface-200 text-surface-600 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-surface-200 disabled:opacity-30"
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

export default Comissoes;
