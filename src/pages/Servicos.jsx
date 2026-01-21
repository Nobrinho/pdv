// @ts-nocheck
import React, { useState, useEffect } from "react";
import dayjs from "dayjs";
import { useAlert } from "../context/AlertSystem";

const Servicos = () => {
  // Hook de Alerta Global
  const { showAlert } = useAlert();

  // Dados Gerais
  const [services, setServices] = useState([]);
  const [mechanics, setMechanics] = useState([]);

  // Estado do Formulário (Registro)
  // Removido o campo 'pagamento'
  const [formData, setFormData] = useState({
    trocadorId: "",
    descricao: "",
    valor: "",
  });

  // Estado do Relatório (Filtros e Resultados)
  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
    mechanicId: "",
  });
  const [filteredServices, setFilteredServices] = useState([]);
  const [reportSummary, setReportSummary] = useState({
    totalCount: 0,
    totalValue: 0,
  });

  // --- FORMATAÇÃO BANCÁRIA (R$ 1.000,00) ---
  const formatCurrency = (val) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(val || 0);
  };

  // Carregar dados iniciais
  useEffect(() => {
    loadData();
  }, []);

  // Atualizar lista filtrada quando filtros ou dados mudam
  useEffect(() => {
    applyFilters();
  }, [filters, services]);

  const loadData = async () => {
    try {
      const servicesData = await window.api.getServices();
      const peopleData = await window.api.getPeople();

      // Ordenar serviços do mais recente para o mais antigo
      const sortedServices = servicesData.sort(
        (a, b) => b.data_servico - a.data_servico,
      );

      setServices(sortedServices);

      // Filtra apenas quem tem cargo de "Trocador"
      setMechanics(peopleData.filter((p) => p.cargo_nome === "Trocador"));
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      showAlert(
        "Erro de conexão com o banco de dados.",
        "Erro Técnico",
        "error",
      );
    }
  };

  // --- LÓGICA DE REGISTRO ---
  const handleRegisterSubmit = async (e) => {
    e.preventDefault();

    if (!formData.trocadorId || !formData.descricao || !formData.valor) {
      return showAlert(
        "Preencha todos os campos obrigatórios!",
        "Atenção",
        "warning",
      );
    }

    const serviceData = {
      trocador_id: parseInt(formData.trocadorId),
      descricao: formData.descricao,
      valor: parseFloat(formData.valor),
      forma_pagamento: "Saída", // Definido fixo internamente como saída de caixa
    };

    try {
      const result = await window.api.createService(serviceData);

      if (result.success) {
        showAlert("Serviço registrado com sucesso!", "Sucesso", "success");
        // Limpar campos
        setFormData({ ...formData, descricao: "", valor: "" });
        // Recarregar dados
        loadData();
      } else {
        showAlert("Erro ao registrar: " + result.error, "Erro", "error");
      }
    } catch (err) {
      console.error(err);
      showAlert("Erro técnico ao salvar.", "Erro", "error");
    }
  };

  // --- LÓGICA DE RELATÓRIO ---
  const applyFilters = () => {
    let result = services;

    // Filtro de Data
    if (filters.startDate) {
      result = result.filter((s) =>
        dayjs(s.data_servico).isAfter(
          dayjs(filters.startDate).subtract(1, "day"),
        ),
      );
    }
    if (filters.endDate) {
      result = result.filter((s) =>
        dayjs(s.data_servico).isBefore(dayjs(filters.endDate).add(1, "day")),
      );
    }

    // Filtro de Responsável
    if (filters.mechanicId && filters.mechanicId !== "all") {
      result = result.filter(
        (s) => s.trocador_id === parseInt(filters.mechanicId),
      );
    }

    setFilteredServices(result);
    updateSummary(result);
  };

  const updateSummary = (data) => {
    const totalValue = data.reduce((acc, curr) => acc + curr.valor, 0);
    setReportSummary({
      totalCount: data.length,
      totalValue: totalValue,
    });
  };

  const clearFilters = () => {
    setFilters({ startDate: "", endDate: "", mechanicId: "" });
  };

  return (
    <div className="p-6 h-full flex flex-col overflow-hidden">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Gestão de Serviços</h1>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 h-full overflow-hidden">
        {/* COLUNA ESQUERDA: REGISTRO */}
        <div className="w-full lg:w-1/3 bg-white p-6 rounded-xl shadow-md h-fit overflow-y-auto border border-gray-100">
          <h2 className="text-lg font-bold mb-6 text-gray-800 border-b pb-3 flex items-center">
            <i className="fas fa-plus-circle text-blue-600 mr-2"></i> Novo
            Registro
          </h2>
          <form onSubmit={handleRegisterSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Responsável (Trocador)
              </label>
              <select
                className="w-full border border-gray-300 rounded-lg p-2.5 bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                value={formData.trocadorId}
                onChange={(e) =>
                  setFormData({ ...formData, trocadorId: e.target.value })
                }
                required
              >
                <option value="">Selecione...</option>
                {mechanics.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nome}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Descrição do Serviço
              </label>
              <textarea
                className="w-full border border-gray-300 rounded-lg p-2.5 shadow-sm focus:ring-2 focus:ring-blue-500 outline-none transition"
                rows="3"
                placeholder="Ex: Troca de óleo, Regulagem..."
                value={formData.descricao}
                onChange={(e) =>
                  setFormData({ ...formData, descricao: e.target.value })
                }
                required
              ></textarea>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Valor (R$)
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="w-full border border-gray-300 rounded-lg p-2.5 pl-3 text-lg font-bold text-gray-800 shadow-sm focus:ring-2 focus:ring-green-500 outline-none"
                  placeholder="0.00"
                  value={formData.valor}
                  onChange={(e) =>
                    setFormData({ ...formData, valor: e.target.value })
                  }
                  required
                />
                <span className="absolute right-3 top-3 text-gray-400 text-sm font-medium">
                  BRL
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                * Valor a ser pago ao profissional.
              </p>
            </div>

            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-3.5 rounded-lg font-bold hover:bg-blue-700 transition mt-4 shadow-lg hover:shadow-xl flex justify-center items-center gap-2 transform active:scale-95"
            >
              <i className="fas fa-check"></i> SALVAR SERVIÇO
            </button>
          </form>
        </div>

        {/* COLUNA DIREITA: RELATÓRIO E LISTAGEM */}
        <div className="flex-1 flex flex-col h-full overflow-hidden gap-4">
          {/* Filtros */}
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide flex items-center">
                <i className="fas fa-filter mr-2"></i> Filtros de Relatório
              </h2>
              <button
                onClick={clearFilters}
                className="text-xs text-blue-600 hover:text-blue-800 hover:underline"
              >
                Limpar Filtros
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">
                  Data Início
                </label>
                <input
                  type="date"
                  className="w-full border border-gray-300 rounded p-1.5 text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                  value={filters.startDate}
                  onChange={(e) =>
                    setFilters({ ...filters, startDate: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">
                  Data Fim
                </label>
                <input
                  type="date"
                  className="w-full border border-gray-300 rounded p-1.5 text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                  value={filters.endDate}
                  onChange={(e) =>
                    setFilters({ ...filters, endDate: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">
                  Responsável
                </label>
                <select
                  className="w-full border border-gray-300 rounded p-1.5 text-sm focus:ring-1 focus:ring-blue-500 outline-none bg-white"
                  value={filters.mechanicId}
                  onChange={(e) =>
                    setFilters({ ...filters, mechanicId: e.target.value })
                  }
                >
                  <option value="all">Todos</option>
                  {mechanics.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.nome}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Cards de Resumo */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-blue-500 flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 font-bold uppercase mb-1">
                  Total de Serviços
                </p>
                <p className="text-2xl font-bold text-gray-800">
                  {reportSummary.totalCount}
                </p>
              </div>
              <div className="bg-blue-100 p-3 rounded-full text-blue-600">
                <i className="fas fa-clipboard-list fa-lg"></i>
              </div>
            </div>
            <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-green-500 flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 font-bold uppercase mb-1">
                  Valor Gerado
                </p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(reportSummary.totalValue)}
                </p>
              </div>
              <div className="bg-green-100 p-3 rounded-full text-green-600">
                <i className="fas fa-dollar-sign fa-lg"></i>
              </div>
            </div>
          </div>

          {/* Tabela de Resultados */}
          <div className="bg-white rounded-xl shadow-md overflow-hidden flex-1 flex flex-col border border-gray-100">
            <div className="p-3 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
              <h3 className="font-bold text-gray-700 text-sm pl-2">
                Histórico de Serviços
              </h3>
              <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded border">
                {filteredServices.length} registros
              </span>
            </div>
            <div className="overflow-y-auto flex-1 p-0">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Data
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Responsável
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Descrição
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Valor
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredServices.map((service) => (
                    <tr
                      key={service.id}
                      className="hover:bg-blue-50 transition-colors"
                    >
                      <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-500">
                        {dayjs(service.data_servico).format("DD/MM/YYYY HH:mm")}
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap text-sm font-medium text-gray-800">
                        {service.trocador_nome ? (
                          <span className="bg-gray-100 text-gray-800 px-2 py-0.5 rounded text-xs">
                            {service.trocador_nome}
                          </span>
                        ) : (
                          <span className="text-red-400 text-xs">Excluído</span>
                        )}
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-600">
                        {service.descricao}
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap text-sm text-right font-bold text-green-600">
                        {formatCurrency(service.valor)}
                      </td>
                    </tr>
                  ))}
                  {filteredServices.length === 0 && (
                    <tr>
                      <td
                        colSpan="4"
                        className="px-6 py-12 text-center text-gray-400 bg-gray-50"
                      >
                        <i className="fas fa-search mb-2 text-2xl block opacity-50"></i>
                        Nenhum serviço encontrado para este filtro.
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

export default Servicos;
