// @ts-nocheck
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import dayjs from "dayjs";
import { useAlert } from "../context/AlertSystem";
import { api } from "../services/api";
import { formatCurrency } from "../utils/format";
import Button from "../components/ui/Button";
import CupomFiscal from "../components/CupomFiscal";
import MobileReceipt from "../components/MobileReceipt";
import { useTenant, thermalizeReceiptHtml } from "../context/TenantContext";
import { shareReceiptImage } from "../utils/whatsapp";
import DataTable from "../components/ui/DataTable";
import FormField from "../components/ui/FormField";
import { Select } from "../components/ui/Input";
import Modal from "../components/ui/Modal";
import { Badge } from "../components/ui/Badge";
import { Icon } from "../components/ui/Icon";
import { buildDateRangeTimestamps, getPeriodRange } from "../utils/dateFilters";

const Recibos = () => {
  const { showAlert } = useAlert();

  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const LIMIT = 100;

  // Filtros de Data e Período
  const [periodType, setPeriodType] = useState("weekly");
  const [showFilters, setShowFilters] = useState(false); // avançados colapsados no mobile
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
  const [isLoadingReceipt, setIsLoadingReceipt] = useState(false);
  const [isPrintingReceipt, setIsPrintingReceipt] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [isCancellingSale, setIsCancellingSale] = useState(false);
  const { tenant } = useTenant();
  
  const [cancelForm, setCancelForm] = useState({
    adminUser: "",
    adminPass: "",
    reason: "",
  });

  const hasInvalidRange =
    filters.startDate &&
    filters.endDate &&
    dayjs(filters.startDate).isAfter(dayjs(filters.endDate));

  const { startTimestamp, endTimestamp } = buildDateRangeTimestamps(
    filters.startDate,
    filters.endDate,
  );
  const salesParams = {
    page,
    limit: LIMIT,
    startDate: startTimestamp,
    endDate: endTimestamp,
    sellerId: filters.sellerId && filters.sellerId !== "all" ? filters.sellerId : undefined,
    clientId: filters.clientId && filters.clientId !== "all" ? filters.clientId : undefined,
  };
  // A chave inclui os filtros → cada combinação é cacheada.
  const salesQuery = useQuery({
    queryKey: ["sales", salesParams],
    queryFn: () => api.sales.list(salesParams),
    enabled: !hasInvalidRange,
  });
  const rawSales = salesQuery.data;
  const salesList = Array.isArray(rawSales) ? rawSales : rawSales?.data || [];
  const sales = useMemo(
    () => [...salesList].sort((a, b) => b.data_venda - a.data_venda),
    [salesList],
  );
  const totalPages = Array.isArray(rawSales) ? 0 : rawSales?.totalPages || 0;
  const totalRecords = Array.isArray(rawSales) ? sales.length : rawSales?.total || 0;
  const loading = salesQuery.isLoading;

  const { data: people = [] } = useQuery({ queryKey: ["people"], queryFn: () => api.people.list() });
  const sellers = useMemo(() => people.filter((p) => p.cargo_nome === "Vendedor"), [people]);
  const { data: clients = [] } = useQuery({ queryKey: ["clients"], queryFn: () => api.clients.list() });

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
    if (isLoadingReceipt) return;
    try {
      setIsLoadingReceipt(true);
      const items = await api.sales.items(sale.id);
      setSelectedSale(sale);
      setSaleItems(items);
      setShowReceiptModal(true);
    } catch (error) {
      showAlert("Erro ao carregar itens da venda.", "Erro", "error");
    } finally {
      setIsLoadingReceipt(false);
    }
  };

  const handleShareReceipt = async () => {
    if (isSharing) return;
    setIsSharing(true);
    try {
      const element = document.getElementById("cupom-fiscal");
      await shareReceiptImage(element, { ...selectedSale, itens: saleItems }, tenant);
    } finally {
      setIsSharing(false);
    }
  };

  const handleSilentPrint = async () => {
    if (isPrintingReceipt) return;
    const receiptElement = document.getElementById("cupom-fiscal-wrapper");
    if (!receiptElement) return showAlert("Erro interno: Cupom não encontrado.", "Erro", "error");
    
    try {
      setIsPrintingReceipt(true);
      const printerName = await api.config.get("impressora_padrao");
      const html = await thermalizeReceiptHtml(receiptElement);
      const result = await api.print.silent(html, printerName);
      if (result.success) showAlert("Enviado para impressão.", "Sucesso", "success");
      else showAlert("Erro na impressão: " + result.error, "Erro", "error");
    } catch (error) {
      showAlert("Erro ao tentar imprimir.", "Erro", "error");
    } finally {
      setIsPrintingReceipt(false);
    }
  };

  const initiateCancel = (sale) => {
    if (sale.cancelada) return;
    setSaleToCancel(sale);
    setCancelForm({ adminUser: "", adminPass: "", reason: "" });
    setShowCancelModal(true);
  };

  const handleSubmitCancel = async (e) => {
    if (isCancellingSale) return;
    if (e) e.preventDefault();
    if (cancelForm.reason.trim().length < 10) {
      return showAlert("O motivo deve ter no mínimo 10 caracteres.", "Atenção", "warning");
    }
    if (!cancelForm.adminUser || !cancelForm.adminPass) {
      return showAlert("Preencha as credenciais do administrador.", "Autenticação", "warning");
    }

    try {
      setIsCancellingSale(true);
      const authResult = await api.auth.verifyAdmin({
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
        queryClient.invalidateQueries({ queryKey: ["sales"] });
        queryClient.invalidateQueries({ queryKey: ["products"] }); // estoque volta
        setShowCancelModal(false);
        setSaleToCancel(null);
      } else {
        showAlert("Erro ao cancelar: " + result.error, "Erro", "error");
      }
    } catch (err) {
      showAlert("Erro técnico ao processar cancelamento.", "Erro", "error");
    } finally {
      setIsCancellingSale(false);
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
        <span title={val ? row.motivo_cancelamento || "" : ""}>
          <Badge variant={val ? "danger" : "success"}>{val ? "Cancelada" : "Concluída"}</Badge>
        </span>
      )
    },
    {
      key: "actions",
      label: "Ações",
      align: "center",
      format: (_, row) => (
        <div className="flex justify-center gap-1">
          <button
            onClick={() => handleViewReceipt(row)}
            disabled={isLoadingReceipt}
            className="p-2 rounded-[var(--radius-md)] text-[var(--muted-foreground)] hover:text-[var(--primary)] hover:bg-[var(--hover-surface)] transition disabled:opacity-50"
            title="Ver recibo"
          >
            <Icon name={isLoadingReceipt ? "refresh-cw" : "eye"} size={16} className={isLoadingReceipt ? "animate-spin" : ""} />
          </button>
          {!row.cancelada && (
            <button
              onClick={() => initiateCancel(row)}
              disabled={isCancellingSale}
              className="p-2 rounded-[var(--radius-md)] text-[var(--muted-foreground)] hover:text-[var(--danger)] hover:bg-[var(--hover-surface)] transition disabled:opacity-50"
              title="Cancelar venda"
            >
              <Icon name="ban" size={16} />
            </button>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="p-4 md:p-6 h-full flex flex-col bg-surface-50 overflow-hidden">
      <div className="mb-6">
        <h1 className="text-lg md:text-xl font-semibold text-[var(--foreground)] tracking-tight" style={{ fontFamily: "var(--font-display)" }}>Histórico de vendas</h1>
        <p className="text-xs text-[var(--muted-foreground)] mt-1">Consulte notas antigas, imprima segundas vias ou realize cancelamentos.</p>
      </div>

      <div className="bg-[var(--card)] p-3 md:p-4 rounded-[var(--radius-xl)] shadow-[var(--shadow-xs)] border border-[var(--border)] mb-4 flex flex-col gap-3 md:gap-4">
        <div className="flex items-center gap-2">
          <div className="flex gap-2 overflow-x-auto custom-scrollbar flex-1">
            {['weekly', 'monthly', 'yearly'].map(period => (
              <button
                key={period}
                onClick={() => handlePeriodChange(period)}
                className={`px-4 py-1.5 text-sm rounded-full transition whitespace-nowrap ${
                  periodType === period
                    ? "bg-[var(--primary)] text-[var(--primary-foreground)] font-semibold"
                    : "bg-[var(--muted)] text-[var(--muted-foreground)] hover:bg-[var(--hover-surface)]"
                }`}
              >
                {period === 'weekly' ? 'Esta semana' : period === 'monthly' ? 'Este mês' : 'Este ano'}
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowFilters((v) => !v)}
            className={`lg:hidden shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--radius-md)] text-[10px] font-bold uppercase tracking-wider transition ${
              filters.sellerId || filters.clientId ? "bg-[var(--primary)] text-white" : "bg-[var(--content2)] text-[var(--muted-foreground)]"
            }`}
          >
            <Icon name="settings" size={13} className={showFilters ? "rotate-180 transition-transform" : "transition-transform"} />
            Filtros
          </button>
        </div>

        <div className={`${showFilters ? "grid" : "hidden"} lg:grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end`}>
          <FormField label="Início" type="date" value={filters.startDate} onChange={(v) => { setFilters({ ...filters, startDate: v }); setPeriodType("custom"); setPage(1); }} />
          <FormField label="Fim" type="date" value={filters.endDate} onChange={(v) => { setFilters({ ...filters, endDate: v }); setPeriodType("custom"); setPage(1); }} />
          
          <div>
            <label className="text-[10px] font-semibold text-[var(--muted-foreground)] uppercase tracking-[var(--tracking-caps)] mb-1 ml-0.5 block">Vendedor</label>
            <Select
              value={filters.sellerId}
              onChange={(e) => { setFilters({ ...filters, sellerId: e.target.value }); setPage(1); }}
            >
              <option value="all">Todos os vendedores</option>
              {sellers.map((s) => <option key={s.id} value={s.id}>{s.nome}</option>)}
            </Select>
          </div>

          <div className="relative">
            <label className="text-[10px] font-semibold text-[var(--muted-foreground)] uppercase tracking-[var(--tracking-caps)] mb-1 ml-0.5 block">Cliente</label>
            <div className="relative">
              <input
                className={`w-full h-9 rounded-[var(--radius-md)] border pl-9 pr-8 text-sm outline-none transition-colors ${filters.clientId ? "border-[var(--success)] bg-[var(--success-soft)] text-[var(--success-soft-foreground)] font-semibold" : "border-[var(--input)] bg-[var(--card)] text-[var(--foreground)] focus:border-[var(--ring)]"}`}
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
              <Icon name={filters.clientId ? "circle-check" : "search"} size={15} className={`absolute left-3 top-1/2 -translate-y-1/2 ${filters.clientId ? "text-[var(--success)]" : "text-[var(--muted-foreground)]"}`} />
              {filters.clientId && (
                <button onClick={() => handleSelectClient(null)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] hover:text-[var(--danger)]">
                  <Icon name="x" size={15} />
                </button>
              )}
            </div>
            {showClientResults && (clientSearchTerm.length > 0 || clients.length > 0) && (
              <div className="absolute top-full left-0 w-full bg-[var(--popover)] border border-[var(--border)] rounded-[var(--radius-md)] shadow-lg mt-1 max-h-48 overflow-y-auto z-[60] p-1">
                <div className="p-2 hover:bg-[var(--hover-surface)] cursor-pointer text-[10px] font-semibold uppercase text-[var(--muted-foreground)] tracking-[var(--tracking-caps)] rounded" onClick={() => handleSelectClient(null)}>
                  Todos / limpar filtro
                </div>
                {filteredClientsList.map((c) => (
                  <div key={c.id} onClick={() => handleSelectClient(c)} className="p-2.5 hover:bg-[var(--hover-surface)] cursor-pointer text-sm font-medium text-[var(--foreground)] rounded">
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
          onRefresh={() => salesQuery.refetch()}
          emptyIcon="fa-receipt"
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
          <div className="flex flex-col gap-2 w-full">
            <div className="flex gap-2">
              <Button variant="success" loading={isSharing} onClick={handleShareReceipt} className="flex-1 min-w-0">
                {!isSharing && <Icon name="whatsapp" size={14} className="mr-1 inline" />}
                {isSharing ? "Gerando..." : "Compartilhar"}
              </Button>
              <Button variant="primary" icon="fa-print" loading={isPrintingReceipt} onClick={handleSilentPrint} className="flex-1 min-w-0">
                {isPrintingReceipt ? "Imprimindo..." : "Reimprimir"}
              </Button>
            </div>
            <Button variant="secondary" onClick={() => setShowReceiptModal(false)} fullWidth>
              Fechar
            </Button>
          </div>
        }
      >
        <div className="relative">
          {/* Mobile: recibo digital amigável */}
          <div className="lg:hidden">
            <MobileReceipt sale={selectedSale} items={saleItems} />
          </div>
          {/* Desktop: cupom térmico. No mobile fica fora da tela (renderizado) para compartilhar/imprimir. */}
          <div className="flex w-full justify-center bg-surface-200 p-4 rounded-xl absolute -left-[9999px] top-0 lg:static lg:left-auto lg:top-auto">
            <div id="cupom-fiscal-wrapper" className="bg-white p-2 shadow-sm rounded">
              <CupomFiscal sale={selectedSale} items={saleItems} />
            </div>
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
            <Button variant="secondary" onClick={() => setShowCancelModal(false)} className="flex-1">
              Voltar
            </Button>
            <Button variant="destructive" loading={isCancellingSale} onClick={handleSubmitCancel} className="flex-[2]">
              {isCancellingSale ? "Cancelando..." : "Confirmar cancelamento"}
            </Button>
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
