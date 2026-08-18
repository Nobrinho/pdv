import React, { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import "dayjs/locale/pt-br";
import { useAlert } from "../context/AlertSystem";
import { useAuth } from "../context/AuthContext";
import { formatCurrency } from "../utils/format";
import useReportData from "../hooks/useReportData";
import PageSkeleton from "../components/ui/PageSkeleton";
import Button from "../components/ui/Button";
import { Input, Select } from "../components/ui/Input";
import { Checkbox } from "../components/ui/Checkbox";
import { Badge } from "../components/ui/Badge";
import { Icon } from "../components/ui/Icon";

const MONO = { fontFamily: "var(--font-mono)", fontVariantNumeric: "tabular-nums" };
const CAPS = "text-[10px] font-semibold uppercase tracking-[var(--tracking-caps)] text-[var(--muted-foreground)]";
import { api } from "../services/api";

dayjs.locale("pt-br");

const Comissoes = () => {
  const { showAlert } = useAlert();
  const { withPermission, can } = useAuth();
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
  const [showFilters, setShowFilters] = useState(false); // avançados colapsados no mobile
  const [selectedIds, setSelectedIds] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 100;
  const hasInvalidDateRange =
    startDate &&
    endDate &&
    dayjs(startDate).isAfter(dayjs(endDate));

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
    if (hasInvalidDateRange) return;
    if (e.target.checked) {
      setSelectedIds(
        salesDisplay.filter((v) => !v.comissao_paga).map((v) => v.id)
      );
    } else {
      setSelectedIds([]);
    }
  };

  const handlePaySelected = async () => {
    if (hasInvalidDateRange) {
      return showAlert("Data inicial nao pode ser maior que a data final.", "Filtro invalido", "warning");
    }
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
    return <PageSkeleton cards={3} />;
  }

  return (
    <div className="p-4 md:p-6 h-full flex flex-col overflow-y-auto bg-surface-50">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h1 className="text-lg md:text-xl font-semibold text-[var(--foreground)] tracking-tight flex items-center gap-2" style={{ fontFamily: "var(--font-display)" }}>
          <Icon name="hand-coins" size={20} className="text-[var(--primary)]" />
          Comissões
        </h1>
        {selectedIds.length > 0 && (
          <Button
            variant="primary"
            loading={processing}
            disabled={hasInvalidDateRange}
            onClick={() => withPermission(handlePaySelected, "commissions.pay")}
            className="w-full sm:w-auto gap-2"
          >
            <Icon name="check" size={16} /> Baixar {selectedIds.length} selecionada(s)
          </Button>
        )}
      </div>

      {/* FILTROS */}
      <div className="bg-[var(--card)] p-4 rounded-[var(--radius-xl)] shadow-[var(--shadow-xs)] mb-6 border border-[var(--border)] flex flex-col gap-4">
        {hasInvalidDateRange && (
          <div className="bg-[var(--warning-soft)] text-[var(--warning-soft-foreground)] border border-[var(--warning-soft-border)] rounded-[var(--radius-md)] p-2.5 text-xs font-semibold">
            Data inicial nao pode ser maior que a data final.
          </div>
        )}
        <div className="flex items-center gap-2 border-b border-[var(--border)] pb-4">
          <div className="flex gap-2 overflow-x-auto flex-1">
            <button
              onClick={() => handlePeriodChange("weekly")}
              className={`px-4 py-1.5 text-sm rounded-full transition whitespace-nowrap ${periodType === "weekly" ? "bg-[var(--primary)] text-white font-semibold" : "bg-[var(--content2)] text-[var(--muted-foreground)] hover:bg-[var(--hover-surface)]"}`}
            >
              Esta semana
            </button>
            <button
              onClick={() => handlePeriodChange("monthly")}
              className={`px-4 py-1.5 text-sm rounded-full transition whitespace-nowrap ${periodType === "monthly" ? "bg-[var(--primary)] text-white font-semibold" : "bg-[var(--content2)] text-[var(--muted-foreground)] hover:bg-[var(--hover-surface)]"}`}
            >
              Este mês
            </button>
          </div>
          <button
            onClick={() => setShowFilters((v) => !v)}
            className={`lg:hidden shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-md)] text-[11px] font-bold uppercase tracking-wider transition ${
              selectedSeller !== "all" || statusFilter !== "all" ? "bg-[var(--primary)] text-white" : "bg-[var(--content2)] text-[var(--muted-foreground)]"
            }`}
          >
            <Icon name="settings" size={13} className={showFilters ? "rotate-180 transition-transform" : "transition-transform"} />
            Filtros
          </button>
        </div>

        <div className={`${showFilters ? "grid" : "hidden"} lg:grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end`}>
          <div>
            <label className="block text-xs font-bold text-surface-500 uppercase mb-1">Início</label>
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
            <label className="block text-xs font-bold text-surface-500 uppercase mb-1">Fim</label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPeriodType("custom");
              }}
            />
          </div>
          {can("data.view_all") && (
            <div>
              <label className="block text-xs font-bold text-surface-500 uppercase mb-1">Vendedor</label>
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
          )}
          <div>
            <label className="block text-xs font-bold text-surface-500 uppercase mb-1">Status de Repasse</label>
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">Exibir TUDO</option>
              <option value="pending">Apenas PENDENTES</option>
              <option value="paid">Apenas PAGAS</option>
            </Select>
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
        <div className="bg-[var(--card)] rounded-[var(--radius-xl)] shadow-[var(--shadow-xs)] border border-[var(--border)] border-l-4 border-l-[var(--warning-icon)] p-4 flex items-center">
          <div className="p-3 bg-[var(--warning-soft)] text-[var(--warning-icon)] rounded-full mr-4">
            <Icon name="alert-triangle" size={20} />
          </div>
          <div>
            <p className={CAPS}>Total a pagar (pendentes)</p>
            <p className="text-2xl font-semibold text-[var(--warning-icon)]" style={MONO}>{formatCurrency(totalPagar)}</p>
          </div>
        </div>
        <div className="bg-[var(--card)] rounded-[var(--radius-xl)] shadow-[var(--shadow-xs)] border border-[var(--border)] border-l-4 border-l-[var(--success)] p-4 flex items-center">
          <div className="p-3 bg-[var(--success-soft)] text-[var(--success)] rounded-full mr-4">
            <Icon name="circle-check" size={20} />
          </div>
          <div>
             <p className={CAPS}>Total já pago</p>
             <p className="text-2xl font-semibold text-[var(--money-positive)]" style={MONO}>{formatCurrency(totalPago)}</p>
          </div>
        </div>
        <div className="bg-[var(--card)] rounded-[var(--radius-xl)] shadow-[var(--shadow-xs)] border border-[var(--border)] p-4 flex items-center">
           <div className="p-3 bg-[var(--content2)] text-[var(--muted-foreground)] rounded-full mr-4">
            <Icon name="wallet" size={20} />
          </div>
          <div>
             <p className={CAPS}>Comissões do período</p>
             <p className="text-2xl font-semibold text-[var(--foreground)]" style={MONO}>{formatCurrency(totalAcumulado)}</p>
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
          <table className="min-w-full">
            <thead className="bg-[var(--content2)] sticky top-0 z-10">
              <tr>
                <th className="px-4 py-[11px] text-left w-10">
                  <Checkbox
                    onChange={handleSelectAll}
                    disabled={hasInvalidDateRange}
                    checked={
                      salesDisplay.filter((v) => !v.comissao_paga).length > 0 &&
                      selectedIds.length === salesDisplay.filter((v) => !v.comissao_paga).length
                    }
                  />
                </th>
                <th className="px-[18px] py-[11px] text-left text-[10px] font-semibold text-[var(--muted-foreground)] uppercase tracking-[var(--tracking-caps)]">Data</th>
                <th className="px-[18px] py-[11px] text-left text-[10px] font-semibold text-[var(--muted-foreground)] uppercase tracking-[var(--tracking-caps)]">Vendedor</th>
                <th className="px-[18px] py-[11px] text-right text-[10px] font-semibold text-[var(--muted-foreground)] uppercase tracking-[var(--tracking-caps)]">Fat. produto</th>
                <th className="px-[18px] py-[11px] text-right text-[10px] font-semibold text-[var(--muted-foreground)] uppercase tracking-[var(--tracking-caps)]">Comissão gerada</th>
                <th className="px-[18px] py-[11px] text-center text-[10px] font-semibold text-[var(--muted-foreground)] uppercase tracking-[var(--tracking-caps)]">Status</th>
              </tr>
            </thead>
            <tbody>
              {paginatedSalesDisplay.map((venda) => (
                <React.Fragment key={venda.id}>
                  {/* Linha Principal (Condensada) */}
                  <tr className={`border-t border-[var(--border)] transition-colors ${selectedIds.includes(venda.id) ? "bg-[var(--primary-soft)]" : "hover:bg-[var(--hover-surface)]"}`}>
                     <td className="px-4 py-3">
                        <Checkbox
                          disabled={venda.comissao_paga}
                          checked={selectedIds.includes(venda.id)}
                          onChange={() => handleToggleSelectMenu(venda.id)}
                        />
                     </td>
                     <td className="px-[18px] py-3 text-[13px] text-[var(--foreground)]" style={{ fontFamily: "var(--font-mono)", fontVariantNumeric: "tabular-nums" }}>{dayjs(venda.data_venda).format("DD/MM/YY HH:mm")}</td>
                     <td className="px-[18px] py-3 text-[13px] font-medium text-[var(--foreground)]">{venda.vendedor_nome}</td>
                     <td className="px-[18px] py-3 text-[13px] text-right text-[var(--muted-foreground)]" style={{ fontFamily: "var(--font-mono)", fontVariantNumeric: "tabular-nums" }}>
                        {formatCurrency(venda.subtotal - venda.desconto_valor)}
                     </td>
                     <td className="px-[18px] py-3 text-[13px] text-right font-semibold text-[var(--primary)]" style={{ fontFamily: "var(--font-mono)", fontVariantNumeric: "tabular-nums" }}>
                        {formatCurrency(venda.comissao_calculada)}
                     </td>
                     <td className="px-[18px] py-3 text-center">
                        {venda.comissao_paga ? (
                           <div className="flex flex-col items-center justify-center gap-1">
                             <Badge variant="success">Pago</Badge>
                             <span className="text-[10px] text-[var(--money-positive)] font-semibold">
                               {dayjs(venda.data_pagamento_comissao).format("DD/MM/YY HH:mm")}
                             </span>
                           </div>
                        ) : (
                           <Badge variant="warning">Pendente</Badge>
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
                   <td colSpan="6" className="text-center py-8 text-[var(--muted-foreground)]">
                     <Icon name="inbox" size={30} className="mx-auto mb-2 text-[var(--icon-muted)]" />
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
