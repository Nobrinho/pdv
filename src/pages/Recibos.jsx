// @ts-nocheck
import React, { useState, useEffect, useMemo } from "react";
import dayjs from "dayjs";
import { useAlert } from "../context/AlertSystem";
import CupomFiscal from "../components/CupomFiscal";

const Recibos = () => {
  const { showAlert } = useAlert();

  const [sales, setSales] = useState([]);
  const [filteredSales, setFilteredSales] = useState([]);
  const [sellers, setSellers] = useState([]);
  const [clients, setClients] = useState([]);

  // Filtros
  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
    sellerId: "",
    clientId: "",
  });

  // Estado para Busca de Cliente (Autocomplete)
  const [clientSearchTerm, setClientSearchTerm] = useState("");
  const [showClientResults, setShowClientResults] = useState(false);

  // Modal Recibo
  const [selectedSale, setSelectedSale] = useState(null);
  const [saleItems, setSaleItems] = useState([]);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  // Modal Cancelamento
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [saleToCancel, setSaleToCancel] = useState(null);
  const [cancelData, setCancelData] = useState({
    adminUser: "",
    adminPass: "",
    reason: "",
  });

  // --- ESTILOS DE IMPRESSÃO (Reutilizáveis) ---
  const styles = {
    container: {
      backgroundColor: "#fff",
      color: "#000",
      fontFamily: "'Courier New', monospace",
      fontSize: "12px",
      padding: "10px",
      width: "100%",
      maxWidth: "300px",
    },
    center: { textAlign: "center" },
    right: { textAlign: "right" },
    bold: { fontWeight: "bold" },
    borderBottom: {
      borderBottom: "1px dashed #000",
      marginBottom: "5px",
      paddingBottom: "5px",
    },
    table: { width: "100%", borderCollapse: "collapse" },
    td: {
      maxWidth: "250px",
      whiteSpace: "normal",
      wordBreak: "break-word",
      overflowWrap: "break-word",
    },
    textSmall: { fontSize: "10px" },
    cancelado: {
      border: "2px solid #000",
      padding: "5px",
      textAlign: "center",
      fontWeight: "bold",
      marginTop: "10px",
    },
  };

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

      setSales(salesData);
      setFilteredSales(salesData);
      setSellers(peopleData.filter((p) => p.cargo_nome === "Vendedor"));
      setClients(clientsData || []);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    }
  };

  const applyFilters = () => {
    let result = sales;

    if (filters.startDate) {
      result = result.filter((s) =>
        dayjs(s.data_venda).isAfter(
          dayjs(filters.startDate).subtract(1, "day"),
        ),
      );
    }
    if (filters.endDate) {
      result = result.filter((s) =>
        dayjs(s.data_venda).isBefore(dayjs(filters.endDate).add(1, "day")),
      );
    }
    if (filters.sellerId && filters.sellerId !== "all") {
      result = result.filter(
        (s) => s.vendedor_id === parseInt(filters.sellerId),
      );
    }
    if (filters.clientId && filters.clientId !== "all") {
      result = result.filter(
        (s) => s.cliente_id === parseInt(filters.clientId),
      );
    }

    setFilteredSales(result);
  };

  // --- Lógica de Busca de Cliente ---
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

  const handleViewReceipt = async (sale) => {
    console.log("FRONTEND: Solicitando itens para venda:", sale.id);
    const items = await window.api.getSaleItems(sale.id);
    console.log("FRONTEND: Itens recebidos:", items);
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
    const receiptContent = receiptElement.outerHTML;
    const printerName = await window.api.getConfig("impressora_padrao");
    const result = await window.api.printSilent(receiptContent, printerName);

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
    setFilters({ startDate: "", endDate: "", sellerId: "", clientId: "" });
    setClientSearchTerm(""); // Limpa o texto da busca também
  };

  const formatCurrency = (val) => `R$ ${val.toFixed(2).replace(".", ",")}`;

  return (
    <div className="p-6 h-full flex flex-col">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">
        Histórico de Vendas
      </h1>

      {/* Filtros */}
      <div className="bg-white p-4 rounded-xl shadow-sm mb-6 border border-gray-100">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">
              Data Início
            </label>
            <input
              type="date"
              className="w-full border border-gray-300 rounded p-2 text-sm"
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
              className="w-full border border-gray-300 rounded p-2 text-sm"
              value={filters.endDate}
              onChange={(e) =>
                setFilters({ ...filters, endDate: e.target.value })
              }
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">
              Vendedor
            </label>
            <select
              className="w-full border border-gray-300 rounded p-2 text-sm bg-white"
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

          {/* Filtro de Cliente com Autocomplete */}
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
                    setFilters({ ...filters, clientId: "" }); // Limpa ID se digitar
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

            {/* Dropdown de Resultados */}
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

      {showReceiptModal && selectedSale && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-200 p-4 rounded-lg shadow-2xl flex flex-col max-h-[90vh] max-w-sm">
            {/* ÁREA ROLÁVEL */}
            <div className="overflow-y-auto pr-1">
              <CupomFiscal sale={selectedSale} items={saleItems} />
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

      {showCancelModal && saleToCancel && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[60] animate-fade-in backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-96 max-w-[90%] transform transition-all scale-100 border-2 border-red-100">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <i className="fas fa-user-lock text-3xl text-red-600"></i>
              </div>
              <h2 className="text-xl font-bold text-gray-800">
                Autorização Necessária
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                O cancelamento requer permissão de administrador e
                justificativa.
              </p>
            </div>

            <form onSubmit={submitCancel} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                  Motivo do Cancelamento *
                </label>
                <textarea
                  className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-red-500 text-sm"
                  rows="3"
                  placeholder="Descreva o motivo (min. 10 caracteres)..."
                  value={cancelData.reason}
                  onChange={(e) =>
                    setCancelData({ ...cancelData, reason: e.target.value })
                  }
                  required
                ></textarea>
              </div>

              <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                <p className="text-xs font-bold text-gray-500 uppercase mb-2">
                  Credenciais do Admin
                </p>
                <div className="space-y-2">
                  <input
                    className="w-full border border-gray-300 rounded p-2 text-sm outline-none focus:border-red-500"
                    placeholder="Usuário Admin"
                    value={cancelData.adminUser}
                    onChange={(e) =>
                      setCancelData({
                        ...cancelData,
                        adminUser: e.target.value,
                      })
                    }
                    required
                  />
                  <input
                    type="password"
                    className="w-full border border-gray-300 rounded p-2 text-sm outline-none focus:border-red-500"
                    placeholder="Senha"
                    value={cancelData.adminPass}
                    onChange={(e) =>
                      setCancelData({
                        ...cancelData,
                        adminPass: e.target.value,
                      })
                    }
                    required
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCancelModal(false)}
                  className="flex-1 bg-gray-100 text-gray-600 py-2.5 rounded-lg font-medium hover:bg-gray-200 transition"
                >
                  Voltar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-red-600 text-white py-2.5 rounded-lg font-bold hover:bg-red-700 transition shadow-md"
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
