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
  const [discountValue, setDiscountValue] = useState(0);
  const [discountType, setDiscountType] = useState("percent"); // 'percent' ou 'fixed'
  const [paymentMethod, setPaymentMethod] = useState("Dinheiro");

  // Estado do Recibo
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastSale, setLastSale] = useState(null);

  const searchInputRef = useRef(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const prods = await window.api.getProducts();
    const people = await window.api.getPeople();

    setProducts(prods);
    setSellers(people.filter((p) => p.cargo_nome === "Vendedor"));
    setMechanics(people.filter((p) => p.cargo_nome === "Trocador"));
  };

  // Lógica de Busca
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
        alert("Estoque máximo atingido para este item.");
      }
    } else {
      setCart([...cart, { ...product, qty: 1 }]);
    }
    setSearchTerm("");
    setSearchResults([]);
    searchInputRef.current?.focus();
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
  if (discountValue > 0) {
    discountAmount =
      discountType === "fixed"
        ? discountValue
        : (subtotal * discountValue) / 100;
  }

  const total = subtotal + parseFloat(laborValue || 0) - discountAmount;

  // Finalizar Venda
  const handleFinishSale = async () => {
    if (cart.length === 0) return alert("Carrinho vazio!");
    if (!selectedSeller) return alert("Selecione um vendedor!");
    if (laborValue > 0 && !selectedMechanic)
      return alert("Selecione o responsável pela mão de obra!");

    const saleData = {
      vendedor_id: selectedSeller,
      trocador_id: selectedMechanic || null,
      subtotal: subtotal,
      mao_de_obra: parseFloat(laborValue),
      desconto_valor: discountAmount,
      desconto_tipo: discountType,
      total_final: total,
      forma_pagamento: paymentMethod,
      itens: cart,
    };

    const result = await window.api.createSale(saleData);

    if (result.success) {
      setLastSale({
        ...saleData,
        id: result.id,
        date: new Date().toLocaleString(),
      });
      setShowReceipt(true);
      // Limpar tela
      setCart([]);
      setLaborValue(0);
      setDiscountValue(0);
      setSearchTerm("");
      loadData(); // Atualizar estoque
    } else {
      alert("Erro ao salvar venda: " + result.error);
    }
  };

  return (
    <div className="flex h-full gap-4 p-6">
      {/* Esquerda: Produtos e Carrinho */}
      <div className="flex-1 flex flex-col gap-4">
        {/* Barra de Busca */}
        <div className="bg-white p-4 rounded-xl shadow-sm relative">
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                Vendedor
              </label>
              <select
                className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none"
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
            <div className="flex-[3] relative">
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                Buscar Produto (Código ou Nome)
              </label>
              <input
                ref={searchInputRef}
                className="w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Digite para buscar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {/* Resultados da Busca */}
              {searchResults.length > 0 && (
                <div className="absolute top-full left-0 w-full bg-white border border-gray-200 rounded-lg shadow-xl mt-1 z-10 max-h-60 overflow-y-auto">
                  {searchResults.map((p) => (
                    <div
                      key={p.id}
                      onClick={() => addToCart(p)}
                      className="p-3 hover:bg-blue-50 cursor-pointer border-b border-gray-100 flex justify-between items-center"
                    >
                      <div>
                        <div className="font-medium text-gray-800">
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
        <div className="bg-white rounded-xl shadow-sm flex-1 overflow-hidden flex flex-col">
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
                      <span className="bg-gray-100 px-2 py-1 rounded font-medium">
                        {item.qty}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right text-sm text-gray-500">
                      R$ {item.preco_venda}
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-medium text-gray-900">
                      R$ {(item.preco_venda * item.qty).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <i className="fas fa-times"></i>
                      </button>
                    </td>
                  </tr>
                ))}
                {cart.length === 0 && (
                  <tr>
                    <td colSpan="5" className="text-center py-10 text-gray-400">
                      Carrinho vazio
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Direita: Totais e Pagamento */}
      <div className="w-96 bg-white rounded-xl shadow-md p-6 flex flex-col h-full">
        <h2 className="text-xl font-bold text-gray-800 mb-6">Resumo</h2>

        <div className="space-y-4 flex-1">
          <div className="flex justify-between text-gray-600">
            <span>Subtotal</span>
            <span className="font-medium">R$ {subtotal.toFixed(2)}</span>
          </div>

          <div className="border-t pt-4">
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
              Mão de Obra (R$)
            </label>
            <input
              type="number"
              className="w-full border border-gray-300 rounded-lg p-2 text-right font-medium"
              value={laborValue}
              onChange={(e) => setLaborValue(e.target.value)}
              min="0"
            />
          </div>

          {/* Select de Trocador (Sempre visível para facilitar, obrigatório se valor > 0) */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
              Responsável Serviço
            </label>
            <select
              className="w-full border border-gray-300 rounded-lg p-2 bg-gray-50"
              value={selectedMechanic}
              onChange={(e) => setSelectedMechanic(e.target.value)}
            >
              <option value="">Nenhum</option>
              {mechanics.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nome}
                </option>
              ))}
            </select>
          </div>

          <div className="border-t pt-4">
            <div className="flex justify-between items-center mb-1">
              <label className="block text-xs font-bold text-gray-500 uppercase">
                Desconto
              </label>
              <div className="flex bg-gray-100 rounded p-1">
                <button
                  onClick={() => setDiscountType("fixed")}
                  className={`text-xs px-2 py-0.5 rounded ${
                    discountType === "fixed"
                      ? "bg-white shadow text-blue-600"
                      : "text-gray-500"
                  }`}
                >
                  R$
                </button>
                <button
                  onClick={() => setDiscountType("percent")}
                  className={`text-xs px-2 py-0.5 rounded ${
                    discountType === "percent"
                      ? "bg-white shadow text-blue-600"
                      : "text-gray-500"
                  }`}
                >
                  %
                </button>
              </div>
            </div>
            <input
              type="number"
              className="w-full border border-gray-300 rounded-lg p-2 text-right font-medium text-red-600"
              value={discountValue}
              onChange={(e) => setDiscountValue(e.target.value)}
              min="0"
            />
          </div>

          <div className="border-t pt-4">
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
              Pagamento
            </label>
            <select
              className="w-full border border-gray-300 rounded-lg p-2"
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

        <div className="mt-6 border-t pt-4">
          <div className="flex justify-between items-end mb-4">
            <span className="text-gray-500 font-medium">Total Final</span>
            <span className="text-3xl font-bold text-blue-700">
              R$ {total.toFixed(2)}
            </span>
          </div>
          <button
            onClick={handleFinishSale}
            className="w-full bg-green-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-green-700 shadow-lg transition transform active:scale-95"
          >
            FINALIZAR VENDA
          </button>
        </div>
      </div>

      {/* Modal de Recibo */}
      {showReceipt && lastSale && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4 print:bg-white print:p-0">
          <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-sm print:shadow-none print:w-full">
            <div className="text-center border-b pb-4 mb-4 border-dashed border-gray-300">
              <h2 className="text-2xl font-bold">RECIBO DE VENDA</h2>
              <p className="text-sm text-gray-500">{lastSale.date}</p>
              <p className="text-sm text-gray-500 font-mono mt-1">
                ID: #{lastSale.id}
              </p>
            </div>

            <div className="space-y-1 mb-4 text-sm">
              <div className="flex justify-between">
                <span>Vendedor:</span>
                <span className="font-bold">
                  {sellers.find((s) => s.id == lastSale.vendedor_id)?.nome}
                </span>
              </div>
              {lastSale.trocador_id && (
                <div className="flex justify-between">
                  <span>Serviço/M.O.:</span>
                  <span className="font-bold">
                    {mechanics.find((m) => m.id == lastSale.trocador_id)?.nome}
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
                {lastSale.itens.map((item, idx) => (
                  <tr key={idx}>
                    <td className="py-1">{item.descricao}</td>
                    <td className="text-center py-1">{item.qty}</td>
                    <td className="text-right py-1">
                      {(item.preco_venda * item.qty).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="border-t border-dashed border-gray-300 pt-4 space-y-1">
              <div className="flex justify-between text-sm">
                <span>Subtotal</span>
                <span>{lastSale.subtotal.toFixed(2)}</span>
              </div>
              {lastSale.mao_de_obra > 0 && (
                <div className="flex justify-between text-sm">
                  <span>Mão de Obra (+)</span>
                  <span>{lastSale.mao_de_obra.toFixed(2)}</span>
                </div>
              )}
              {lastSale.desconto_valor > 0 && (
                <div className="flex justify-between text-sm text-red-500">
                  <span>Desconto (-)</span>
                  <span>{lastSale.desconto_valor.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-xl font-bold mt-2 pt-2 border-t border-gray-800">
                <span>TOTAL</span>
                <span>R$ {lastSale.total_final.toFixed(2)}</span>
              </div>
              <div className="text-center text-xs text-gray-500 mt-4">
                Pagamento: {lastSale.forma_pagamento}
              </div>
            </div>

            <div className="mt-8 flex gap-2 print:hidden">
              <button
                onClick={() => window.print()}
                className="flex-1 bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
              >
                <i className="fas fa-print mr-2"></i> Imprimir
              </button>
              <button
                onClick={() => setShowReceipt(false)}
                className="flex-1 bg-gray-200 text-gray-800 py-2 rounded hover:bg-gray-300"
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
