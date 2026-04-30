// @ts-nocheck
import React, { useState, useEffect, useMemo, useCallback } from "react";
import dayjs from "dayjs";
import { useAlert } from "../context/AlertSystem";
import { api } from "../services/api";
import { formatCurrency } from "../utils/format";
import CupomFiscal from "../components/CupomFiscal";
import DataTable from "../components/ui/DataTable";
import FormField from "../components/ui/FormField";
import Modal from "../components/ui/Modal";
import StatusBadge from "../components/ui/StatusBadge";
import { buildDateRangeTimestamps, getPeriodRange } from "../utils/dateFilters";

const Recibos = () => {
  const { showAlert } = useAlert();

  const [sales, setSales] = useState([]);
  const [sellers, setSellers] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalRecords, setTotalRecords] = useState(0);
  const LIMIT = 100;

  // Filtros de Data e Período
  const [periodType, setPeriodType] = useState("weekly");
  const [filters, setFilters] = useState({
    startDate: dayjs().startOf("week").format("YYYY-MM-DD"),
    endDate: dayjs().endOf("week").format("YYYY-MM-DD"),
    sellerId: "",
    clientId: "",
  });

  // Estado para Busca de Cliente
  const [clientSearchTerm, setClientSearchTerm] = useState("");
  const [showClientResults, setShowClientResults] = useState(false);

  // Modais
  const [selectedSale, setSelectedSale] = useState(null);
  const [saleItems, setSaleItems] = useState([]);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [saleToCancel, setSaleToCancel] = useState(null);
  
  const [cancelForm, setCancelForm] = useState({
    adminUser: "",
    adminPass: "",
    reason: "",
  });

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const { startTimestamp, endTimestamp } = buildDateRangeTimestamps(
        filters.startDate,
        filters.endDate,
      );

      const [salesData, peopleData, clientsData] = await Promise.all([
        api.sales.list({
          page,
          limit: LIMIT,
          startDate: startTimestamp,
          endDate: endTimestamp,
          sellerId: filters.sellerId && filters.sellerId !== "all" ? filters.sellerId : undefined,
          clientId: filters.clientId && filters.clientId !== "all" ? filters.clientId : undefined,
        }),
        api.people.list(),
        api.clients.list()
      ]);

      const salesList = Array.isArray(salesData) ? salesData : (salesData?.data || []);
      setSales(salesList.sort((a, b) => b.data_venda - a.data_venda));
      setTotalPages(Array.isArray(salesData) ? 0 : (salesData?.totalPages || 0));
      setTotalRecords(Array.isArray(salesData) ? salesList.length : (salesData?.total || 0));
      setSellers(peopleData.filter((p) => p.cargo_nome === "Vendedor"));
      setClients(clientsData || []);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      showAlert("Erro ao conectar com o banco de dados.", "Erro", "error");
    } finally {
      setLoading(false);
    }
  }, [filters.startDate, filters.endDate, filters.sellerId, filters.clientId, showAlert, page]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handlePeriodChange = (type) => {
    setPeriodType(type);
    setPage(1);
    const range = getPeriodRange(type);
    if (!range) return;
    setFilters((prev) => ({ ...prev, startDate: range.startDate, endDate: range.endDate }));
  };

  const filteredSales = useMemo(() => {
    return sales;
  }, [sales]);

  const filteredClientsList = useMemo(() => {
    if (!clientSearchTerm) return [];
    const lower = clientSearchTerm.toLowerCase();
    return clients.filter((c) => c.nome.toLowerCase().includes(lower)).slice(0, 10);
  }, [clientSearchTerm, clients]);

  const handleSelectClient = (client) => {
    if (client) {
      setFilters({ ...filters, clientId: client.id });
      setClientSearchTerm(client.nome);
    } else {
      setFilters({ ...filters, clientId: "" });
      setClientSearchTerm("");
    }
    setPage(1);
    setShowClientResults(false);
  };

  const handleViewReceipt = async (sale) => {
    try {
      const items = await api.sales.items(sale.id);
      setSelectedSale(sale);
      setSaleItems(items);
      setShowReceiptModal(true);
    } catch (error) {
      showAlert("Erro ao carregar itens da venda.", "Erro", "error");
    }
  };

  const handleSilentPrint = async () => {
    const receiptElement = document.getElementById("cupom-fiscal-wrapper");
    if (!receiptElement) return showAlert("Erro interno: Cupom não encontrado.", "Erro", "error");
    
    try {
      const printerName = await api.config.get("impressora_padrao");
      const result = await api.print.silent(receiptElement.outerHTML, printerName);
      if (result.success) showAlert("Enviado para impressão.", "Sucesso", "success");
      else showAlert("Erro na impressão: " + result.error, "Erro", "error");
    } catch (error) {
      showAlert("Erro ao tentar imprimir.", "Erro", "error");
    }
  };

  const initiateCancel = (sale) => {
    if (sale.cancelada) return;
    setSaleToCancel(sale);
    setCancelForm({ adminUser: "", adminPass: "", reason: "" });
    setShowCancelModal(true);
  };

  const handleSubmitCancel = async (e) => {
    if (e) e.preventDefault();
    if (cancelForm.reason.trim().length < 10) {
      return showAlert("O motivo deve ter no mínimo 10 caracteres.", "Atenção", "warning");
    }
    if (!cancelForm.adminUser || !cancelForm.adminPass) {
      return showAlert("Preencha as credenciais do administrador.", "Autenticação", "warning");
    }

    try {
      const authResult = await api.auth.login({
        username: cancelForm.adminUser,
        password: cancelForm.adminPass,
      });

      if (!authResult.success || authResult.user.cargo !== "admin") {
        return showAlert("Apenas administradores podem cancelar vendas.", "Acesso Negado", "error");
      }

      const result = await api.sales.cancel({
        vendaId: saleToCancel.id,
        motivo: `${cancelForm.reason} (Por: ${authResult.user.nome})`,
      });

      if (result.success) {
        showAlert("Venda cancelada com sucesso!", "Sucesso", "success");
        loadData();
        setShowCancelModal(false);
        setSaleToCancel(null);
      } else {
        showAlert("Erro ao cancelar: " + result.error, "Erro", "error");
      }
    } catch (err) {
      showAlert("Erro técnico ao processar cancelamento.", "Erro", "error");
    }
  };

  const columns = [
    { key: "id", label: "ID", format: (v) => <span className="font-mono text-surface-400">#{v}</span> },
    { key: "data_venda", label: "Data/Hora", format: (v) => dayjs(v).format("DD/MM/YYYY HH:mm") },
    { key: "cliente_nome", label: "Cliente", format: (v) => v || "Consumidor Final", bold: true },
    { key: "vendedor_nome", label: "Vendedor" },
    { 
      key: "lista_pagamentos", 
      label: "Pagamento",
      format: (val, row) => (
        <div className="flex flex-col gap-1">
          {val && val.length > 0 ? val.map((p, i) => (
            <span key={i} className="text-[10px] bg-surface-50 text-surface-600 px-1.5 py-0.5 rounded border border-surface-200 w-fit whitespace-nowrap uppercase font-bold">
              {p.metodo}: {formatCurrency(p.valor)}
            </span>
          )) : <span className="text-xs">{row.forma_pagamento}</span>}
        </div>
      )
    },
    { 
      key: "total_final", 
      label: "Total", 
      align: "right",
      format: (val, row) => (
        <span className={`font-black ${row.cancelada ? "text-red-300 line-through" : "text-surface-800"}`}>
          {formatCurrency(val)}
        </span>
      )
    },
    { 
      key: "cancelada", 
      label: "Status", 
      align: "center",
      format: (val, row) => (
        <StatusBadge 
          type={val ? "danger" : "success"} 
          label={val ? "CANCELADA" : "CONCLUÍDA"}
          tooltip={val ? row.motivo_cancelamento : null}
        />
      )
    },
    {
      key: "actions",
      label: "Ações",
      align: "center",
      format: (_, row) => (
        <div className="flex justify-center gap-2">
          <button
            onClick={() => handleViewReceipt(row)}
            className="text-primary-600 hover:bg-primary-50 p-2 rounded-lg transition active:scale-90"
            title="Ver Recibo"
          >
            <i className="fas fa-eye"></i>
          </button>
          {!row.cancelada && (
            <button
              onClick={() => initiateCancel(row)}
              className="text-red-500 hover:bg-red-500/10 text-red-500 p-2 rounded-lg transition active:scale-90"
              title="Cancelar Venda"
            >
              <i className="fas fa-ban"></i>
            </button>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="p-4 md:p-6 h-full flex flex-col bg-surface-50 overflow-hidden">
      <div className="mb-6">
        <h1 className="text-xl md:text-2xl font-black text-surface-800 tracking-tight">Histórico de Vendas</h1>
        <p className="text-xs text-surface-500 mt-1">Consulte notas antigas, imprima segundas vias ou realize cancelamentos.</p>
      </div>

      <div className="bg-surface-100 p-4 rounded-2xl shadow-sm border border-surface-200 mb-4 flex flex-col gap-4">
        <div className="flex gap-2 pb-2 overflow-x-auto custom-scrollbar">
          {['weekly', 'monthly', 'yearly'].map(period => (
            <button
              key={period}
              onClick={() => handlePeriodChange(period)}
              className={`px-4 py-1.5 text-[10px] font-black uppercase rounded-lg transition-all tracking-wider ${periodType === period ? "bg-primary-600 text-white shadow-md shadow-blue-100" : "bg-surface-200 text-surface-400 hover:bg-surface-300"}`}
            >
              {period === 'weekly' ? 'Esta Semana' : period === 'monthly' ? 'Este Mês' : 'Este Ano'}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
          <FormField label="Início" type="date" value={filters.startDate} onChange={(v) => { setFilters({ ...filters, startDate: v }); setPeriodType("custom"); setPage(1); }} />
          <FormField label="Fim" type="date" value={filters.endDate} onChange={(v) => { setFilters({ ...filters, endDate: v }); setPeriodType("custom"); setPage(1); }} />
          
          <div>
            <label className="text-[10px] font-black text-surface-400 uppercase tracking-widest mb-1 ml-1 block">Vendedor</label>
            <select
              className="w-full border border-surface-300 rounded-xl p-2.5 text-sm font-medium focus:ring-2 focus:ring-primary-100 outline-none bg-surface-100 transition-all"
              value={filters.sellerId}
              onChange={(e) => { setFilters({ ...filters, sellerId: e.target.value }); setPage(1); }}
            >
              <option value="all">Todos os Vendedores</option>
              {sellers.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
            </select>
          </div>

          <div className="relative">
            <label className="text-[10px] font-black text-surface-400 uppercase tracking-widest mb-1 ml-1 block">Cliente</label>
            <div className="relative">
              <input
                className={`w-full border rounded-xl p-2.5 pl-9 text-sm outline-none focus:ring-2 focus:ring-primary-100 transition-all ${filters.clientId ? "border-green-500 bg-green-500/10 text-green-600 text-green-800 font-bold" : "border-surface-300 bg-surface-100"}`}
                placeholder={filters.clientId ? "" : "Buscar por nome..."}
                value={clientSearchTerm}
                onChange={(e) => {
                  setClientSearchTerm(e.target.value);
                  if (filters.clientId) setFilters({ ...filters, clientId: "" });
                  setPage(1);
                  setShowClientResults(true);
                }}
                onFocus={() => setShowClientResults(true)}
                onBlur={() => setTimeout(() => setShowClientResults(false), 200)}
              />
              <i className={`fas ${filters.clientId ? "fa-user-check text-green-600" : "fa-search text-surface-400"} absolute left-3.5 top-3.5 text-xs`}></i>
              {filters.clientId && (
                <button onClick={() => handleSelectClient(null)} className="absolute right-3 top-3.5 text-surface-400 hover:text-red-500">
                  <i className="fas fa-times text-xs"></i>
                </button>
              )}
            </div>
            {showClientResults && (clientSearchTerm.length > 0 || clients.length > 0) && (
              <div className="absolute top-full left-0 w-full bg-surface-100 border border-surface-200 rounded-xl shadow-xl mt-1 max-h-48 overflow-y-auto z-[60] p-1">
                <div className="p-2 hover:bg-surface-200 cursor-pointer text-[10px] font-black uppercase text-surface-400 border-b tracking-widest" onClick={() => handleSelectClient(null)}>
                  TODOS / LIMPAR FILTRO
                </div>
                {filteredClientsList.map((c) => (
                  <div key={c.id} onClick={() => handleSelectClient(c)} className="p-3 hover:bg-primary-50 cursor-pointer border-b border-surface-50 text-sm font-bold text-surface-800 rounded-lg">
                    {c.nome}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col">
        <DataTable 
          columns={columns} 
          data={filteredSales} 
          loading={loading}
          emptyMessage="Nenhuma venda encontrada para o filtro selecionado."
        />
        {totalPages > 1 && (
          <div className="p-4 border-t border-surface-50 bg-surface-50/30 flex justify-between items-center shrink-0">
            <span className="text-[10px] font-black text-surface-400 uppercase tracking-widest">
              Pag {page} de {totalPages} • {totalRecords} total
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

      {/* Modal de Recibo */}
      <Modal
        isOpen={showReceiptModal}
        onClose={() => setShowReceiptModal(false)}
        title="Visualizar Cupom"
        icon="fa-receipt"
        size="sm"
        footer={
          <div className="flex gap-2 w-full">
            <button
              onClick={() => setShowReceiptModal(false)}
              className="flex-1 px-4 py-2.5 bg-surface-200 text-surface-800 rounded-xl font-bold text-sm hover:bg-surface-300"
            >
              Fechar
            </button>
            <button
              onClick={handleSilentPrint}
              className="flex-[2] px-4 py-2.5 bg-primary-600 text-white rounded-xl font-black text-sm hover:bg-primary-700 shadow-md active:scale-95"
            >
              <i className="fas fa-print mr-2"></i> Reimprimir Recibo
            </button>
          </div>
        }
      >
        <div className="flex justify-center bg-surface-200 p-4 rounded-xl">
           <div id="cupom-fiscal-wrapper" className="bg-surface-100 p-2 shadow-sm rounded">
              <CupomFiscal sale={selectedSale} items={saleItems} />
           </div>
        </div>
      </Modal>

      {/* Modal Cancelamento */}
      <Modal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        title="Cancelar Venda"
        icon="fa-ban"
        size="md"
        footer={
          <div className="flex gap-2 w-full">
            <button
              onClick={() => setShowCancelModal(false)}
              className="flex-1 px-4 py-2.5 bg-surface-200 text-surface-800 rounded-xl font-bold text-sm"
            >
              Voltar
            </button>
            <button
              onClick={handleSubmitCancel}
              className="flex-[2] px-4 py-2.5 bg-red-600 text-white rounded-xl font-black text-sm hover:bg-red-700 shadow-md active:scale-95"
            >
              CONFIRMAR CANCELAMENTO
            </button>
          </div>
        }
      >
        <div className="space-y-6">
          <div className="bg-red-500/10 text-red-500 p-4 rounded-xl border border-red-100">
             <div className="text-[10px] font-black text-red-400 uppercase mb-2">Atenção</div>
             <p className="text-sm text-red-800 font-medium">Você está prestes a cancelar a venda <span className="font-bold">#{saleToCancel?.id}</span>. Esta ação retornará os itens ao estoque.</p>
          </div>

          <div className="space-y-4">
             <FormField
                label="Motivo do Cancelamento *"
                placeholder="Explique o porquê do estorno..."
                value={cancelForm.reason}
                onChange={(v) => setCancelForm({ ...cancelForm, reason: v })}
                required
             />
             
             <div className="grid grid-cols-2 gap-3 p-4 bg-surface-50 rounded-2xl border border-surface-200">
                <FormField
                   label="Usuário Admin"
                   value={cancelForm.adminUser}
                   onChange={(v) => setCancelForm({ ...cancelForm, adminUser: v })}
                   required
                />
                <FormField
                   label="Senha"
                   type="password"
                   value={cancelForm.adminPass}
                   onChange={(v) => setCancelForm({ ...cancelForm, adminPass: v })}
                   required
                />
             </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Recibos;
