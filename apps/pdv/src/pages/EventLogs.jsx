// @ts-nocheck
import React, { useCallback, useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import { api } from "../services/api";
import { useAlert } from "../context/AlertSystem";
import { buildDateRangeTimestamps } from "../utils/dateFilters";
import DataTable from "../components/ui/DataTable";
import FormField from "../components/ui/FormField";
import StatusBadge from "../components/ui/StatusBadge";
import Modal from "../components/ui/Modal";

const safeParsePayload = (raw) => {
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return { raw };
  }
};

const EventLogs = () => {
  const { showAlert } = useAlert();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalRecords, setTotalRecords] = useState(0);
  const LIMIT = 100;

  const [filters, setFilters] = useState({
    startDate: dayjs().startOf("day").format("YYYY-MM-DD"),
    endDate: dayjs().format("YYYY-MM-DD"),
    eventCategory: "all",
    severity: "all",
    searchTerm: "",
  });

  const [selectedLog, setSelectedLog] = useState(null);
  const [showDetails, setShowDetails] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const { startTimestamp, endTimestamp } = buildDateRangeTimestamps(
        filters.startDate,
        filters.endDate,
      );
      const result = await api.events.list({
        page,
        limit: LIMIT,
        startDate: startTimestamp,
        endDate: endTimestamp,
        eventCategory: filters.eventCategory,
        severity: filters.severity,
        searchTerm: filters.searchTerm || undefined,
      });
      setLogs(result.data || []);
      setTotalPages(result.totalPages || 0);
      setTotalRecords(result.total || 0);
    } catch (err) {
      showAlert("Erro ao carregar logs de eventos.", "Erro", "error");
    } finally {
      setLoading(false);
    }
  }, [filters, page, showAlert]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const severityType = useMemo(
    () => ({
      info: "info",
      warning: "warning",
      error: "danger",
      success: "success",
    }),
    [],
  );

  const columns = [
    {
      key: "occurred_at_ms",
      label: "Data/Hora",
      format: (v) => dayjs(Number(v)).format("DD/MM/YYYY HH:mm:ss"),
    },
    { key: "user_name", label: "Usuário", format: (v) => v || "-" },
    { key: "screen", label: "Tela", format: (v) => v || "-" },
    { key: "event_type", label: "Evento", bold: true },
    { key: "action", label: "Ação", format: (v) => v || "-" },
    { key: "target_id", label: "Alvo", format: (v) => v || "-" },
    {
      key: "severity",
      label: "Status",
      align: "center",
      format: (v) => <StatusBadge type={severityType[v] || "secondary"} label={(v || "info").toUpperCase()} />,
    },
    {
      key: "id",
      label: "Detalhes",
      align: "center",
      format: (_, row) => (
        <button
          onClick={() => {
            setSelectedLog(row);
            setShowDetails(true);
          }}
          className="text-primary-600 hover:bg-primary-50 p-2 rounded-lg transition active:scale-90"
          title="Ver detalhes"
        >
          <i className="fas fa-eye"></i>
        </button>
      ),
    },
  ];

  return (
    <div className="p-4 md:p-6 h-full flex flex-col bg-surface-50 overflow-hidden">
      <div className="mb-6">
        <h1 className="text-xl md:text-2xl font-black text-surface-800 tracking-tight">Logs de Eventos</h1>
        <p className="text-xs text-surface-500 mt-1">Rastreamento de navegação, cliques e ações do sistema.</p>
      </div>

      <div className="bg-surface-100 p-4 rounded-2xl shadow-sm border border-surface-200 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
          <FormField label="Início" type="date" value={filters.startDate} onChange={(v) => { setFilters((f) => ({ ...f, startDate: v })); setPage(1); }} />
          <FormField label="Fim" type="date" value={filters.endDate} onChange={(v) => { setFilters((f) => ({ ...f, endDate: v })); setPage(1); }} />
          <div>
            <label className="text-[10px] font-black text-surface-400 uppercase tracking-widest mb-1 ml-1 block">Categoria</label>
            <select className="w-full border border-surface-300 rounded-xl p-2.5 text-sm font-medium outline-none bg-surface-100" value={filters.eventCategory} onChange={(e) => { setFilters((f) => ({ ...f, eventCategory: e.target.value })); setPage(1); }}>
              <option value="all">Todas</option>
              <option value="navigation">Navegação</option>
              <option value="ui_click">Cliques</option>
              <option value="domain_action">Ações</option>
              <option value="system">Sistema</option>
              <option value="error">Erros</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] font-black text-surface-400 uppercase tracking-widest mb-1 ml-1 block">Severidade</label>
            <select className="w-full border border-surface-300 rounded-xl p-2.5 text-sm font-medium outline-none bg-surface-100" value={filters.severity} onChange={(e) => { setFilters((f) => ({ ...f, severity: e.target.value })); setPage(1); }}>
              <option value="all">Todas</option>
              <option value="info">Info</option>
              <option value="warning">Warning</option>
              <option value="error">Error</option>
              <option value="success">Success</option>
            </select>
          </div>
          <FormField label="Busca" placeholder="Evento, tela, alvo..." value={filters.searchTerm} onChange={(v) => { setFilters((f) => ({ ...f, searchTerm: v })); setPage(1); }} icon="fa-search" />
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col">
        <DataTable columns={columns} data={logs} loading={loading} emptyMessage="Nenhum evento encontrado para os filtros selecionados." />
        {totalPages > 1 && (
          <div className="p-4 border-t border-surface-50 bg-surface-50/30 flex justify-between items-center shrink-0">
            <span className="text-[10px] font-black text-surface-400 uppercase tracking-widest">
              Pag {page} de {totalPages} • {totalRecords} total
            </span>
            <div className="flex gap-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="bg-surface-100 border border-surface-200 text-surface-600 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-surface-200 disabled:opacity-30">Anterior</button>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="bg-surface-100 border border-surface-200 text-surface-600 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-surface-200 disabled:opacity-30">Próximo</button>
            </div>
          </div>
        )}
      </div>

      <Modal
        isOpen={showDetails}
        onClose={() => setShowDetails(false)}
        title="Detalhes do Evento"
        icon="fa-file-alt"
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><span className="font-bold">Data/Hora:</span> {selectedLog ? dayjs(Number(selectedLog.occurred_at_ms)).format("DD/MM/YYYY HH:mm:ss") : "-"}</div>
            <div><span className="font-bold">Evento:</span> {selectedLog?.event_type || "-"}</div>
            <div><span className="font-bold">Tela:</span> {selectedLog?.screen || "-"}</div>
            <div><span className="font-bold">Usuário:</span> {selectedLog?.user_name || "-"}</div>
            <div><span className="font-bold">Ação:</span> {selectedLog?.action || "-"}</div>
            <div><span className="font-bold">Alvo:</span> {selectedLog?.target_id || "-"}</div>
          </div>
          <div>
            <div className="text-xs font-black text-surface-500 uppercase mb-2">Payload</div>
            <pre className="bg-surface-50 border border-surface-200 rounded-xl p-3 text-xs overflow-auto max-h-80">
{JSON.stringify(safeParsePayload(selectedLog?.payload_json), null, 2)}
            </pre>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default EventLogs;
