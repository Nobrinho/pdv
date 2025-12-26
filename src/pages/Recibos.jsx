// @ts-nocheck
import React, { useState, useEffect } from "react";
import dayjs from "dayjs";
import { useAlert } from "../context/AlertSystem";

const Recibos = () => {
  const { showAlert } = useAlert();

  const [sales, setSales] = useState([]);
  const [filteredSales, setFilteredSales] = useState([]);
  const [sellers, setSellers] = useState([]);

  // Filtros
  const [filters, setFilters] = useState({
    startDate: "",
    endDate: "",
    sellerId: "",
  });

  // Modal Recibo (Visualização)
  const [selectedSale, setSelectedSale] = useState(null);
  const [saleItems, setSaleItems] = useState([]);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  // Modal Cancelamento (Segurança)
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
    const salesData = await window.api.getSales();
    const peopleData = await window.api.getPeople();

    setSales(salesData);
    setFilteredSales(salesData);
    setSellers(peopleData.filter((p) => p.cargo_nome === "Vendedor"));
  };

  const applyFilters = () => {
    let result = sales;

    if (filters.startDate) {
      result = result.filter((s) =>
        dayjs(s.data_venda).isAfter(dayjs(filters.startDate).subtract(1, "day"))
      );
    }
    if (filters.endDate) {
      result = result.filter((s) =>
        dayjs(s.data_venda).isBefore(dayjs(filters.endDate).add(1, "day"))
      );
    }
    if (filters.sellerId && filters.sellerId !== "all") {
      result = result.filter(
        (s) => s.vendedor_id === parseInt(filters.sellerId)
      );
    }

    setFilteredSales(result);
  };

  const handleViewReceipt = async (sale) => {
    const items = await window.api.getSaleItems(sale.id);
    setSelectedSale(sale);
    setSaleItems(items);
    setShowReceiptModal(true);
  };

  // --- FLUXO DE CANCELAMENTO SEGURO ---

  const initiateCancel = (sale) => {
    if (sale.cancelada) return;
    setSaleToCancel(sale);
    setCancelData({ adminUser: "", adminPass: "", reason: "" }); // Reset
    setShowCancelModal(true);
    // Se o modal de recibo estiver aberto, fecha-o para focar no cancelamento
    setShowReceiptModal(false);
  };

  const submitCancel = async (e) => {
    e.preventDefault();

    // 1. Validação do Motivo
    if (cancelData.reason.trim().length < 10) {
      return showAlert(
        "O motivo deve ter no mínimo 10 caracteres para fins de auditoria.",
        "Motivo Inválido",
        "warning"
      );
    }

    // 2. Validação do Administrador
    if (!cancelData.adminUser || !cancelData.adminPass) {
      return showAlert(
        "Preencha as credenciais do administrador.",
        "Autenticação Necessária",
        "warning"
      );
    }

    try {
      const authResult = await window.api.loginAttempt({
        username: cancelData.adminUser,
        password: cancelData.adminPass,
      });

      if (!authResult.success || authResult.user.cargo !== "admin") {
        return showAlert(
          "Autorização negada. Apenas administradores podem cancelar vendas.",
          "Acesso Negado",
          "error"
        );
      }

      // 3. Executar Cancelamento
      const result = await window.api.cancelSale({
        vendaId: saleToCancel.id,
        motivo: `${cancelData.reason} (Autorizado por: ${authResult.user.nome})`,
      });

      if (result.success) {
        showAlert(
          "Venda cancelada e estoque estornado com sucesso.",
          "Cancelamento Realizado",
          "success"
        );
        loadData();
        setShowCancelModal(false);
        setSaleToCancel(null);
      } else {
        showAlert("Erro ao cancelar: " + result.error, "Erro", "error");
      }
    } catch (err) {
      console.error(err);
      showAlert("Erro técnico ao validar permissão.", "Erro", "error");
    }
  };

  const clearFilters = () => {
    setFilters({ startDate: "", endDate: "", sellerId: "" });
  };

  const formatCurrency = (val) => `R$ ${val.toFixed(2).replace(".", ",")}`;

  return (
    <div className="p-6 h-full flex flex-col">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">
        Histórico de Vendas
      </h1>

      {/* Filtros */}
      <div className="bg-white p-4 rounded-xl shadow-sm mb-6 border border-gray-100">
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1 w-full">
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
          <div className="flex-1 w-full">
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
          <div className="flex-1 w-full">
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
          <div className="pb-0.5">
            <button
              onClick={clearFilters}
              className="text-sm text-blue-600 hover:underline px-4 py-2"
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
                  className={`hover:bg-blue-50 ${
                    sale.cancelada ? "bg-red-50" : ""
                  }`}
                >
                  <td
                    className={`px-6 py-4 whitespace-nowrap text-sm font-mono ${
                      sale.cancelada
                        ? "text-red-400 line-through"
                        : "text-gray-500"
                    }`}
                  >
                    #{sale.id}
                  </td>
                  <td
                    className={`px-6 py-4 whitespace-nowrap text-sm ${
                      sale.cancelada ? "text-red-400" : "text-gray-900"
                    }`}
                  >
                    {dayjs(sale.data_venda).format("DD/MM/YYYY HH:mm")}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    {sale.vendedor_nome}
                  </td>
                  <td
                    className={`px-6 py-4 whitespace-nowrap text-sm text-right font-bold ${
                      sale.cancelada
                        ? "text-red-400 line-through"
                        : "text-gray-900"
                    }`}
                  >
                    {formatCurrency(sale.total_final)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    {sale.cancelada ? (
                      <span
                        className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800"
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
                        Recibo
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
                  <td colSpan="6" className="text-center py-10 text-gray-400">
                    Nenhuma venda encontrada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- MODAL DE RECIBO (VISUALIZAÇÃO) --- */}
      {showReceiptModal && selectedSale && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4 print:bg-white print:p-0">
          <div
            id="recibo-content"
            className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-sm print:shadow-none print:w-full max-h-[90vh] overflow-y-auto relative"
          >
            {selectedSale.cancelada && (
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 border-4 border-red-500 text-red-500 text-4xl font-black p-4 rotate-[-30deg] opacity-50 pointer-events-none">
                CANCELADO
              </div>
            )}

            <div className="text-center border-b pb-4 mb-4 border-dashed border-gray-300">
              <h2 className="text-2xl font-bold">RECIBO</h2>
              <p className="text-sm text-gray-500 mt-1">
                {dayjs(selectedSale.data_venda).format("DD/MM/YYYY HH:mm")}
              </p>
              <p className="text-sm text-gray-500 font-mono mt-1">
                #{selectedSale.id}
              </p>
            </div>

            <div className="space-y-1 mb-4 text-sm">
              <div className="flex justify-between">
                <span>Vendedor:</span>
                <span className="font-bold">{selectedSale.vendedor_nome}</span>
              </div>
              {selectedSale.trocador_nome && (
                <div className="flex justify-between">
                  <span>Serviço:</span>
                  <span className="font-bold">
                    {selectedSale.trocador_nome}
                  </span>
                </div>
              )}
            </div>

            <table className="w-full text-sm mb-4">
              <thead>
                <tr className="border-b border-gray-300">
                  <th className="text-left py-1">Item</th>
                  <th className="text-center py-1">Qtd</th>
                  <th className="text-right py-1">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {saleItems.map((item, idx) => (
                  <tr key={idx}>
                    <td className="py-1">{item.descricao}</td>
                    <td className="text-center py-1">{item.quantidade}</td>
                    <td className="text-right py-1">
                      {(item.preco_unitario * item.quantidade).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="border-t border-dashed border-gray-300 pt-4 space-y-1">
              <div className="flex justify-between text-sm">
                <span>Subtotal</span>
                <span>{formatCurrency(selectedSale.subtotal)}</span>
              </div>
              {selectedSale.mao_de_obra > 0 && (
                <div className="flex justify-between text-sm">
                  <span>Mão de Obra (+)</span>
                  <span>{formatCurrency(selectedSale.mao_de_obra)}</span>
                </div>
              )}
              {selectedSale.acrescimo_valor > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Acréscimo (+)</span>
                  <span>{formatCurrency(selectedSale.acrescimo_valor)}</span>
                </div>
              )}
              {selectedSale.desconto_valor > 0 && (
                <div className="flex justify-between text-sm text-red-500">
                  <span>Desconto (-)</span>
                  <span>
                    {selectedSale.desconto_tipo === "percent"
                      ? formatCurrency(
                          (selectedSale.subtotal *
                            selectedSale.desconto_valor) /
                            100
                        )
                      : formatCurrency(selectedSale.desconto_valor)}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-xl font-bold mt-2 pt-2 border-t border-gray-800">
                <span>TOTAL</span>
                <span>{formatCurrency(selectedSale.total_final)}</span>
              </div>
              <div className="text-center text-xs text-gray-500 mt-4">
                Pagamento: {selectedSale.forma_pagamento}
              </div>
              {selectedSale.cancelada && (
                <div className="mt-4 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700 text-center">
                  <strong>Motivo Cancelamento:</strong>
                  <br />
                  {selectedSale.motivo_cancelamento}
                </div>
              )}
            </div>

            <div className="mt-8 flex gap-2 print:hidden">
              <button
                onClick={() => window.print()}
                className="flex-1 bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
              >
                <i className="fas fa-print mr-2"></i> Imprimir
              </button>
              {!selectedSale.cancelada && (
                <button
                  onClick={() => initiateCancel(selectedSale)}
                  className="flex-1 bg-red-100 text-red-600 py-2 rounded hover:bg-red-200"
                >
                  Cancelar
                </button>
              )}
              <button
                onClick={() => setShowReceiptModal(false)}
                className="flex-1 bg-gray-200 text-gray-800 py-2 rounded hover:bg-gray-300"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL DE SEGURANÇA PARA CANCELAMENTO --- */}
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
