// @ts-nocheck
import React, { useState, useEffect, useRef, useMemo } from "react";
import { useAlert } from "../context/AlertSystem";
import dayjs from "dayjs";
import logo from "../assets/logo.png";

const Vendas = () => {
  const { showAlert } = useAlert();

  // --- DADOS ---
  const [products, setProducts] = useState([]);
  const [sellers, setSellers] = useState([]);
  const [mechanics, setMechanics] = useState([]);
  const [clients, setClients] = useState([]);

  // --- CARRINHO & SELEÇÃO ---
  const [cart, setCart] = useState([]);
  const [selectedSeller, setSelectedSeller] = useState("");
  const [selectedClient, setSelectedClient] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);

  // --- CLIENTE INTELIGENTE ---
  const [clientSearchTerm, setClientSearchTerm] = useState("");
  const [showClientResults, setShowClientResults] = useState(false);

  // --- VALORES GERAIS ---
  const [discountValue, setDiscountValue] = useState("");
  const [discountType, setDiscountType] = useState("percent");
  const [surchargeValue, setSurchargeValue] = useState("");
  const [surchargeType, setSurchargeType] = useState("fixed");
  const [laborInput, setLaborInput] = useState(0);

  // --- PAGAMENTO MULTIPLO ---
  const [payments, setPayments] = useState([]);
  const [currentPaymentMethod, setCurrentPaymentMethod] = useState("Dinheiro");
  const [currentPaymentValue, setCurrentPaymentValue] = useState("");
  const [installments, setInstallments] = useState(1);

  // --- MODAIS ---
  const [showReceipt, setShowReceipt] = useState(false);
  const [showClientModal, setShowClientModal] = useState(false);
  const [lastSale, setLastSale] = useState(null);

  // --- DADOS NOVO CLIENTE ---
  const [newClientData, setNewClientData] = useState({
    nome: "",
    documento: "",
    telefone: "",
    endereco: "",
  });

  const searchInputRef = useRef(null);
  const paymentInputRef = useRef(null);

  // Estilos de Impressão
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
    center: {
      textAlign: "center",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
    },
    right: { textAlign: "right" },
    bold: { fontWeight: "bold" },
    borderBottom: {
      borderBottom: "1px dashed #000",
      marginBottom: "5px",
      paddingBottom: "5px",
      width: "100%",
    },
    table: { width: "100%", borderCollapse: "collapse" },
    td: {
      maxWidth: "250px", // ajuste conforme seu layout
      whiteSpace: "normal", // permite quebra de linha
      wordBreak: "break-word", // quebra palavras grandes
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
    if (searchInputRef.current) searchInputRef.current.focus();
  }, []);

  const loadData = async () => {
    try {
      const prods = await window.api.getProducts();
      const people = await window.api.getPeople();
      const clientsData = await window.api.getClients();

      setProducts(prods || []);
      setSellers(people.filter((p) => p.cargo_nome === "Vendedor"));
      setMechanics(people.filter((p) => p.cargo_nome === "Trocador"));
      setClients(clientsData || []);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    }
  };

  // --- CÁLCULOS TOTAIS ---
  const totals = useMemo(() => {
    const subtotal = cart.reduce(
      (acc, item) => acc + item.preco_venda * item.qty,
      0,
    );

    const distVal = parseFloat(discountValue) || 0;
    let discountAmount = 0;
    if (distVal > 0)
      discountAmount =
        discountType === "fixed" ? distVal : (subtotal * distVal) / 100;

    const surVal = parseFloat(surchargeValue) || 0;
    let surchargeAmount = 0;
    if (surVal > 0)
      surchargeAmount =
        surchargeType === "fixed" ? surVal : (subtotal * surVal) / 100;

    const laborValue = parseFloat(laborInput || 0);
    const total = Math.max(
      0,
      subtotal + laborValue + surchargeAmount - discountAmount,
    );

    const totalPaid = payments.reduce((acc, p) => acc + p.valor, 0);
    const remaining = total - totalPaid;
    const change = totalPaid > total ? totalPaid - total : 0;

    return {
      subtotal,
      discountAmount,
      surchargeAmount,
      total,
      totalPaid,
      remaining,
      change,
      laborValue,
    };
  }, [
    cart,
    discountValue,
    discountType,
    surchargeValue,
    surchargeType,
    payments,
    laborInput,
  ]);

  // --- Busca de Cliente ---
  const filteredClients = useMemo(() => {
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
      setSelectedClient(client.id);
      setClientSearchTerm(client.nome);
    } else {
      setSelectedClient("");
      setClientSearchTerm("");
    }
    setShowClientResults(false);
  };

  // --- BUSCA DE PRODUTOS ---
  useEffect(() => {
    if (searchTerm.length < 2) {
      setSearchResults([]);
      return;
    }
    const lowerTerm = searchTerm.toLowerCase();
    const results = products.filter(
      (p) =>
        (p.descricao.toLowerCase().includes(lowerTerm) ||
          p.codigo.toLowerCase().includes(lowerTerm)) &&
        p.estoque_atual > 0,
    );
    setSearchResults(results);
  }, [searchTerm, products]);

  const handleSearchKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (!searchTerm) return;
      const exactMatch = products.find(
        (p) => p.codigo.trim() === searchTerm.trim(),
      );
      if (exactMatch) {
        addToCart(exactMatch);
        return;
      }
      if (searchResults.length === 1) {
        addToCart(searchResults[0]);
      }
    }
  };

  const addToCart = (product) => {
    if (product.estoque_atual <= 0)
      return showAlert(
        `Produto sem estoque: ${product.descricao}`,
        "Erro",
        "error",
      );
    const existing = cart.find((item) => item.id === product.id);
    if (existing) {
      if (existing.qty < product.estoque_atual) {
        setCart(
          cart.map((item) =>
            item.id === product.id ? { ...item, qty: item.qty + 1 } : item,
          ),
        );
      } else {
        showAlert("Estoque máximo atingido.", "Aviso", "warning");
      }
    } else {
      setCart([...cart, { ...product, qty: 1 }]);
    }
    setSearchTerm("");
    setSearchResults([]);
    setTimeout(() => searchInputRef.current?.focus(), 10);
  };

  const handleQuantityChange = (id, newQtyStr) => {
    const newQty = parseInt(newQtyStr);
    if (isNaN(newQty) || newQty < 1) return;
    const originalProduct = products.find((p) => p.id === id);
    if (newQty > originalProduct.estoque_atual) {
      showAlert(
        `Estoque insuficiente. Máximo: ${originalProduct.estoque_atual}`,
        "Aviso",
        "warning",
      );
      setCart(
        cart.map((item) =>
          item.id === id
            ? { ...item, qty: originalProduct.estoque_atual }
            : item,
        ),
      );
    } else {
      setCart(
        cart.map((item) => (item.id === id ? { ...item, qty: newQty } : item)),
      );
    }
  };

  const removeFromCart = (id) => setCart(cart.filter((item) => item.id !== id));

  // --- PAGAMENTOS ---
  const addPayment = () => {
    const valor = parseFloat(currentPaymentValue);
    if (!valor || valor <= 0) return showAlert("Digite um valor válido.");

    const currentTotalPaid = payments.reduce((acc, p) => acc + p.valor, 0);
    const currentRemaining = totals.total - currentTotalPaid;

    if (
      valor > currentRemaining + 0.01 &&
      currentPaymentMethod !== "Dinheiro"
    ) {
      return showAlert(
        "Valor maior que o restante. Para troco, use 'Dinheiro'.",
        "Aviso",
        "warning",
      );
    }

    let detalhes = "";
    if (currentPaymentMethod.includes("Crédito")) detalhes = `${installments}x`;

    setPayments([
      ...payments,
      { metodo: currentPaymentMethod, valor, detalhes },
    ]);
    setCurrentPaymentValue("");
  };

  const removePayment = (index) => {
    const newPayments = [...payments];
    newPayments.splice(index, 1);
    setPayments(newPayments);
  };

  const autoFillRemaining = () => {
    if (totals.remaining > 0) {
      setCurrentPaymentValue(totals.remaining.toFixed(2));
    }
  };

  // --- CADASTRO RÁPIDO ---
  const handleSaveNewClient = async (e) => {
    e.preventDefault();
    if (
      !newClientData.nome ||
      !newClientData.documento ||
      !newClientData.telefone
    ) {
      return showAlert(
        "Nome, Documento e Telefone são obrigatórios!",
        "Dados Incompletos",
        "warning",
      );
    }
    try {
      const result = await window.api.saveClient(newClientData);
      if (result.success) {
        showAlert("Cliente cadastrado com sucesso!", "Sucesso", "success");
        const updatedClients = await window.api.getClients();
        setClients(updatedClients);
        const newClient = updatedClients.find(
          (c) => c.documento === newClientData.documento,
        );
        if (newClient) handleSelectClient(newClient);
        setShowClientModal(false);
        setNewClientData({
          nome: "",
          documento: "",
          telefone: "",
          endereco: "",
        });
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

    const labor = parseFloat(laborInput) || 0;
    const selectedMechanicState =
      document.getElementById("mechanic-select")?.value;

    if (labor > 0 && !selectedMechanicState)
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

    const saleData = {
      vendedor_id: selectedSeller,
      trocador_id: selectedMechanicState || null,
      cliente_id: selectedClient || null,
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
      const result = await window.api.createSale(saleData);

      if (result.success) {
        const sellerName = sellers.find((s) => s.id == selectedSeller)?.nome;
        const mechanicName = mechanics.find(
          (m) => m.id == selectedMechanicState,
        )?.nome;
        const clientName = clients.find((c) => c.id == selectedClient)?.nome;

        setLastSale({
          ...saleData,
          id: result.id,
          data_venda: new Date(),
          vendedor_nome: sellerName,
          trocador_nome: mechanicName,
          cliente_nome: clientName,
        });

        setShowReceipt(true);
        showAlert("Venda realizada com sucesso!", "Sucesso", "success");

        setCart([]);
        setPayments([]);
        setDiscountValue("");
        setSurchargeValue("");
        setLaborInput(0);
        setSearchTerm("");
        handleSelectClient(null);
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
    const result = await window.api.printSilent(
      receiptElement.outerHTML,
      await window.api.getConfig("impressora_padrao"),
    );
    if (result.success)
      showAlert("Enviado para impressão.", "Sucesso", "success");
    else showAlert("Erro na impressão: " + result.error, "Erro", "error");
  };

  const formatCurrency = (val) => `R$ ${val.toFixed(2).replace(".", ",")}`;

  return (
    <div className="flex h-full gap-4 p-4 bg-gray-100">
      {/* Esquerda: Produtos e Carrinho */}
      <div className="flex-1 flex flex-col gap-4">
        {/* Barra de Busca e Seleção */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <div className="flex gap-4 mb-3">
            <div className="w-1/3">
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

            <div className="w-1/3 flex gap-2 items-end">
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
                    onClick={() => addToCart(p)}
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
          <div className="bg-gray-200 p-4 rounded-lg shadow-2xl flex flex-col max-h-[90vh]">
            <div id="cupom-fiscal" style={styles.container}>
              <div style={{ ...styles.center, ...styles.borderBottom }}>
                {logo && (
                  <div
                    style={{
                      width: "100%",
                      display: "flex",
                      justifyContent: "center",
                      marginBottom: "5px",
                    }}
                  >
                    <img
                      src={logo}
                      alt="Logo"
                      style={{ maxWidth: "70px", maxHeight: "70px" }}
                    />
                  </div>
                )}
                <h2
                  style={{
                    ...styles.bold,
                    fontSize: "14px",
                    margin: "0 0 5px 0",
                  }}
                >
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
                  {dayjs(lastSale.data_venda).format("DD/MM/YYYY HH:mm")}
                </p>
                <p style={styles.textSmall}>ID: #{lastSale.id}</p>
              </div>
              <div style={styles.borderBottom}>
                <p style={{ margin: "2px 0" }}>
                  Vendedor:{" "}
                  <span style={styles.bold}>{lastSale.vendedor_nome}</span>
                </p>
                {lastSale.cliente_nome && (
                  <p style={{ margin: "2px 0" }}>
                    Cliente:{" "}
                    <span style={styles.bold}>{lastSale.cliente_nome}</span>
                  </p>
                )}
              </div>
              <table style={{ ...styles.table, ...styles.borderBottom }}>
                <thead>
                  <tr>
                    <th style={{ ...styles.td, textAlign: "left" }}>
                      QTD x ITEM
                    </th>
                    <th style={{ ...styles.td, textAlign: "right" }}>TOTAL</th>
                  </tr>
                </thead>
                <tbody>
                  {lastSale.itens.map((item, idx) => (
                    <tr key={idx}>
                      <td style={styles.td}>
                        {item.qty} x {item.descricao.substring(0, 20)}
                        <br />
                        <span style={styles.textSmall}>
                          Unit: {item.preco_venda.toFixed(2)}
                        </span>
                      </td>
                      <td style={{ ...styles.td, textAlign: "right" }}>
                        {(item.qty * item.preco_venda).toFixed(2)}
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
                  <span>{lastSale.subtotal.toFixed(2)}</span>
                </div>
                {lastSale.mao_de_obra > 0 && (
                  <div
                    style={{ display: "flex", justifyContent: "space-between" }}
                  >
                    <span>Mão de Obra:</span>
                    <span>+ {lastSale.mao_de_obra.toFixed(2)}</span>
                  </div>
                )}
                {lastSale.acrescimo_valor > 0 && (
                  <div
                    style={{ display: "flex", justifyContent: "space-between" }}
                  >
                    <span>Acréscimo:</span>
                    <span>+ {lastSale.acrescimo_valor.toFixed(2)}</span>
                  </div>
                )}
                {lastSale.desconto_valor > 0 && (
                  <div
                    style={{ display: "flex", justifyContent: "space-between" }}
                  >
                    <span>Desconto:</span>
                    <span>
                      -{" "}
                      {lastSale.desconto_tipo === "percent"
                        ? (
                            (lastSale.subtotal * lastSale.desconto_valor) /
                            100
                          ).toFixed(2)
                        : lastSale.desconto_valor.toFixed(2)}
                    </span>
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
                <span>R$ {lastSale.total_final.toFixed(2)}</span>
              </div>

              {/* Lista de Pagamentos no Recibo (SE HOUVER DETALHES SALVOS, SENÃO MOSTRA RESUMO) */}
              <div style={{ ...styles.borderBottom, margin: "10px 0" }}>
                <p style={{ margin: "0", fontWeight: "bold" }}>Pagamentos:</p>
                {lastSale.pagamentos &&
                  lastSale.pagamentos.map((p, i) => (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: "11px",
                      }}
                    >
                      <span>
                        {p.metodo} {p.detalhes ? `(${p.detalhes})` : ""}
                      </span>
                      <span>{p.valor.toFixed(2)}</span>
                    </div>
                  ))}
                {/* Fallback se pagamentos detalhados não existirem (ex: venda antiga) */}
                {!lastSale.pagamentos && (
                  <p style={{ margin: "0" }}>{lastSale.forma_pagamento}</p>
                )}
              </div>

              <div style={{ ...styles.center, ...styles.textSmall }}>
                <p>Obrigado pela preferência!</p>
              </div>
              {!!lastSale.cancelada && (
                <div style={styles.cancelado}>VENDA CANCELADA</div>
              )}
            </div>
            <div className="mt-4 flex gap-2">
              <button
                onClick={handleSilentPrint}
                className="flex-1 bg-blue-600 text-white py-2 rounded font-bold hover:bg-blue-700 shadow"
              >
                <i className="fas fa-print mr-2"></i> Imprimir
              </button>
              <button
                onClick={() => setShowReceipt(false)}
                className="flex-1 bg-gray-300 text-gray-800 py-2 rounded font-bold hover:bg-gray-400"
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
