// @ts-nocheck
import React, { useState, useEffect, useMemo } from "react";
import dayjs from "dayjs";
import "dayjs/locale/pt-br"; // Importante para datas em PT-BR
import { useAlert } from "../context/AlertSystem";
import CupomFiscal from "../components/CupomFiscal";

// Configura locale
dayjs.locale("pt-br");

const Recibos = () => {
  const { showAlert } = useAlert();

  const [sales, setSales] = useState([]);
  const [filteredSales, setFilteredSales] = useState([]);
  const [sellers, setSellers] = useState([]);
  const [clients, setClients] = useState([]);
  const [companyInfo, setCompanyInfo] = useState(null);

  // Filtros de Data e Período (Padrão: Semana Atual)
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
  const [cancelData, setCancelData] = useState({
    adminUser: "",
    adminPass: "",
    reason: "",
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [filters, sales]);

  const loadData = async () => {
    try {
      const salesData = await window.api.getSales();
      const peopleData = await window.api.getPeople();
      const clientsData = await window.api.getClients();
      const companyData = await window.api.getCompanyInfo();

      // Ordenar decrescente por data
      setSales(salesData.sort((a, b) => b.data_venda - a.data_venda));
      setFilteredSales(salesData);
      setSellers(peopleData.filter((p) => p.cargo_nome === "Vendedor"));
      setClients(clientsData || []);
      setCompanyInfo(companyData);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    }
  };

  // --- FILTROS RÁPIDOS ---
  const handlePeriodChange = (type) => {
    setPeriodType(type);
    const now = dayjs();

    let newStart = filters.startDate;
    let newEnd = filters.endDate;

    if (type === "weekly") {
      newStart = now.startOf("week").format("YYYY-MM-DD");
      newEnd = now.endOf("week").format("YYYY-MM-DD");
    } else if (type === "monthly") {
      newStart = now.startOf("month").format("YYYY-MM-DD");
      newEnd = now.endOf("month").format("YYYY-MM-DD");
    } else if (type === "yearly") {
      newStart = now.startOf("year").format("YYYY-MM-DD");
      newEnd = now.endOf("year").format("YYYY-MM-DD");
    }

    setFilters((prev) => ({ ...prev, startDate: newStart, endDate: newEnd }));
  };

  // Lógica robusta de verificação de intervalo de datas (00:00 - 23:59)
  const isWithinRange = (timestamp) => {
    const start = dayjs(filters.startDate).startOf("day");
    const end = dayjs(filters.endDate).endOf("day");
    const dateToCheck = dayjs(timestamp);
    return (
      dateToCheck.isSame(start) ||
      dateToCheck.isSame(end) ||
      (dateToCheck.isAfter(start) && dateToCheck.isBefore(end))
    );
  };

  const applyFilters = () => {
    let result = sales;

    // Filtro Data (Corrigido)
    result = result.filter((s) => isWithinRange(s.data_venda));

    // Filtro Vendedor
    if (filters.sellerId && filters.sellerId !== "all") {
      result = result.filter(
        (s) => s.vendedor_id === parseInt(filters.sellerId),
      );
    }

    // Filtro Cliente
    if (filters.clientId && filters.clientId !== "all") {
      result = result.filter(
        (s) => s.cliente_id === parseInt(filters.clientId),
      );
    }

    setFilteredSales(result);
  };

  // --- BUSCA DE CLIENTE ---
  const filteredClientsList = useMemo(() => {
    if (!clientSearchTerm) return [];
    const lower = clientSearchTerm.toLowerCase();
    return clients
      .filter(
        (c) =>
          c.nome.toLowerCase().includes(lower) ||
          (c.documento && c.documento.includes(lower)) ||
          (c.telefone && c.telefone.includes(lower)),
      )
      .slice(0, 10);
  }, [clientSearchTerm, clients]);

  const handleSelectClient = (client) => {
    if (client) {
      setFilters({ ...filters, clientId: client.id });
      setClientSearchTerm(client.nome);
    } else {
      setFilters({ ...filters, clientId: "" });
      setClientSearchTerm("");
    }
    setShowClientResults(false);
  };

  const getClientName = (id) => {
    if (!id) return "Consumidor Final";
    const client = clients.find((c) => c.id === id);
    return client ? client.nome : "Desconhecido";
  };

  // --- AÇÕES ---
  const handleViewReceipt = async (sale) => {
    const items = await window.api.getSaleItems(sale.id);
    const saleWithClientName = {
      ...sale,
      cliente_nome: getClientName(sale.cliente_id),
    };
    setSelectedSale(saleWithClientName);
    setSaleItems(items);
    setShowReceiptModal(true);
  };

  const handleSilentPrint = async () => {
    const receiptElement = document.getElementById("cupom-fiscal");
    if (!receiptElement) {
      return showAlert("Erro interno: Cupom não encontrado.", "Erro", "error");
    }
    // Pega o HTML externo, incluindo o ID wrapper se o componente não tiver
    const receiptContent = receiptElement.innerHTML; // ou outerHTML dependendo de como o CupomFiscal renderiza
    const printerName = await window.api.getConfig("impressora_padrao");
    const result = await window.api.printSilent(
      receiptElement.outerHTML,
      printerName,
    );

    if (result.success) {
      showAlert("Enviado para impressão.", "Sucesso", "success");
    } else {
      showAlert("Erro na impressão: " + result.error, "Erro", "error");
    }
  };

  const initiateCancel = (sale) => {
    if (sale.cancelada) return;
    setSaleToCancel(sale);
    setCancelData({ adminUser: "", adminPass: "", reason: "" });
    setShowCancelModal(true);
    setShowReceiptModal(false);
  };

  const submitCancel = async (e) => {
    e.preventDefault();

    if (cancelData.reason.trim().length < 10) {
      return showAlert(
        "O motivo deve ter no mínimo 10 caracteres.",
        "Motivo Inválido",
        "warning",
      );
    }
    if (!cancelData.adminUser || !cancelData.adminPass) {
      return showAlert(
        "Preencha as credenciais do administrador.",
        "Autenticação",
        "warning",
      );
    }

    try {
      const authResult = await window.api.loginAttempt({
        username: cancelData.adminUser,
        password: cancelData.adminPass,
      });

      if (!authResult.success || authResult.user.cargo !== "admin") {
        return showAlert(
          "Apenas administradores podem cancelar vendas.",
          "Acesso Negado",
          "error",
        );
      }

      const result = await window.api.cancelSale({
        vendaId: saleToCancel.id,
        motivo: `${cancelData.reason} (Autorizado por: ${authResult.user.nome})`,
      });

      if (result.success) {
        showAlert("Venda cancelada e estoque estornado.", "Sucesso", "success");
        loadData();
        setShowCancelModal(false);
        setSaleToCancel(null);
      } else {
        showAlert("Erro ao cancelar: " + result.error, "Erro", "error");
      }
    } catch (err) {
      console.error(err);
      showAlert("Erro técnico ao validar.", "Erro", "error");
    }
  };

  const clearFilters = () => {
    setPeriodType("custom");
    setFilters({
      startDate: "",
      endDate: "",
      sellerId: "",
      clientId: "",
    });
    setClientSearchTerm("");
  };

  const formatCurrency = (val) => `R$ ${val.toFixed(2).replace(".", ",")}`;

  return (
    <div className="p-6 h-full flex flex-col">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">
        Histórico de Vendas
      </h1>

      {/* --- FILTROS --- */}
      <div className="bg-white p-4 rounded-xl shadow-sm mb-6 border border-gray-100 flex flex-col gap-4">
        {/* Botões Rápidos */}
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">
              Data Início
            </label>
            <input
              type="date"
              className="w-full border border-gray-300 rounded p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              value={filters.startDate}
              onChange={(e) => {
                setFilters({ ...filters, startDate: e.target.value });
                setPeriodType("custom");
              }}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">
              Data Fim
            </label>
            <input
              type="date"
              className="w-full border border-gray-300 rounded p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              value={filters.endDate}
              onChange={(e) => {
                setFilters({ ...filters, endDate: e.target.value });
                setPeriodType("custom");
              }}
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">
              Vendedor
            </label>
            <select
              className="w-full border border-gray-300 rounded p-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 outline-none"
              value={filters.sellerId}
              onChange={(e) =>
                setFilters({ ...filters, sellerId: e.target.value })
              }
            >
              <option value="all">Todos</option>
              {sellers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nome}
                </option>
              ))}
            </select>
          </div>

          {/* Campo de Cliente */}
          <div className="relative">
            <label className="text-xs font-semibold text-gray-500 mb-1 block">
              Cliente
            </label>
            <div className="relative">
              <input
                className={`w-full border rounded p-2 text-sm pl-8 outline-none focus:ring-2 focus:ring-blue-500 ${filters.clientId ? "border-green-500 bg-green-50 text-green-800 font-bold" : "border-gray-300 bg-white"}`}
                placeholder={filters.clientId ? "" : "Buscar..."}
                value={clientSearchTerm}
                onChange={(e) => {
                  setClientSearchTerm(e.target.value);
                  if (filters.clientId)
                    setFilters({ ...filters, clientId: "" });
                  setShowClientResults(true);
                }}
                onFocus={() => setShowClientResults(true)}
                onBlur={() =>
                  setTimeout(() => setShowClientResults(false), 200)
                }
              />
              <i
                className={`fas ${filters.clientId ? "fa-user-check text-green-600" : "fa-search text-gray-400"} absolute left-2.5 top-2.5 text-xs`}
              ></i>
              {filters.clientId && (
                <button
                  onClick={() => handleSelectClient(null)}
                  className="absolute right-2 top-2 text-gray-400 hover:text-red-500"
                >
                  <i className="fas fa-times text-xs"></i>
                </button>
              )}
            </div>
            {/* Resultados Cliente */}
            {showClientResults &&
              (clientSearchTerm.length > 0 || clients.length > 0) && (
                <div className="absolute top-full left-0 w-full bg-white border border-gray-200 rounded-lg shadow-xl mt-1 max-h-48 overflow-y-auto z-[60]">
                  <div
                    className="p-2 hover:bg-gray-100 cursor-pointer text-sm text-gray-600 italic border-b"
                    onClick={() => handleSelectClient(null)}
                  >
                    Todos / Limpar Filtro
                  </div>
                  {filteredClientsList.map((c) => (
                    <div
                      key={c.id}
                      onClick={() => handleSelectClient(c)}
                      className="p-2 hover:bg-blue-50 cursor-pointer border-b border-gray-100 text-sm"
                    >
                      <div className="font-bold text-gray-800">{c.nome}</div>
                    </div>
                  ))}
                  {filteredClientsList.length === 0 &&
                    clientSearchTerm.length > 0 && (
                      <div className="p-3 text-center text-xs text-gray-400">
                        Nenhum cliente encontrado
                      </div>
                    )}
                </div>
              )}
          </div>

          <div className="pb-0.5">
            <button
              onClick={clearFilters}
              className="text-sm text-blue-600 hover:underline px-4 py-2 w-full md:w-auto text-center"
            >
              Limpar
            </button>
          </div>
        </div>
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden flex-1 flex flex-col">
        <div className="overflow-y-auto flex-1">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Data
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Cliente
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Vendedor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Pagamento
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Total
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                  Ação
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredSales.map((sale) => (
                <tr
                  key={sale.id}
                  className={`hover:bg-blue-50 ${sale.cancelada ? "bg-red-50" : ""}`}
                >
                  <td
                    className={`px-6 py-4 whitespace-nowrap text-sm font-mono ${sale.cancelada ? "text-red-400 line-through" : "text-gray-500"}`}
                  >
                    #{sale.id}
                  </td>
                  <td
                    className={`px-6 py-4 whitespace-nowrap text-sm ${sale.cancelada ? "text-red-400" : "text-gray-900"}`}
                  >
                    {dayjs(sale.data_venda).format("DD/MM/YYYY HH:mm")}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 font-medium">
                    {getClientName(sale.cliente_id)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    {sale.vendedor_nome}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    {sale.lista_pagamentos && sale.lista_pagamentos.length > 0 ? (
                      <div className="flex flex-col gap-1">
                        {sale.lista_pagamentos.map((p, i) => (
                          <span key={i} className="text-xs bg-gray-100 px-2 py-0.5 rounded border border-gray-200 w-fit whitespace-nowrap">
                            {p.metodo}: {formatCurrency(p.valor)}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span>{sale.forma_pagamento}</span>
                    )}
                  </td>
                  <td
                    className={`px-6 py-4 whitespace-nowrap text-sm text-right font-bold ${sale.cancelada ? "text-red-400 line-through" : "text-gray-900"}`}
                  >
                    {formatCurrency(sale.total_final)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    {sale.cancelada ? (
                      <span
                        className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800 cursor-help"
                        title={sale.motivo_cancelamento}
                      >
                        CANCELADA
                      </span>
                    ) : (
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                        OK
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <div className="flex justify-center gap-2">
                      <button
                        onClick={() => handleViewReceipt(sale)}
                        className="text-blue-600 hover:text-blue-900 bg-blue-100 px-3 py-1 rounded-full text-xs font-semibold transition"
                      >
                        Visualizar
                      </button>
                      {!sale.cancelada && (
                        <button
                          onClick={() => initiateCancel(sale)}
                          className="text-red-600 hover:text-red-900 bg-red-100 px-3 py-1 rounded-full text-xs font-semibold transition"
                          title="Cancelar Venda"
                        >
                          <i className="fas fa-ban"></i>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filteredSales.length === 0 && (
                <tr>
                  <td colSpan="7" className="text-center py-10 text-gray-400">
                    Nenhuma venda encontrada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Recibo */}
      {showReceiptModal && selectedSale && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-200 p-4 rounded-lg shadow-2xl flex flex-col max-h-[90vh]">
            <div className="overflow-y-auto pr-1">
              {/* Aqui usamos o componente importado e adicionamos o ID necessário para a impressão silenciosa.
                    O CupomFiscal deve receber sale e items.
                */}
              <div id="cupom-fiscal">
                <CupomFiscal sale={selectedSale} items={saleItems} companyInfo={companyInfo} />
              </div>
            </div>

            <div className="mt-4 flex gap-2 sticky bottom-0 bg-gray-200 pt-2">
              <button
                onClick={handleSilentPrint}
                className="flex-1 bg-blue-600 text-white py-2 rounded font-bold hover:bg-blue-700 shadow"
              >
                <i className="fas fa-print mr-2"></i> Imprimir
              </button>
              <button
                onClick={() => setShowReceiptModal(false)}
                className="flex-1 bg-gray-300 text-gray-800 py-2 rounded font-bold hover:bg-gray-400"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Cancelamento */}
      {showCancelModal && saleToCancel && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-96 border-2 border-red-100">
            <h2 className="text-xl font-bold text-gray-800 mb-4 text-center">
              Autorização Necessária
            </h2>
            <form onSubmit={submitCancel} className="space-y-4">
              <textarea
                className="w-full border border-gray-300 rounded-lg p-2 text-sm"
                rows="3"
                placeholder="Motivo (min. 10 chars)..."
                value={cancelData.reason}
                onChange={(e) =>
                  setCancelData({ ...cancelData, reason: e.target.value })
                }
                required
              ></textarea>
              <div className="bg-gray-50 p-3 rounded-lg">
                <input
                  className="w-full border border-gray-300 rounded p-2 text-sm mb-2"
                  placeholder="Usuário Admin"
                  value={cancelData.adminUser}
                  onChange={(e) =>
                    setCancelData({ ...cancelData, adminUser: e.target.value })
                  }
                  required
                />
                <input
                  type="password"
                  className="w-full border border-gray-300 rounded p-2 text-sm"
                  placeholder="Senha"
                  value={cancelData.adminPass}
                  onChange={(e) =>
                    setCancelData({ ...cancelData, adminPass: e.target.value })
                  }
                  required
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowCancelModal(false)}
                  className="flex-1 bg-gray-100 py-2 rounded-lg font-medium"
                >
                  Voltar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-red-600 text-white py-2 rounded-lg font-bold"
                >
                  CONFIRMAR
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Recibos;
