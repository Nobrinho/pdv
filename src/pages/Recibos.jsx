// @ts-nocheck
import React, { useState, useEffect } from "react";
import dayjs from "dayjs";
import { useAlert } from "../context/AlertSystem";
import logo from "../assets/logo.png";

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
      setSales(salesData);
      setFilteredSales(salesData);
      setSellers(peopleData.filter((p) => p.cargo_nome === "Vendedor"));
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    }
  };

  const applyFilters = () => {
    let result = sales;
    if (filters.startDate)
      result = result.filter((s) =>
        dayjs(s.data_venda).isAfter(
          dayjs(filters.startDate).subtract(1, "day"),
        ),
      );
    if (filters.endDate)
      result = result.filter((s) =>
        dayjs(s.data_venda).isBefore(dayjs(filters.endDate).add(1, "day")),
      );
    if (filters.sellerId && filters.sellerId !== "all")
      result = result.filter(
        (s) => s.vendedor_id === parseInt(filters.sellerId),
      );
    setFilteredSales(result);
  };

  const handleViewReceipt = async (sale) => {
    const items = await window.api.getSaleItems(sale.id);
    setSelectedSale(sale);
    setSaleItems(items);
    setShowReceiptModal(true);
  };

  // --- IMPRESSÃO SILENCIOSA ---
  const handleSilentPrint = async () => {
    const receiptElement = document.getElementById("cupom-fiscal");
    if (!receiptElement)
      return showAlert("Erro interno: Cupom não encontrado.", "Erro", "error");

    // Pega o HTML já estilizado
    const receiptContent = receiptElement.outerHTML;
    const printerName = await window.api.getConfig("impressora_padrao");

    const result = await window.api.printSilent(receiptContent, printerName);

    if (result.success) {
      showAlert("Enviado para impressão.", "Sucesso", "success");
    } else {
      showAlert("Erro na impressão: " + result.error, "Erro", "error");
    }
  };

  // --- LÓGICA DE CANCELAMENTO ---
  const initiateCancel = (sale) => {
    if (sale.cancelada) return;
    setSaleToCancel(sale);
    setCancelData({ adminUser: "", adminPass: "", reason: "" });
    setShowCancelModal(true);
    setShowReceiptModal(false);
  };

  const submitCancel = async (e) => {
    e.preventDefault();
    if (cancelData.reason.trim().length < 10)
      return showAlert(
        "O motivo deve ter no mínimo 10 caracteres.",
        "Motivo Inválido",
        "warning",
      );
    if (!cancelData.adminUser || !cancelData.adminPass)
      return showAlert(
        "Preencha as credenciais do administrador.",
        "Autenticação",
        "warning",
      );

    try {
      const authResult = await window.api.loginAttempt({
        username: cancelData.adminUser,
        password: cancelData.adminPass,
      });
      if (!authResult.success || authResult.user.cargo !== "admin")
        return showAlert(
          "Apenas administradores podem cancelar vendas.",
          "Acesso Negado",
          "error",
        );

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
      showAlert("Erro técnico.", "Erro", "error");
    }
  };

  const clearFilters = () =>
    setFilters({ startDate: "", endDate: "", sellerId: "" });
  const formatCurrency = (val) => `R$ ${val.toFixed(2).replace(".", ",")}`;

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

  return (
    <div className="p-6 h-full flex flex-col">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">
        Histórico de Vendas
      </h1>

      {/* Filtros UI (Mantém Tailwind aqui pois é tela do sistema) */}
      <div className="bg-white p-4 rounded-xl shadow-sm mb-6 border border-gray-100">
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1 w-full">
            <label className="text-xs font-semibold text-gray-500 mb-1 block">
              Início
            </label>
            <input
              type="date"
              className="w-full border rounded p-2 text-sm"
              value={filters.startDate}
              onChange={(e) =>
                setFilters({ ...filters, startDate: e.target.value })
              }
            />
          </div>
          <div className="flex-1 w-full">
            <label className="text-xs font-semibold text-gray-500 mb-1 block">
              Fim
            </label>
            <input
              type="date"
              className="w-full border rounded p-2 text-sm"
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
              className="w-full border rounded p-2 text-sm bg-white"
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

      {/* Tabela UI */}
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
                  className={`hover:bg-blue-50 ${sale.cancelada ? "bg-red-50" : ""}`}
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-500">
                    #{sale.id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {dayjs(sale.data_venda).format("DD/MM HH:mm")}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {sale.vendedor_nome}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold">
                    {formatCurrency(sale.total_final)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    {sale.cancelada ? (
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
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
                        className="text-blue-600 bg-blue-100 px-3 py-1 rounded-full text-xs font-semibold"
                      >
                        Visualizar
                      </button>
                      {!sale.cancelada && (
                        <button
                          onClick={() => initiateCancel(sale)}
                          className="text-red-600 bg-red-100 px-3 py-1 rounded-full text-xs font-semibold"
                          title="Cancelar"
                        >
                          <i className="fas fa-ban"></i>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- MODAL DE RECIBO (LAYOUT TÉRMICO COM ESTILOS INLINE) --- */}
      {showReceiptModal && selectedSale && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-200 p-4 rounded-lg shadow-2xl flex flex-col max-h-[90vh] max-w-sm">
            {/* ÁREA ROLÁVEL */}
            <div className="overflow-y-auto pr-1">
              <div id="cupom-fiscal" style={styles.container}>
                <div style={{ ...styles.center, ...styles.borderBottom }}>
                  <h2
                    style={{
                      ...styles.bold,
                      fontSize: "14px",
                      margin: "0 0 5px 0",
                    }}
                  >
                    <div
                      style={{
                        width: "100%",

                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                      }}
                    >
                      <img src={logo} alt="logo_barba" width={70} />
                    </div>
                    BARBA PNEUS
                  </h2>
                  <p style={{ margin: "2px 0" }}>
                    Av. Brigadeiro Hilario Gurjão, 22
                  </p>
                  <p style={{ margin: "1px 0" }}>Jorge Teixeira 1 etapa</p>
                  <p style={{ margin: "1px 0" }}>MANAUS - AM</p>
                  <p style={{ margin: "1px 0" }}>CEP: 69.088-000</p>
                  <p style={{ margin: "1px 0" }}>Tel: (92) 99148-7719</p>
                  <p style={{ ...styles.bold, margin: "2px 0" }}>
                    RECIBO DE VENDA
                  </p>
                  <p style={styles.textSmall}>
                    {dayjs(selectedSale.data_venda).format("DD/MM/YYYY HH:mm")}
                  </p>
                  <p style={styles.textSmall}>ID: #{selectedSale.id}</p>
                </div>

                <div style={styles.borderBottom}>
                  <p style={{ margin: "2px 0" }}>
                    Vendedor:{" "}
                    <span style={styles.bold}>
                      {selectedSale.vendedor_nome}
                    </span>
                  </p>
                </div>

                <table style={{ ...styles.table, ...styles.borderBottom }}>
                  <thead>
                    <tr>
                      <th style={{ ...styles.td, textAlign: "left" }}>
                        QTD x ITEM
                      </th>
                      <th style={{ ...styles.td, textAlign: "right" }}>
                        TOTAL
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {saleItems.map((item, idx) => (
                      <tr key={idx}>
                        <td style={styles.td}>
                          {item.quantidade} x {item.descricao}
                          <br />
                          <span style={styles.textSmall}>
                            Unit: {item.preco_unitario.toFixed(2)}
                          </span>
                        </td>
                        <td style={{ ...styles.td, textAlign: "right" }}>
                          {(item.quantidade * item.preco_unitario).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div style={styles.borderBottom}>
                  <div
                    style={{ display: "flex", justifyContent: "space-between" }}
                  >
                    <span>Subtotal:</span>
                    <span>{selectedSale.subtotal.toFixed(2)}</span>
                  </div>
                  {selectedSale.acrescimo > 0 && (
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                      }}
                    >
                      <span>Acréscimo:</span>
                      <span>+ {selectedSale.acrescimo.toFixed(2)}</span>
                    </div>
                  )}
                  {selectedSale.desconto_valor > 0 && (
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                      }}
                    >
                      <span>Desconto:</span>
                      <span>- {selectedSale.desconto_valor.toFixed(2)}</span>
                    </div>
                  )}
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: "14px",
                    fontWeight: "bold",
                    margin: "5px 0",
                  }}
                >
                  <span>TOTAL:</span>
                  <span>R$ {selectedSale.total_final.toFixed(2)}</span>
                </div>

                <div
                  style={{
                    ...styles.center,
                    ...styles.borderBottom,
                    margin: "10px 0",
                  }}
                >
                  <p style={{ margin: "0" }}>
                    Pagamento: {selectedSale.forma_pagamento}
                  </p>
                </div>

                <div style={{ ...styles.center, ...styles.textSmall }}>
                  <p>Obrigado pela preferência!</p>
                </div>

                {!!selectedSale.cancelada && (
                  <div style={styles.cancelado}>VENDA CANCELADA</div>
                )}
              </div>
            </div>

            {/* AÇÕES FIXAS */}
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
