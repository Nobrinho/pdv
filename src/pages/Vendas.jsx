// @ts-nocheck
import React, { useState, useEffect, useRef } from "react";

const Vendas = () => {
  // Estados de Dados
  const [products, setProducts] = useState([]);
  const [sellers, setSellers] = useState([]);
  const [mechanics, setMechanics] = useState([]); // Trocadores

  // Estados da Venda
  const [cart, setCart] = useState([]);
  const [selectedSeller, setSelectedSeller] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);

  // Estados de Valores
  const [laborValue, setLaborValue] = useState(0);
  const [selectedMechanic, setSelectedMechanic] = useState("");
  const [discountValue, setDiscountValue] = useState("");
  const [discountType, setDiscountType] = useState("percent"); // 'percent' ou 'fixed'
  const [paymentMethod, setPaymentMethod] = useState("Dinheiro");

  // Estado do Recibo
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastSale, setLastSale] = useState(null);

  // Estado do Alerta Customizado (Substitui o window.alert)
  const [alertState, setAlertState] = useState({
    open: false,
    title: "",
    message: "",
    type: "info",
  });

  const searchInputRef = useRef(null);

  useEffect(() => {
    loadData();
    // Foca no campo de busca ao abrir a tela
    if (searchInputRef.current) searchInputRef.current.focus();
  }, []);

  const loadData = async () => {
    const prods = await window.api.getProducts();
    const people = await window.api.getPeople();

    setProducts(prods);
    setSellers(people.filter((p) => p.cargo_nome === "Vendedor"));
    setMechanics(people.filter((p) => p.cargo_nome === "Trocador"));
  };

  // Função auxiliar para mostrar alertas sem perder o foco da janela
  const showAlert = (message, title = "Atenção", type = "info") => {
    setAlertState({ open: true, title, message, type });
  };

  const closeAlert = () => {
    setAlertState({ ...alertState, open: false });
    // Recupera o foco para o input de busca automaticamente
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 100);
  };

  // --- IMPRESSÃO SILENCIOSA ---
  const handleSilentPrint = async () => {
    // 1. Verificar se o elemento existe (Correção do erro null)
    const receiptElement = document.getElementById("recibo-content");

    if (!receiptElement) {
      return showAlert(
        "Erro interno: Elemento do recibo não encontrado.",
        "Erro Técnico",
        "error"
      );
    }

    // 2. Pegar o conteúdo HTML
    const receiptContent = receiptElement.innerHTML;

    // 3. Buscar nome da impressora salva nas configurações
    const printerName = await window.api.getConfig("impressora_padrao");

    // 4. Enviar para o Backend
    const result = await window.api.printSilent(receiptContent, printerName);

    if (result.success) {
      showAlert(
        "Comando de impressão enviado com sucesso.",
        "Imprimindo",
        "success"
      );
    } else {
      showAlert("Erro na impressão: " + result.error, "Erro", "error");
    }
  };

  // Lógica de Busca Visual (Dropdown)
  useEffect(() => {
    if (searchTerm.length < 2) {
      setSearchResults([]);
      return;
    }
    const results = products.filter(
      (p) =>
        (p.descricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.codigo.toLowerCase().includes(searchTerm.toLowerCase())) &&
        p.estoque_atual > 0
    );
    setSearchResults(results);
  }, [searchTerm, products]);

  // --- LÓGICA DO LEITOR DE CÓDIGO DE BARRAS ---
  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();

      if (!searchTerm) return;

      const exactMatch = products.find(
        (p) => p.codigo.trim() === searchTerm.trim()
      );

      if (exactMatch) {
        if (exactMatch.estoque_atual > 0) {
          addToCart(exactMatch);
        } else {
          showAlert(
            `Produto sem estoque: ${exactMatch.descricao}`,
            "Estoque Insuficiente",
            "error"
          );
          setSearchTerm("");
        }
        return;
      }

      if (searchResults.length === 1) {
        addToCart(searchResults[0]);
        return;
      }
    }
  };

  const addToCart = (product) => {
    const existing = cart.find((item) => item.id === product.id);
    if (existing) {
      if (existing.qty < product.estoque_atual) {
        setCart(
          cart.map((item) =>
            item.id === product.id ? { ...item, qty: item.qty + 1 } : item
          )
        );
      } else {
        showAlert("Estoque máximo atingido para este item.", "Aviso");
      }
    } else {
      setCart([...cart, { ...product, qty: 1 }]);
    }

    setSearchTerm("");
    setSearchResults([]);
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 10);
  };

  const removeFromCart = (id) => {
    setCart(cart.filter((item) => item.id !== id));
  };

  // Cálculos
  const subtotal = cart.reduce(
    (acc, item) => acc + item.preco_venda * item.qty,
    0
  );

  let discountAmount = 0;
  const distVal = parseFloat(discountValue) || 0;
  if (distVal > 0) {
    discountAmount =
      discountType === "fixed" ? distVal : (subtotal * distVal) / 100;
  }

  const labor = parseFloat(laborValue) || 0;
  const total = subtotal + labor - discountAmount;

  const showMechanicSelect = labor > 0;

  // Finalizar Venda
  const handleFinishSale = async () => {
    if (cart.length === 0) return showAlert("O carrinho está vazio!", "Aviso");
    if (!selectedSeller) return showAlert("Selecione um vendedor!", "Aviso");
    if (labor > 0 && !selectedMechanic)
      return showAlert("Selecione o responsável pela mão de obra!", "Aviso");

    const saleData = {
      vendedor_id: selectedSeller,
      trocador_id: showMechanicSelect ? selectedMechanic : null,
      subtotal: subtotal,
      mao_de_obra: labor,
      desconto_valor: distVal,
      desconto_tipo: discountType,
      total_final: total,
      forma_pagamento: paymentMethod,
      itens: cart,
    };

    try {
      const result = await window.api.createSale(saleData);

      if (result.success) {
        const sellerName = sellers.find((s) => s.id == selectedSeller)?.nome;
        const mechanicName = mechanics.find(
          (m) => m.id == selectedMechanic
        )?.nome;

        setLastSale({
          ...saleData,
          id: result.id,
          date: new Date().toLocaleString(),
          vendedor_nome: sellerName,
          trocador_nome: mechanicName,
        });
        setShowReceipt(true);

        setCart([]);
        setLaborValue("");
        setDiscountValue("");
        setSelectedMechanic("");
        setSearchTerm("");
        loadData();
      } else {
        showAlert("Erro ao salvar venda: " + result.error, "Erro", "error");
      }
    } catch (err) {
      console.error(err);
      showAlert("Erro de comunicação com o sistema.", "Erro Crítico", "error");
    }
  };

  return (
    <div className="flex h-full gap-4 p-6">
      {/* Esquerda: Produtos e Carrinho */}
      <div className="flex-1 flex flex-col gap-4">
        {/* Barra de Busca */}
        <div className="bg-white p-4 rounded-xl shadow-sm relative z-20">
          <div className="flex gap-4">
            <div className="w-1/3">
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                Vendedor
              </label>
              <select
                className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
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
            <div className="flex-1 relative">
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                Buscar Produto (Bipar ou Digitar)
              </label>
              <div className="relative">
                <input
                  ref={searchInputRef}
                  className="w-full border border-gray-300 rounded-lg p-2 pl-9 focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Código de barras ou nome..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={handleKeyDown}
                  autoComplete="off"
                />
                <i className="fas fa-barcode absolute left-3 top-3 text-gray-400"></i>
              </div>

              {searchResults.length > 0 && (
                <div className="absolute top-full left-0 w-full bg-white border border-gray-200 rounded-lg shadow-xl mt-1 max-h-60 overflow-y-auto">
                  {searchResults.map((p) => (
                    <div
                      key={p.id}
                      onClick={() => addToCart(p)}
                      className="p-3 hover:bg-blue-50 cursor-pointer border-b border-gray-100 flex justify-between items-center group"
                    >
                      <div>
                        <div className="font-medium text-gray-800 group-hover:text-blue-700">
                          {p.descricao}
                        </div>
                        <div className="text-xs text-gray-500">{p.codigo}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-blue-600">
                          R$ {p.preco_venda}
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
        </div>

        {/* Tabela do Carrinho */}
        <div className="bg-white rounded-xl shadow-sm flex-1 overflow-hidden flex flex-col z-10">
          <div className="overflow-y-auto flex-1">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Item
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                    Qtd
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Unit.
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Total
                  </th>
                  <th className="px-6 py-3 text-center"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {cart.map((item) => (
                  <tr key={item.id}>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {item.descricao}
                    </td>
                    <td className="px-6 py-4 text-center text-sm">
                      <div className="inline-flex items-center border rounded bg-gray-50">
                        <span className="px-3 py-1 font-bold">{item.qty}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right text-sm text-gray-500">
                      R$ {item.preco_venda.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-medium text-gray-900">
                      R$ {(item.preco_venda * item.qty).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="text-red-400 hover:text-red-600 transition"
                      >
                        <i className="fas fa-trash-alt"></i>
                      </button>
                    </td>
                  </tr>
                ))}
                {cart.length === 0 && (
                  <tr>
                    <td
                      colSpan="5"
                      className="text-center py-20 text-gray-400 flex flex-col items-center"
                    >
                      <i className="fas fa-shopping-basket text-4xl mb-2 opacity-20"></i>
                      <span>Carrinho vazio</span>
                      <span className="text-xs mt-1">
                        Bipe um produto ou digite para buscar
                      </span>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Direita: Totais e Pagamento */}
      <div className="w-96 bg-white rounded-xl shadow-md p-6 flex flex-col h-full border border-gray-100">
        <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
          <i className="fas fa-cash-register text-blue-600"></i> Resumo
        </h2>

        <div className="space-y-5 flex-1 overflow-y-auto pr-1">
          <div className="flex justify-between text-gray-600 bg-gray-50 p-3 rounded-lg">
            <span className="font-medium">Subtotal</span>
            <span className="font-bold text-gray-800">
              R$ {subtotal.toFixed(2)}
            </span>
          </div>

          <div className="border-t border-dashed pt-4">
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
              Mão de Obra (R$)
            </label>
            <input
              type="number"
              className="w-full border border-gray-300 rounded-lg p-2.5 text-right font-medium focus:ring-2 focus:ring-blue-500 outline-none transition"
              value={laborValue}
              onChange={(e) => setLaborValue(e.target.value)}
              min="0"
              placeholder="0.00"
            />
          </div>

          {/* Select de Trocador (Sempre visível) */}
          <div className="animate-fade-in-down">
            <label className="block text-xs font-bold text-blue-600 uppercase mb-1">
              Responsável Serviço {labor > 0 && "*"}
            </label>
            <select
              className="w-full border-2 border-blue-100 rounded-lg p-2.5 bg-blue-50 text-blue-900 focus:border-blue-500 outline-none"
              value={selectedMechanic}
              onChange={(e) => setSelectedMechanic(e.target.value)}
              required={labor > 0}
            >
              <option value="">Selecione...</option>
              {mechanics.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nome}
                </option>
              ))}
            </select>
          </div>

          <div className="border-t border-dashed pt-4">
            <div className="flex justify-between items-center mb-1">
              <label className="block text-xs font-bold text-gray-500 uppercase">
                Desconto
              </label>
              <div className="flex bg-gray-100 rounded p-0.5 border border-gray-200">
                <button
                  onClick={() => setDiscountType("fixed")}
                  className={`text-xs px-2 py-0.5 rounded transition ${
                    discountType === "fixed"
                      ? "bg-white shadow-sm text-blue-600 font-bold"
                      : "text-gray-400"
                  }`}
                >
                  R$
                </button>
                <button
                  onClick={() => setDiscountType("percent")}
                  className={`text-xs px-2 py-0.5 rounded transition ${
                    discountType === "percent"
                      ? "bg-white shadow-sm text-blue-600 font-bold"
                      : "text-gray-400"
                  }`}
                >
                  %
                </button>
              </div>
            </div>
            <input
              type="number"
              className="w-full border border-gray-300 rounded-lg p-2.5 text-right font-medium text-red-600 focus:ring-2 focus:ring-red-200 focus:border-red-400 outline-none"
              value={discountValue}
              onChange={(e) => setDiscountValue(e.target.value)}
              min="0"
              placeholder="0"
            />
            {discountAmount > 0 && (
              <p className="text-xs text-right text-red-400 mt-1">
                - R$ {discountAmount.toFixed(2)}
              </p>
            )}
          </div>

          <div className="border-t border-dashed pt-4">
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
              Pagamento
            </label>
            <select
              className="w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none bg-white"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
            >
              <option>Dinheiro</option>
              <option>PIX</option>
              <option>Cartão Crédito 1x</option>
              <option>Cartão Crédito 2x</option>
              <option>Cartão Crédito 3x</option>
              <option>Cartão Débito</option>
            </select>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t-2 border-gray-100">
          <div className="flex justify-between items-end mb-4">
            <span className="text-gray-500 font-medium text-sm mb-1">
              Total Final
            </span>
            <span className="text-4xl font-extrabold text-gray-800 tracking-tight">
              <span className="text-2xl text-gray-400 font-normal mr-1">
                R$
              </span>
              {total.toFixed(2)}
            </span>
          </div>
          <button
            onClick={handleFinishSale}
            className="w-full bg-green-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-green-700 shadow-lg hover:shadow-xl transition transform active:scale-95 flex items-center justify-center gap-2"
          >
            <span>FINALIZAR</span> <i className="fas fa-check"></i>
          </button>
        </div>
      </div>

      {/* Modal de Recibo */}
      {showReceipt && lastSale && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4 print:bg-white print:p-0">
          <div
            id="recibo-content"
            className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-sm print:shadow-none print:w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="text-center border-b pb-4 mb-4 border-dashed border-gray-300">
              <h2 className="text-2xl font-bold text-gray-800">RECIBO</h2>
              <p className="text-sm text-gray-500 mt-1">{lastSale.date}</p>
              <p className="text-xs text-gray-400 font-mono mt-1">
                #{lastSale.id}
              </p>
            </div>

            <div className="space-y-1 mb-4 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Vendedor:</span>
                <span className="font-bold text-gray-800">
                  {lastSale.vendedor_nome}
                </span>
              </div>
              {lastSale.trocador_id && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Serviço:</span>
                  <span className="font-bold text-gray-800">
                    {lastSale.trocador_nome}
                  </span>
                </div>
              )}
            </div>

            <table className="w-full text-sm mb-4">
              <thead>
                <tr className="border-b border-gray-300 text-gray-500">
                  <th className="text-left py-1 font-normal">Item</th>
                  <th className="text-center py-1 font-normal">Qtd</th>
                  <th className="text-right py-1 font-normal">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {lastSale.itens.map((item, idx) => (
                  <tr key={idx}>
                    <td className="py-1.5">{item.descricao}</td>
                    <td className="text-center py-1.5">{item.qty}</td>
                    <td className="text-right py-1.5">
                      {(item.preco_venda * item.qty).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="border-t border-dashed border-gray-300 pt-4 space-y-1">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Subtotal</span>
                <span>{lastSale.subtotal.toFixed(2)}</span>
              </div>
              {lastSale.mao_de_obra > 0 && (
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Mão de Obra (+)</span>
                  <span>{lastSale.mao_de_obra.toFixed(2)}</span>
                </div>
              )}
              {lastSale.desconto_valor > 0 && (
                <div className="flex justify-between text-sm text-red-500">
                  <span>
                    Desconto{" "}
                    {lastSale.desconto_tipo === "percent" ? "(%)" : "(R$)"} (-)
                  </span>
                  <span>
                    {lastSale.desconto_tipo === "percent"
                      ? (
                          (lastSale.subtotal * lastSale.desconto_valor) /
                          100
                        ).toFixed(2)
                      : lastSale.desconto_valor.toFixed(2)}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-2xl font-bold mt-3 pt-3 border-t-2 border-gray-800">
                <span>TOTAL</span>
                <span>R$ {lastSale.total_final.toFixed(2)}</span>
              </div>
              <div className="text-center text-xs text-gray-500 mt-4 uppercase tracking-wide">
                Pagamento: {lastSale.forma_pagamento}
              </div>
            </div>

            <div className="mt-8 flex gap-3 print:hidden">
              <button
                onClick={handleSilentPrint}
                className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 transition shadow"
              >
                <i className="fas fa-print mr-2"></i> IMPRIMIR
              </button>
              <button
                onClick={() => setShowReceipt(false)}
                className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-lg font-bold hover:bg-gray-200 transition"
              >
                FECHAR
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Alerta Customizado (Substitui window.alert) */}
      {alertState.open && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] animate-fade-in">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-96 max-w-full transform transition-all scale-100">
            <div className="flex items-center mb-4">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center mr-3 ${
                  alertState.type === "error"
                    ? "bg-red-100 text-red-500"
                    : "bg-yellow-100 text-yellow-600"
                }`}
              >
                <i
                  className={`fas ${
                    alertState.type === "error" ? "fa-times" : "fa-exclamation"
                  } text-xl`}
                ></i>
              </div>
              <h3 className="text-lg font-bold text-gray-800">
                {alertState.title}
              </h3>
            </div>
            <p className="text-gray-600 mb-6">{alertState.message}</p>
            <div className="flex justify-end">
              <button
                onClick={closeAlert}
                className="bg-blue-600 text-white px-5 py-2 rounded-lg font-semibold hover:bg-blue-700 transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                autoFocus
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Vendas;
