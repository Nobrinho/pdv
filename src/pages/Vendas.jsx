// @ts-nocheck
import React, { useState, useEffect, useRef } from "react";
import { useAlert } from "../context/AlertSystem";
import dayjs from "dayjs";
import CupomFiscal from "../components/CupomFiscal";
import { applyCpfCnpjMask, applyNameMask, applyPhoneMask, validarDocumento } from "../utils/validators";
import { formatCurrency } from "../utils/format";
import useCart from "../hooks/useCart";
import usePayments from "../hooks/usePayments";
import useProductSearch from "../hooks/useProductSearch";
import useClientSearch from "../hooks/useClientSearch";
import { api } from "../services/api";

const Vendas = () => {
  const { showAlert } = useAlert();

  // --- DADOS ---
  const [products, setProducts] = useState([]);
  const [sellers, setSellers] = useState([]);
  const [mechanics, setMechanics] = useState([]);
  const [clients, setClients] = useState([]);

  // --- SELEÇÃO ---
  const [selectedSeller, setSelectedSeller] = useState("");
  const [selectedMechanic, setSelectedMechanic] = useState("");

  // --- VALORES GERAIS ---
  const [discountValue, setDiscountValue] = useState("");
  const [discountType, setDiscountType] = useState("percent");
  const [surchargeValue, setSurchargeValue] = useState("");
  const [surchargeType, setSurchargeType] = useState("fixed");
  const [laborInput, setLaborInput] = useState(0);

  // --- MODAIS ---
  const [showReceipt, setShowReceipt] = useState(false);
  const [showClientModal, setShowClientModal] = useState(false);
  const [lastSale, setLastSale] = useState(null);

  // --- CPF RECIBO ---
  const [optsCpfReceipt, setOptsCpfReceipt] = useState(false);
  const [receiptCpf, setReceiptCpf] = useState("");
  const [receiptName, setReceiptName] = useState("");
  const [receiptClientFound, setReceiptClientFound] = useState(null); // cliente já existente encontrado pelo doc
  const [receiptSearching, setReceiptSearching] = useState(false);

  // Auto-busca quando CPF (11 dígitos) ou CNPJ (14 dígitos) está completo
  const handleReceiptCpfChange = async (rawValue) => {
    const masked = applyCpfCnpjMask(rawValue);
    setReceiptCpf(masked);
    const digits = masked.replace(/\D/g, "");

    // Resetar se o usuário apagar
    if (digits.length < 11) {
      setReceiptClientFound(null);
      setReceiptName("");
      return;
    }

    // CPF = 11 dígitos, CNPJ = 14 dígitos
    if (digits.length === 11 || digits.length === 14) {
      try {
        setReceiptSearching(true);
        const res = await api.clients.findByDoc(masked);
        if (res.success && res.client) {
          setReceiptClientFound(res.client);
          setReceiptName(res.client.nome);
        } else {
          setReceiptClientFound(null);
          setReceiptName("");
        }
      } catch (err) {
        console.error("Erro ao buscar cliente por documento:", err);
        setReceiptClientFound(null);
      } finally {
        setReceiptSearching(false);
      }
    }
  };

  // --- DADOS NOVO CLIENTE ---
  const [newClientData, setNewClientData] = useState({
    nome: "",
    documento: "",
    telefone: "",
    endereco: "",
  });

  const paymentInputRef = useRef(null);

  // ===== HOOKS CUSTOMIZADOS =====
  const { cart, addToCart, removeFromCart, handleQuantityChange, clearCart, subtotal } = useCart(products);

  const {
    payments, totals, currentPaymentMethod, setCurrentPaymentMethod,
    currentPaymentValue, setCurrentPaymentValue, installments, setInstallments,
    addPayment, removePayment, autoFillRemaining, clearPayments,
  } = usePayments({
    subtotal,
    discountValue, discountType,
    surchargeValue, surchargeType,
    laborInput,
  });

  const {
    searchTerm, setSearchTerm, searchResults, searchInputRef,
    handleSearchKeyDown, selectProduct, focusSearch,
  } = useProductSearch(products, addToCart);

  const {
    clientSearchTerm, setClientSearchTerm,
    showClientResults, setShowClientResults,
    selectedClient, setSelectedClient,
    filteredClients, handleSelectClient,
  } = useClientSearch(clients);

  // ===== LOAD DATA =====
  useEffect(() => {
    loadData();
    focusSearch();
  }, []);

  const loadData = async () => {
    try {
      const prods = await api.products.list();
      const people = await api.people.list();
      const clientsData = await api.clients.list();

      setProducts(prods || []);
      setSellers(people.filter((p) => p.cargo_nome === "Vendedor"));
      setMechanics(people.filter((p) => p.cargo_nome === "Trocador"));
      setClients(clientsData || []);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    }
  };

  // --- CADASTRO RÁPIDO ---
  const handleSaveNewClient = async (e) => {
    e.preventDefault();
    if (!newClientData.nome || !newClientData.telefone) {
      return showAlert(
        "Nome e Telefone são obrigatórios!",
        "Dados Incompletos",
        "warning",
      );
    }
    if (newClientData.documento && !validarDocumento(newClientData.documento)) {
      return showAlert("CPF/CNPJ inválido. Verifique o documento.", "Atenção", "error");
    }
    try {
      const result = await api.clients.save(newClientData);
      if (result.success) {
        showAlert("Cliente cadastrado com sucesso!", "Sucesso", "success");
        const updatedClients = await api.clients.list();
        setClients(updatedClients);
        const newClient = updatedClients.find(
          (c) => c.id === result.id || (newClientData.documento && c.documento === newClientData.documento),
        );
        if (newClient) handleSelectClient(newClient);
        setShowClientModal(false);
        setNewClientData({ nome: "", documento: "", telefone: "", endereco: "" });
      } else {
        showAlert("Erro ao salvar: " + result.error, "Erro", "error");
      }
    } catch (err) {
      console.error(err);
      showAlert("Erro técnico ao salvar cliente.", "Erro", "error");
    }
  };

  // --- FINALIZAR ---
  const handleFinishSale = async () => {
    if (cart.length === 0) return showAlert("Carrinho vazio!", "Erro", "error");
    if (!selectedSeller)
      return showAlert("Selecione um vendedor!", "Erro", "error");
    if (totals.remaining > 0.01)
      return showAlert(
        `Falta receber R$ ${totals.remaining.toFixed(2)}`,
        "Pagamento Incompleto",
        "warning",
      );
    // Trava de Negócio: Desconto não pode consumir valor de adicionais ou mão de obra
    if (totals.discountAmount > totals.subtotal) {
      return showAlert(
        "O desconto não pode ser maior que o subtotal das peças.",
        "Desconto Inválido",
        "error",
      );
    }

    const labor = parseFloat(laborInput) || 0;

    if (labor > 0 && !selectedMechanic)
      return showAlert(
        "Selecione o responsável pela mão de obra!",
        "Aviso",
        "warning",
      );

    const temFiado = payments.some((p) => p.metodo === "Fiado");
    if (temFiado && !selectedClient) {
      return showAlert(
        "Para vendas 'Fiado', é OBRIGATÓRIO selecionar um cliente.",
        "Cliente Necessário",
        "error",
      );
    }

    let finalClientId = selectedClient || null;
    let finalClientObj = clients.find((c) => c.id == selectedClient);

    // --- CPF NO RECIBO LOGIC ---
    if (optsCpfReceipt) {
      if (finalClientId && finalClientObj?.documento) {
        // Cliente selecionado já tem documento, segue normal
      } else if (finalClientId && !finalClientObj?.documento) {
        if (!receiptCpf) return showAlert("Informe o CPF/CNPJ para o recibo.", "Aviso", "warning");
        if (!validarDocumento(receiptCpf)) return showAlert("Documento inválido.", "Aviso", "error");
        const res = await api.clients.save({ id: finalClientId, ...finalClientObj, documento: receiptCpf });
        if (res.success) {
          finalClientObj = { ...finalClientObj, documento: receiptCpf };
        } else {
          return showAlert("Erro ao salvar documento do cliente.", "Erro", "error");
        }
      } else {
        // Sem cliente selecionado — usar o fluxo de auto-busca
        if (!receiptCpf) return showAlert("Informe o CPF/CNPJ para o recibo.", "Aviso", "warning");
        if (!validarDocumento(receiptCpf)) return showAlert("Documento inválido.", "Aviso", "error");

        if (receiptClientFound) {
          // Cliente já foi encontrado pela auto-busca
          finalClientId = receiptClientFound.id;
          finalClientObj = receiptClientFound;
        } else {
          // Cliente novo — precisa de nome
          if (!receiptName) return showAlert("Informe o nome do cliente para o recibo.", "Aviso", "warning");
          try {
            const res = await api.clients.save({ nome: receiptName, documento: receiptCpf });
            if (res.success && res.id) {
              finalClientId = res.id;
              finalClientObj = { id: res.id, nome: receiptName, documento: receiptCpf };
            } else {
              return showAlert("Erro ao salvar dados do cliente: " + res.error, "Erro", "error");
            }
          } catch (error) {
            return showAlert("Erro na verificação de cliente: " + error.message, "Erro", "error");
          }
        }
      }
    }

    const saleData = {
      vendedor_id: selectedSeller,
      trocador_id: selectedMechanic || null,
      cliente_id: finalClientId || null,
      subtotal: totals.subtotal,
      acrescimo_valor: totals.surchargeAmount,
      desconto_valor: totals.discountAmount,
      desconto_tipo: discountType,
      mao_de_obra: labor,
      total_final: totals.total,
      pagamentos: payments,
      itens: cart,
    };

    try {
      const result = await api.sales.create(saleData);

      if (result.success) {
        const sellerName = sellers.find((s) => s.id == selectedSeller)?.nome;
        const mechanicName = mechanics.find((m) => m.id == selectedMechanic)?.nome;
        const clientName = finalClientObj?.nome || clients.find((c) => c.id == selectedClient)?.nome;

        setLastSale({
          ...saleData,
          id: result.id,
          data_venda: new Date(),
          vendedor_nome: sellerName,
          trocador_nome: mechanicName,
          cliente_nome: clientName,
          cliente_documento: finalClientObj?.documento,
          cliente_telefone: finalClientObj?.telefone,
        });

        setShowReceipt(true);
        showAlert("Venda realizada com sucesso!", "Sucesso", "success");

        // Reset via hooks
        clearCart();
        clearPayments();
        setDiscountValue("");
        setSurchargeValue("");
        setLaborInput(0);
        setSearchTerm("");
        handleSelectClient(null);
        setSelectedMechanic("");
        setOptsCpfReceipt(false);
        setReceiptCpf("");
        setReceiptName("");
        setReceiptClientFound(null);
        loadData();
      } else {
        showAlert("Erro ao salvar: " + result.error, "Erro", "error");
      }
    } catch (err) {
      showAlert("Erro técnico.", "Erro", "error");
    }
  };

  const handleSilentPrint = async () => {
    const receiptElement = document.getElementById("cupom-fiscal");
    if (!receiptElement)
      return showAlert("Erro interno: Cupom não encontrado.", "Erro", "error");
    const result = await api.print.silent(
      receiptElement.outerHTML,
      await api.config.get("impressora_padrao"),
    );
    if (result.success)
      showAlert("Enviado para impressão.", "Sucesso", "success");
    else showAlert("Erro na impressão: " + result.error, "Erro", "error");
  };

  return (
    <div className="flex h-full gap-4 p-4 bg-gray-100">
      {/* Esquerda: Produtos e Carrinho */}
      <div className="flex-1 flex flex-col gap-4">
        {/* Barra de Busca e Seleção */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <div className="flex gap-4 mb-3">
            <div className="w-1/2">
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                Vendedor
              </label>
              <select
                className="w-full border border-gray-300 rounded-lg p-2.5 bg-gray-50 outline-none focus:ring-2 focus:ring-blue-500"
                value={selectedSeller}
                onChange={(e) => setSelectedSeller(e.target.value)}
              >
                <option value="">Selecione...</option>
                {sellers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nome}
                  </option>
                ))}
              </select>
            </div>

            <div className="w-1/2 flex gap-2 items-end">
              <div className="flex-1 relative">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                  Cliente
                </label>
                <div className="relative">
                  <input
                    className={`w-full border rounded-lg p-2.5 pl-8 outline-none focus:ring-2 focus:ring-blue-500 ${selectedClient ? "border-green-500 bg-green-50 text-green-800 font-bold" : "border-gray-300 bg-white"}`}
                    placeholder={selectedClient ? "" : "Buscar Cliente..."}
                    value={clientSearchTerm}
                    onChange={(e) => {
                      setClientSearchTerm(e.target.value);
                      if (selectedClient) setSelectedClient("");
                      setShowClientResults(true);
                    }}
                    onFocus={() => setShowClientResults(true)}
                    onBlur={() =>
                      setTimeout(() => setShowClientResults(false), 200)
                    }
                  />
                  <i
                    className={`fas ${selectedClient ? "fa-user-check text-green-600" : "fa-search text-gray-400"} absolute left-3 top-3`}
                  ></i>
                  {selectedClient && (
                    <button
                      onClick={() => handleSelectClient(null)}
                      className="absolute right-3 top-3 text-gray-400 hover:text-red-500"
                    >
                      <i className="fas fa-times"></i>
                    </button>
                  )}
                </div>
                {showClientResults &&
                  (clientSearchTerm.length > 0 || clients.length > 0) && (
                    <div className="absolute top-full left-0 w-full bg-white border border-gray-200 rounded-lg shadow-xl mt-1 max-h-48 overflow-y-auto z-[60]">
                      <div
                        className="p-2 hover:bg-gray-100 cursor-pointer text-sm text-gray-600 italic border-b"
                        onClick={() => handleSelectClient(null)}
                      >
                        <i className="fas fa-user-tag mr-2"></i> Consumidor
                        Final
                      </div>
                      {filteredClients.map((c) => (
                        <div
                          key={c.id}
                          onClick={() => handleSelectClient(c)}
                          className="p-2 hover:bg-blue-50 cursor-pointer border-b border-gray-100 text-sm"
                        >
                          <div className="font-bold text-gray-800">
                            {c.nome}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
              </div>
              <button
                onClick={() => setShowClientModal(true)}
                className="bg-green-600 text-white p-2.5 rounded-lg hover:bg-green-700 transition shadow-sm h-[42px] w-[42px] flex items-center justify-center"
              >
                <i className="fas fa-plus"></i>
              </button>
            </div>
          </div>

          <div className="relative">
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
              Produto (Bipar ou Digitar)
            </label>
            <input
              ref={searchInputRef}
              className="w-full border border-gray-300 rounded-lg p-2.5 pl-10 text-lg outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Código ou Nome..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={handleSearchKeyDown}
            />
            <i className="fas fa-barcode absolute left-3 top-9 text-gray-400 text-lg"></i>

            {searchResults.length > 0 && (
              <div className="absolute top-full left-0 w-full bg-white border border-gray-200 rounded-lg shadow-xl mt-1 max-h-60 overflow-y-auto z-50">
                {searchResults.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => selectProduct(p)}
                    className="p-3 hover:bg-blue-50 cursor-pointer border-b border-gray-100 flex justify-between items-center group"
                  >
                    <div>
                      <div className="font-medium text-gray-800">
                        {p.descricao}
                      </div>
                      <div className="text-xs text-gray-500">{p.codigo}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-blue-600">
                        R$ {p.preco_venda.toFixed(2)}
                      </div>
                      <div className="text-xs text-gray-400">
                        Estoque: {p.estoque_atual}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Tabela do Carrinho */}
        <div className="bg-white rounded-xl shadow-sm flex-1 overflow-hidden flex flex-col z-10 border border-gray-100">
          <div className="overflow-y-auto flex-1 p-2">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-bold text-gray-500 uppercase">
                    Item
                  </th>
                  <th className="px-4 py-2 text-center text-xs font-bold text-gray-500 uppercase w-24">
                    Qtd
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-bold text-gray-500 uppercase">
                    Unit.
                  </th>
                  <th className="px-4 py-2 text-right text-xs font-bold text-gray-500 uppercase">
                    Total
                  </th>
                  <th className="px-4 py-2 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {cart.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3 text-sm text-gray-800 font-medium">
                      {item.descricao}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <input
                        type="number"
                        min="1"
                        className="w-16 text-center border rounded p-1 text-sm font-bold bg-gray-50 focus:bg-white outline-none"
                        value={item.qty}
                        onChange={(e) =>
                          handleQuantityChange(item.id, e.target.value)
                        }
                      />
                    </td>
                    <td className="px-4 py-3 text-right text-sm text-gray-500">
                      {formatCurrency(item.preco_venda)}
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-medium text-gray-900">
                      {formatCurrency(item.preco_venda * item.qty)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="text-red-400 hover:text-red-600 p-1"
                      >
                        <i className="fas fa-trash-alt"></i>
                      </button>
                    </td>
                  </tr>
                ))}
                {cart.length === 0 && (
                  <tr>
                    <td colSpan="5" className="text-center py-20 text-gray-400">
                      Carrinho Vazio
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-between items-center">
            <span className="text-gray-500 font-medium">Subtotal Itens:</span>
            <span className="text-xl font-bold text-gray-800">
              {formatCurrency(totals.subtotal)}
            </span>
          </div>
        </div>
      </div>

      {/* Direita: Pagamento */}
      <div className="w-96 flex flex-col gap-4">
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 space-y-4">
          <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide border-b pb-2">
            Ajustes
          </h2>

          <div className="border-b border-dashed pb-3">
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
              Mão de Obra (R$)
            </label>
            <div className="flex gap-2">
              <input
                id="labor-input"
                type="number"
                className="flex-1 border border-gray-300 rounded p-1.5 text-right text-sm font-medium focus:ring-1 focus:ring-blue-500 outline-none"
                value={laborInput}
                onChange={(e) => setLaborInput(e.target.value)}
                placeholder="0.00"
                min="0"
              />
              <select
                id="mechanic-select"
                className="w-1/2 border border-gray-300 rounded p-1.5 text-xs bg-white"
                value={selectedMechanic}
                onChange={(e) => setSelectedMechanic(e.target.value)}
              >
                <option value="">Técnico...</option>
                {mechanics.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nome}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex gap-2 items-center">
            <div className="flex bg-gray-100 rounded p-0.5 border border-gray-200">
              <button
                onClick={() => setSurchargeType("fixed")}
                className={`text-xs px-2 py-1 rounded ${surchargeType === "fixed" ? "bg-white shadow text-green-600 font-bold" : "text-gray-400"}`}
              >
                R$
              </button>
              <button
                onClick={() => setSurchargeType("percent")}
                className={`text-xs px-2 py-1 rounded ${surchargeType === "percent" ? "bg-white shadow text-green-600 font-bold" : "text-gray-400"}`}
              >
                %
              </button>
            </div>
            <input
              type="number"
              className="flex-1 border border-gray-300 rounded p-1.5 text-right text-sm text-green-600 outline-none"
              placeholder="Acréscimo"
              value={surchargeValue}
              onChange={(e) => setSurchargeValue(e.target.value)}
            />
          </div>
          <div className="flex gap-2 items-center">
            <div className="flex bg-gray-100 rounded p-0.5 border border-gray-200">
              <button
                onClick={() => setDiscountType("fixed")}
                className={`text-xs px-2 py-1 rounded ${discountType === "fixed" ? "bg-white shadow text-red-600 font-bold" : "text-gray-400"}`}
              >
                R$
              </button>
              <button
                onClick={() => setDiscountType("percent")}
                className={`text-xs px-2 py-1 rounded ${discountType === "percent" ? "bg-white shadow text-red-600 font-bold" : "text-gray-400"}`}
              >
                %
              </button>
            </div>
            <input
              type="number"
              className="flex-1 border border-gray-300 rounded p-1.5 text-right text-sm text-red-600 outline-none"
              placeholder="Desconto"
              value={discountValue}
              onChange={(e) => setDiscountValue(e.target.value)}
            />
          </div>
          <div className="flex justify-between items-center pt-2 border-t border-dashed">
            <span className="text-gray-600 font-bold">Total a Pagar</span>
            <span className="text-2xl font-extrabold text-blue-700">
              {formatCurrency(totals.total)}
            </span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-md border-l-4 border-blue-600 flex-1 flex flex-col">
          <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-4">
            Pagamento
          </h2>
          <div className="flex-1 bg-gray-50 rounded-lg p-2 mb-4 overflow-y-auto max-h-40 border border-gray-100">
            {payments.map((p, idx) => (
              <div
                key={idx}
                className="flex justify-between items-center p-2 bg-white rounded shadow-sm mb-1 text-sm"
              >
                <div>
                  <span className="font-bold text-gray-700">{p.metodo}</span>
                  {p.detalhes && (
                    <span className="text-xs text-gray-400 ml-1">
                      ({p.detalhes})
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-800">
                    {formatCurrency(p.valor)}
                  </span>
                  <button
                    onClick={() => removePayment(idx)}
                    className="text-red-400 hover:text-red-600"
                  >
                    <i className="fas fa-times-circle"></i>
                  </button>
                </div>
              </div>
            ))}
            {payments.length === 0 && (
              <p className="text-center text-xs text-gray-400 py-4">
                Nenhum pagamento adicionado
              </p>
            )}
          </div>

          <div
            className={`space-y-3 ${totals.remaining <= 0 ? "opacity-50 pointer-events-none" : ""}`}
          >
            <div className="grid grid-cols-2 gap-2">
              <select
                className="border border-gray-300 rounded p-2 text-sm bg-white"
                value={currentPaymentMethod}
                onChange={(e) => setCurrentPaymentMethod(e.target.value)}
              >
                <option>Dinheiro</option>
                <option>Pix</option>
                <option>Crédito</option>
                <option>Débito</option>
                <option>Fiado</option>
              </select>
              {currentPaymentMethod === "Crédito" && (
                <select
                  className="border border-gray-300 rounded p-2 text-sm bg-white"
                  value={installments}
                  onChange={(e) => setInstallments(e.target.value)}
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((i) => (
                    <option key={i} value={i}>
                      {i}x
                    </option>
                  ))}
                </select>
              )}
            </div>
            <div className="flex gap-2">
              <input
                ref={paymentInputRef}
                type="number"
                className="flex-1 border border-gray-300 rounded p-2 text-right font-bold text-gray-800"
                placeholder="0.00"
                value={currentPaymentValue}
                onChange={(e) => setCurrentPaymentValue(e.target.value)}
                onFocus={autoFillRemaining}
              />
              <button
                onClick={addPayment}
                className="bg-blue-600 text-white px-4 py-2 rounded font-bold hover:bg-blue-700"
              >
                +
              </button>
            </div>
          </div>

          <div className="mt-auto pt-4 border-t border-gray-200">
            <div className="flex justify-between text-sm mb-2">
              <span>Pago:</span>
              <span className="font-bold text-green-600">
                {formatCurrency(totals.totalPaid)}
              </span>
            </div>
            {totals.remaining > 0 ? (
              <div className="flex justify-between text-lg font-bold text-red-600">
                <span>Falta:</span>
                <span>{formatCurrency(totals.remaining)}</span>
              </div>
            ) : (
              <div className="flex justify-between text-lg font-bold text-blue-600">
                <span>Troco:</span>
                <span>{formatCurrency(totals.change)}</span>
              </div>
            )}
            <div className="mt-4 border-t border-gray-200 pt-3">
              <label className="flex items-center gap-2 cursor-pointer text-sm font-bold text-gray-700">
                <input type="checkbox" className="w-4 h-4 text-blue-600" checked={optsCpfReceipt} onChange={e => setOptsCpfReceipt(e.target.checked)} />
                Deseja CPF no Recibo?
              </label>
              {optsCpfReceipt && (
                <div className="mt-2 space-y-2 p-3 bg-blue-50 rounded-lg border border-blue-100">
                  {selectedClient && clients.find(c => c.id == selectedClient)?.documento ? (
                    <p className="text-xs text-blue-800 font-medium"><i className="fas fa-check-circle mr-1"></i> Cliente já possui CPF/CNPJ cadastrado.</p>
                  ) : selectedClient ? (
                    <div>
                      <input className="w-full border border-gray-300 rounded p-1.5 text-sm" placeholder="Digite o CPF/CNPJ" value={receiptCpf} onChange={e => setReceiptCpf(applyCpfCnpjMask(e.target.value))} maxLength="18" />
                    </div>
                  ) : (
                    <>
                      <div className="relative">
                        <input
                          className="w-full border border-gray-300 rounded p-1.5 pl-8 text-sm font-medium"
                          placeholder="CPF/CNPJ *"
                          value={receiptCpf}
                          onChange={e => handleReceiptCpfChange(e.target.value)}
                          maxLength="18"
                          autoFocus
                        />
                        <i className={`fas ${receiptSearching ? 'fa-spinner fa-spin' : receiptClientFound ? 'fa-check-circle text-green-500' : 'fa-id-card text-gray-400'} absolute left-2.5 top-2.5 text-xs`}></i>
                      </div>
                      {receiptClientFound ? (
                        <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded p-1.5 text-sm">
                          <i className="fas fa-user-check text-green-600 text-xs ml-1"></i>
                          <span className="font-bold text-green-800">{receiptClientFound.nome}</span>
                        </div>
                      ) : (
                        <input
                          className="w-full border border-gray-300 rounded p-1.5 text-sm"
                          placeholder="Nome Completo *"
                          value={receiptName}
                          onChange={e => setReceiptName(applyNameMask(e.target.value))}
                          disabled={receiptCpf.replace(/\D/g, '').length < 11}
                        />
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
            <button
              onClick={handleFinishSale}
              disabled={totals.remaining > 0.01}
              className={`w-full mt-4 py-3 rounded-lg font-bold text-white transition shadow-lg ${totals.remaining > 0.01 ? "bg-gray-400 cursor-not-allowed" : "bg-green-600 hover:bg-green-700 transform active:scale-95"}`}
            >
              CONCLUIR VENDA
            </button>
          </div>
        </div>
      </div>

      {showClientModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4 text-gray-800 border-b pb-2 flex items-center">
              <i className="fas fa-user-plus mr-2 text-blue-600"></i> Novo
              Cliente Rápido
            </h2>
            <form onSubmit={handleSaveNewClient} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                  Nome Completo *
                </label>
                <input
                  className="w-full border border-gray-300 rounded p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                  value={newClientData.nome}
                  onChange={(e) =>
                    setNewClientData({ ...newClientData, nome: e.target.value })
                  }
                  autoFocus
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                  CPF / Documento *
                </label>
                <input
                  className="w-full border border-gray-300 rounded p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                  value={newClientData.documento}
                  onChange={(e) =>
                    setNewClientData({
                      ...newClientData,
                      documento: e.target.value,
                    })
                  }
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                  Telefone / WhatsApp *
                </label>
                <input
                  className="w-full border border-gray-300 rounded p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                  value={newClientData.telefone}
                  onChange={(e) =>
                    setNewClientData({
                      ...newClientData,
                      telefone: e.target.value,
                    })
                  }
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                  Endereço (Opcional)
                </label>
                <input
                  className="w-full border border-gray-300 rounded p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                  value={newClientData.endereco}
                  onChange={(e) =>
                    setNewClientData({
                      ...newClientData,
                      endereco: e.target.value,
                    })
                  }
                />
              </div>
              <div className="flex justify-end gap-2 mt-4 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setShowClientModal(false)}
                  className="px-4 py-2 bg-gray-100 rounded text-gray-700 hover:bg-gray-200 font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded font-bold hover:bg-blue-700 shadow-md"
                >
                  Salvar e Selecionar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showReceipt && lastSale && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-200 p-4 rounded-lg shadow-2xl flex flex-col max-h-[95vh] w-full max-w-[340px]">
            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
              <CupomFiscal sale={lastSale} items={lastSale.itens} />
            </div>
            <div className="mt-4 flex gap-2 pt-2 border-t border-gray-300">
              <button
                onClick={handleSilentPrint}
                className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 shadow active:scale-95 transition-transform flex items-center justify-center"
              >
                <i className="fas fa-print mr-2"></i> Imprimir
              </button>
              <button
                onClick={() => setShowReceipt(false)}
                className="flex-1 bg-gray-400 text-white py-3 rounded-lg font-bold hover:bg-gray-500 active:scale-95 transition-transform"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Vendas;
