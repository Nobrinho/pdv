import React, { useState, useEffect } from "react";
import dayjs from "dayjs";

const Servicos = () => {
  // Dados Gerais
  const [services, setServices] = useState([]);
  const [mechanics, setMechanics] = useState([]);

  // Estado do Formulário (Registro)
  const [formData, setFormData] = useState({
    trocadorId: "",
    descricao: "",
    valor: "",
    pagamento: "Dinheiro",
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

  // Carregar dados iniciais
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const servicesData = await window.api.getServices();
    const peopleData = await window.api.getPeople();

    // Ordenar serviços do mais recente para o mais antigo
    const sortedServices = servicesData.sort(
      (a, b) => b.data_servico - a.data_servico
    );

    setServices(sortedServices);
    setFilteredServices(sortedServices); // Inicialmente mostra tudo
    updateSummary(sortedServices);

    // Filtra apenas quem tem cargo de "Trocador"
    setMechanics(peopleData.filter((p) => p.cargo_nome === "Trocador"));
  };

  // --- LÓGICA DE REGISTRO ---
  const handleRegisterSubmit = async (e) => {
    e.preventDefault();

    if (!formData.trocadorId || !formData.descricao || !formData.valor) {
      return alert("Preencha todos os campos obrigatórios!");
    }

    const serviceData = {
      trocador_id: parseInt(formData.trocadorId),
      descricao: formData.descricao,
      valor: parseFloat(formData.valor),
      forma_pagamento: formData.pagamento,
    };

    const result = await window.api.createService(serviceData);

    if (result.success) {
      alert("Serviço registrado com sucesso!");
      // Limpar campos
      setFormData({ ...formData, descricao: "", valor: "" });
      // Recarregar lista
      loadData();
    } else {
      alert("Erro ao registrar: " + result.error);
    }
  };

  // --- LÓGICA DE RELATÓRIO ---
  const applyFilters = () => {
    let result = services;

    // Filtro de Data
    if (filters.startDate) {
      result = result.filter((s) =>
        dayjs(s.data_servico).isAfter(
          dayjs(filters.startDate).subtract(1, "day")
        )
      );
    }
    if (filters.endDate) {
      result = result.filter((s) =>
        dayjs(s.data_servico).isBefore(dayjs(filters.endDate).add(1, "day"))
      );
    }

    // Filtro de Responsável
    if (filters.mechanicId && filters.mechanicId !== "all") {
      result = result.filter(
        (s) => s.trocador_id === parseInt(filters.mechanicId)
      );
    }

    setFilteredServices(result);
    updateSummary(result);
  };

  const clearFilters = () => {
    setFilters({ startDate: "", endDate: "", mechanicId: "" });
    setFilteredServices(services);
    updateSummary(services);
  };

  const updateSummary = (data) => {
    const totalValue = data.reduce((acc, curr) => acc + curr.valor, 0);
    setReportSummary({
      totalCount: data.length,
      totalValue: totalValue,
    });
  };

  return (
    <div className="p-6 h-full flex flex-col overflow-hidden">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Gestão de Serviços</h1>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 h-full overflow-hidden">
        {/* COLUNA ESQUERDA: REGISTRO */}
        <div className="w-full lg:w-1/3 bg-white p-6 rounded-xl shadow-md h-fit overflow-y-auto">
          <h2 className="text-lg font-bold mb-4 text-gray-800 border-b pb-2 flex items-center">
            <i className="fas fa-plus-circle text-blue-600 mr-2"></i> Novo
            Registro
          </h2>
          <form onSubmit={handleRegisterSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Responsável (Trocador)
              </label>
              <select
                className="mt-1 block w-full border border-gray-300 rounded-lg p-2.5 bg-gray-50 focus:ring-blue-500 focus:border-blue-500"
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
              <label className="block text-sm font-medium text-gray-700">
                Descrição do Serviço
              </label>
              <textarea
                className="mt-1 block w-full border border-gray-300 rounded-lg p-2.5 shadow-sm focus:ring-blue-500 focus:border-blue-500"
                rows="3"
                placeholder="Ex: Troca de óleo..."
                value={formData.descricao}
                onChange={(e) =>
                  setFormData({ ...formData, descricao: e.target.value })
                }
                required
              ></textarea>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Valor (R$)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                className="mt-1 block w-full border border-gray-300 rounded-lg p-2.5 text-lg font-bold text-blue-600 shadow-sm"
                placeholder="0.00"
                value={formData.valor}
                onChange={(e) =>
                  setFormData({ ...formData, valor: e.target.value })
                }
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Forma de Pagamento
              </label>
              <select
                className="mt-1 block w-full border border-gray-300 rounded-lg p-2.5 bg-white"
                value={formData.pagamento}
                onChange={(e) =>
                  setFormData({ ...formData, pagamento: e.target.value })
                }
              >
                <option>Dinheiro</option>
                <option>PIX</option>
                <option>Cartão Débito</option>
                <option>Cartão Crédito 1x</option>
              </select>
            </div>

            <button
              type="submit"
              className="w-full bg-green-600 text-white py-3 rounded-lg font-bold hover:bg-green-700 transition mt-4 shadow-md flex justify-center items-center gap-2"
            >
              <i className="fas fa-check"></i> SALVAR SERVIÇO
            </button>
          </form>
        </div>

        {/* COLUNA DIREITA: RELATÓRIO E LISTAGEM */}
        <div className="flex-1 flex flex-col h-full overflow-hidden gap-4">
          {/* Filtros */}
          <div className="bg-white p-4 rounded-xl shadow-sm">
            <h2 className="text-sm font-bold text-gray-500 uppercase mb-3">
              Filtros de Relatório
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-gray-500">Data Início</label>
                <input
                  type="date"
                  className="w-full border rounded p-1 text-sm"
                  value={filters.startDate}
                  onChange={(e) =>
                    setFilters({ ...filters, startDate: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="text-xs text-gray-500">Data Fim</label>
                <input
                  type="date"
                  className="w-full border rounded p-1 text-sm"
                  value={filters.endDate}
                  onChange={(e) =>
                    setFilters({ ...filters, endDate: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="text-xs text-gray-500">Responsável</label>
                <select
                  className="w-full border rounded p-1 text-sm"
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
            <div className="flex justify-end gap-2 mt-3">
              <button
                onClick={clearFilters}
                className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1"
              >
                Limpar
              </button>
              <button
                onClick={applyFilters}
                className="bg-blue-600 text-white text-sm px-4 py-1.5 rounded hover:bg-blue-700 font-medium"
              >
                Filtrar
              </button>
            </div>
          </div>

          {/* Cards de Resumo */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-blue-500">
              <p className="text-xs text-gray-500 font-bold uppercase">
                Total de Serviços
              </p>
              <p className="text-2xl font-bold text-gray-800">
                {reportSummary.totalCount}
              </p>
            </div>
            <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-green-500">
              <p className="text-xs text-gray-500 font-bold uppercase">
                Valor Gerado
              </p>
              <p className="text-2xl font-bold text-green-600">
                R$ {reportSummary.totalValue.toFixed(2)}
              </p>
            </div>
          </div>

          {/* Tabela de Resultados */}
          <div className="bg-white rounded-xl shadow-md overflow-hidden flex-1 flex flex-col">
            <div className="p-3 bg-gray-50 border-b border-gray-200">
              <h3 className="font-bold text-gray-700 text-sm">
                Histórico de Serviços
              </h3>
            </div>
            <div className="overflow-y-auto flex-1">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Data
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Responsável
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Descrição
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      Valor
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredServices.map((service) => (
                    <tr key={service.id} className="hover:bg-blue-50">
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        {dayjs(service.data_servico).format("DD/MM/YYYY HH:mm")}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                        {service.trocador_nome || (
                          <span className="text-red-400">Excluído</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {service.descricao}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-bold text-green-600">
                        R$ {service.valor.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                  {filteredServices.length === 0 && (
                    <tr>
                      <td
                        colSpan="4"
                        className="px-6 py-10 text-center text-gray-400"
                      >
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
