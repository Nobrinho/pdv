// @ts-nocheck
import React, { useState, useEffect, useMemo, useCallback } from "react";
import dayjs from "dayjs";
import { useAlert } from "../context/AlertSystem";
import { api } from "../services/api";
import { formatCurrency } from "../utils/format";
import DataTable from "../components/ui/DataTable";
import FormField from "../components/ui/FormField";
import StatCard from "../components/ui/StatCard";
import { buildDateRangeTimestamps, getPeriodRange } from "../utils/dateFilters";

const Servicos = () => {
  const { showAlert } = useAlert();

  // Dados Gerais
  const [services, setServices] = useState([]);
  const [mechanics, setMechanics] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalRecords, setTotalRecords] = useState(0);
  const LIMIT = 100;

  // Estado do Formulário (Registro)
  const [formData, setFormData] = useState({
    trocadorId: "",
    descricao: "",
    valor: "",
  });

  // Filtros Avançados
  const [periodType, setPeriodType] = useState("weekly");
  const [startDate, setStartDate] = useState(
    dayjs().startOf("week").format("YYYY-MM-DD"),
  );
  const [endDate, setEndDate] = useState(
    dayjs().endOf("week").format("YYYY-MM-DD"),
  );
  const [selectedMechanicFilter, setSelectedMechanicFilter] = useState("all");

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const { startTimestamp, endTimestamp } = buildDateRangeTimestamps(
        startDate,
        endDate,
      );

      const [servicesData, peopleData] = await Promise.all([
        api.services.list({
          page,
          limit: LIMIT,
          startDate: startTimestamp,
          endDate: endTimestamp,
          trocadorId: selectedMechanicFilter && selectedMechanicFilter !== "all" ? selectedMechanicFilter : undefined,
        }),
        api.people.list()
      ]);

      const servicesList = Array.isArray(servicesData) ? servicesData : (servicesData?.data || []);
      setServices(servicesList.sort((a, b) => b.data_servico - a.data_servico));
      setTotalPages(Array.isArray(servicesData) ? 0 : (servicesData?.totalPages || 0));
      setTotalRecords(Array.isArray(servicesData) ? servicesList.length : (servicesData?.total || 0));
      setMechanics(peopleData.filter((p) => p.cargo_nome === "Trocador"));
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      showAlert("Erro ao conectar com o banco de dados.", "Erro", "error");
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, selectedMechanicFilter, showAlert, page]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    if (!formData.trocadorId || !formData.valor) {
      return showAlert("Preencha todos os campos obrigatórios!", "Atenção", "warning");
    }

    const serviceData = {
      trocador_id: parseInt(formData.trocadorId),
      descricao: (formData.descricao || "").trim(),
      valor: parseFloat(formData.valor),
      forma_pagamento: "Saída",
    };

    try {
      const result = await api.services.create(serviceData);
      if (result.success) {
        showAlert("Serviço registrado com sucesso!", "Sucesso", "success");
        setFormData({ ...formData, descricao: "", valor: "" });
        loadData();
      } else {
        showAlert("Erro ao registrar: " + result.error, "Erro", "error");
      }
    } catch (err) {
      showAlert("Erro técnico ao salvar.", "Erro", "error");
    }
  };

  const handlePeriodChange = (type) => {
    setPeriodType(type);
    setPage(1);
    const range = getPeriodRange(type);
    if (range) {
      setStartDate(range.startDate);
      setEndDate(range.endDate);
    }
  };

  const filteredServices = useMemo(() => {
    return services;
  }, [services]);

  const reportSummary = useMemo(() => {
    const totalValue = filteredServices.reduce((acc, curr) => acc + curr.valor, 0);
    return {
      totalCount: filteredServices.length,
      totalValue: totalValue,
    };
  }, [filteredServices]);

  const columns = [
    { 
      key: "data_servico", 
      label: "Data", 
      format: (val) => dayjs(val).format("DD/MM/YYYY HH:mm") 
    },
    { 
      key: "trocador_nome", 
      label: "Responsável",
      format: (val) => val ? (
        <span className="bg-surface-200 text-surface-800 px-2 py-0.5 rounded text-[10px] font-bold border border-surface-200 uppercase">
          {val}
        </span>
      ) : <span className="text-red-400 text-xs italic">Excluído</span>
    },
    { key: "descricao", label: "Descrição" },
    { 
      key: "valor", 
      label: "Valor Pago", 
      align: "right", 
      format: (val) => <span className="font-bold text-orange-600">{formatCurrency(val)}</span>
    }
  ];

  return (
    <div className="p-4 md:p-6 h-full flex flex-col overflow-hidden bg-surface-50">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-surface-800 tracking-tight">Gestão de Serviços</h1>
          <p className="text-xs text-surface-500 mt-1">Controle de pagamentos de mão de obra e serviços extras.</p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 h-full overflow-hidden">
        {/* --- COLUNA ESQUERDA: REGISTRO --- */}
        <div className="w-full lg:w-80 xl:w-96 bg-surface-100 p-6 rounded-2xl shadow-sm h-fit border border-surface-200 shrink-0">
          <h2 className="text-sm font-black mb-6 text-surface-800 uppercase tracking-widest border-b pb-4 flex items-center gap-2">
            <i className="fas fa-plus-circle text-primary-600"></i> Novo Registro
          </h2>
          <form onSubmit={handleRegisterSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] font-black text-surface-400 uppercase tracking-widest mb-1 ml-1">
                Responsável (Trocador)
              </label>
              <select
                className="w-full border border-surface-300 rounded-xl p-2.5 bg-surface-50 focus:ring-2 focus:ring-primary-100 focus:border-primary-400 outline-none transition text-sm font-medium"
                value={formData.trocadorId}
                onChange={(e) => setFormData({ ...formData, trocadorId: e.target.value })}
                required
              >
                <option value="">Selecione...</option>
                {mechanics.map((m) => (
                  <option key={m.id} value={m.id}>{m.nome}</option>
                ))}
              </select>
            </div>

            <FormField
              label="Descrição do Serviço"
              placeholder="Ex: Troca de óleo, Regulagem..."
              value={formData.descricao}
              onChange={(val) => setFormData({ ...formData, descricao: val })}
            />

            <FormField
              label="Valor (Saída de Caixa)"
              type="number"
              icon="fa-hand-holding-dollar"
              value={formData.valor}
              onChange={(val) => setFormData({ ...formData, valor: val })}
              required
            />

            <button
              type="submit"
              className="w-full bg-primary-600 text-white py-3.5 rounded-xl font-black text-sm hover:bg-primary-700 transition mt-4 shadow-md active:scale-95 flex justify-center items-center gap-2"
            >
              <i className="fas fa-check"></i> REGISTRAR SERVIÇO
            </button>
          </form>
        </div>

        {/* --- COLUNA DIREITA: RELATÓRIO --- */}
        <div className="flex-1 flex flex-col h-full overflow-hidden gap-4">
          <div className="bg-surface-100 p-4 rounded-2xl shadow-sm border border-surface-200 flex flex-col gap-4">
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

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
              <FormField
                label="Início"
                type="date"
                value={startDate}
                onChange={(val) => { setStartDate(val); setPeriodType("custom"); setPage(1); }}
              />
              <FormField
                label="Fim"
                type="date"
                value={endDate}
                onChange={(val) => { setEndDate(val); setPeriodType("custom"); setPage(1); }}
              />
              <div>
                <label className="text-[10px] font-black text-surface-400 uppercase tracking-widest mb-1 block ml-1">Mecânico</label>
                <select
                  className="w-full border border-surface-300 rounded-xl p-2.5 text-sm font-medium focus:ring-2 focus:ring-primary-100 outline-none bg-surface-100 transition-all"
                  value={selectedMechanicFilter}
                  onChange={(e) => { setSelectedMechanicFilter(e.target.value); setPage(1); }}
                >
                  <option value="all">Todos os Profissionais</option>
                  {mechanics.map((m) => (
                    <option key={m.id} value={m.id}>{m.nome}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <StatCard
              title="Qtd. Serviços"
              value={reportSummary.totalCount}
              format={(v) => `${v} registros`}
              color="blue"
              icon="fa-clipboard-list"
            />
            <StatCard
              title="Total Pago (Saída)"
              value={reportSummary.totalValue}
              color="orange"
              icon="fa-hand-holding-usd"
            />
          </div>

          <div className="flex-1 overflow-hidden flex flex-col">
            <DataTable 
              columns={columns} 
              data={filteredServices} 
              loading={loading}
              emptyMessage="Nenhum serviço registrado para este período."
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
        </div>
      </div>
    </div>
  );
};

export default Servicos;
