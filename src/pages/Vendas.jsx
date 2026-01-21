// @ts-nocheck
import React, { useState, useEffect, useRef, useMemo } from "react";
import { useAlert } from "../context/AlertSystem";

const Vendas = () => {
  const { showAlert } = useAlert();

  // --- DADOS ---
  const [products, setProducts] = useState([]);
  const [sellers, setSellers] = useState([]);

  // --- CARRINHO & SELEÇÃO ---
  const [cart, setCart] = useState([]);
  const [selectedSeller, setSelectedSeller] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);

  // --- VALORES GERAIS ---
  const [discountValue, setDiscountValue] = useState("");
  const [discountType, setDiscountType] = useState("percent");
  const [surchargeValue, setSurchargeValue] = useState("");
  const [surchargeType, setSurchargeType] = useState("fixed");

  // --- PAGAMENTO MULTIPLO ---
  const [payments, setPayments] = useState([]); // Lista de pagamentos adicionados { metodo, valor, detalhes }
  const [currentPaymentMethod, setCurrentPaymentMethod] = useState("Dinheiro");
  const [currentPaymentValue, setCurrentPaymentValue] = useState(""); // Valor que está sendo digitado
  const [installments, setInstallments] = useState(1); // Para cartão de crédito

  const searchInputRef = useRef(null);
  const paymentInputRef = useRef(null);

  useEffect(() => {
    loadData();
    if (searchInputRef.current) searchInputRef.current.focus();
  }, []);

  const loadData = async () => {
    try {
      const prods = await window.api.getProducts();
      const people = await window.api.getPeople();
      setProducts(prods || []);
      setSellers(people.filter((p) => p.cargo_nome === "Vendedor"));
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

    // Desconto
    const distVal = parseFloat(discountValue) || 0;
    let discountAmount = 0;
    if (distVal > 0) {
      discountAmount =
        discountType === "fixed" ? distVal : (subtotal * distVal) / 100;
    }

    // Acréscimo
    const surVal = parseFloat(surchargeValue) || 0;
    let surchargeAmount = 0;
    if (surVal > 0) {
      surchargeAmount =
        surchargeType === "fixed" ? surVal : (subtotal * surVal) / 100;
    }

    const total = Math.max(0, subtotal + surchargeAmount - discountAmount);

    // Pagamentos
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
    };
  }, [
    cart,
    discountValue,
    discountType,
    surchargeValue,
    surchargeType,
    payments,
  ]);

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

  // --- ALTERAR QUANTIDADE (EDÇÃO DIRETA) ---
  const handleQuantityChange = (id, newQtyStr) => {
    const newQty = parseInt(newQtyStr);
    if (isNaN(newQty) || newQty < 1) return;

    const productInCart = cart.find((item) => item.id === id);
    const originalProduct = products.find((p) => p.id === id);

    if (newQty > originalProduct.estoque_atual) {
      showAlert(
        `Estoque insuficiente. Máximo: ${originalProduct.estoque_atual}`,
        "Aviso",
        "warning",
      );
      // Atualiza para o máximo possível
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

  const removeFromCart = (id) => {
    setCart(cart.filter((item) => item.id !== id));
  };

  // --- GERENCIAMENTO DE PAGAMENTOS ---
  const addPayment = () => {
    const valor = parseFloat(currentPaymentValue);
    if (!valor || valor <= 0) return showAlert("Digite um valor válido.");

    if (
      valor > totals.remaining &&
      totals.remaining > 0 &&
      currentPaymentMethod !== "Dinheiro"
    ) {
      return showAlert(
        "Valor maior que o restante. Para troco, use 'Dinheiro'.",
        "Aviso",
        "warning",
      );
    }

    // Detalhes (Ex: 3x)
    let detalhes = "";
    if (currentPaymentMethod.includes("Crédito")) {
      detalhes = `${installments}x`;
    }

    setPayments([
      ...payments,
      { metodo: currentPaymentMethod, valor, detalhes },
    ]);
    setCurrentPaymentValue(""); // Limpa input
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

  // --- FINALIZAR ---
  const handleFinishSale = async () => {
    if (cart.length === 0) return showAlert("Carrinho vazio!", "Erro", "error");
    if (!selectedSeller)
      return showAlert("Selecione um vendedor!", "Erro", "error");

    // Validação de Pagamento Total
    // Permitimos uma margem de erro de 0.01 centavos para arredondamento
    if (totals.remaining > 0.01) {
      return showAlert(
        `Falta receber R$ ${totals.remaining.toFixed(2)}`,
        "Pagamento Incompleto",
        "warning",
      );
    }

    const saleData = {
      vendedor_id: selectedSeller,
      subtotal: totals.subtotal,
      acrescimo_valor: totals.surchargeAmount,
      desconto_valor: totals.discountAmount,
      desconto_tipo: discountType,
      total_final: totals.total,
      pagamentos: payments, // Array de pagamentos
      itens: cart,
    };

    try {
      const result = await window.api.createSale(saleData);

      if (result.success) {
        showAlert("Venda realizada com sucesso!", "Sucesso", "success");
        // Aqui você pode chamar a função de imprimir recibo passando os dados
        // Resetar tudo
        setCart([]);
        setPayments([]);
        setDiscountValue("");
        setSurchargeValue("");
        loadData();
      } else {
        showAlert("Erro ao salvar: " + result.error, "Erro", "error");
      }
    } catch (err) {
      showAlert("Erro técnico.", "Erro", "error");
    }
  };

  const formatCurrency = (val) => `R$ ${val.toFixed(2).replace(".", ",")}`;

  return (
    <div className="flex h-full gap-4 p-4 bg-gray-100">
      {/* --- COLUNA ESQUERDA: LISTA E BUSCA --- */}
      <div className="flex-1 flex flex-col gap-4">
        {/* Busca e Vendedor */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex gap-4 items-end">
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
          <div className="flex-1 relative">
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

            {/* Dropdown de Busca */}
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

        {/* Lista de Itens */}
        <div className="bg-white rounded-xl shadow-sm flex-1 overflow-hidden flex flex-col border border-gray-200">
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
                        className="w-16 text-center border rounded p-1 text-sm font-bold bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                        value={item.qty}
                        onChange={(e) =>
                          handleQuantityChange(item.id, e.target.value)
                        }
                      />
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-bold text-gray-800">
                      {formatCurrency(item.preco_venda * item.qty)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="text-red-400 hover:text-red-600 p-1 rounded hover:bg-red-50 transition"
                      >
                        <i className="fas fa-trash-alt"></i>
                      </button>
                    </td>
                  </tr>
                ))}
                {cart.length === 0 && (
                  <tr>
                    <td colSpan="4" className="text-center py-20 text-gray-400">
                      <div className="flex flex-col items-center">
                        <i className="fas fa-shopping-cart text-4xl mb-2 opacity-20"></i>
                        <span>Carrinho Vazio</span>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {/* Totais do Carrinho */}
          <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-between items-center">
            <span className="text-gray-500 font-medium">Subtotal Itens:</span>
            <span className="text-xl font-bold text-gray-800">
              {formatCurrency(totals.subtotal)}
            </span>
          </div>
        </div>
      </div>

      {/* --- COLUNA DIREITA: PAGAMENTO --- */}
      <div className="w-96 flex flex-col gap-4">
        {/* Card Resumo e Ajustes */}
        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 space-y-4">
          <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide border-b pb-2">
            Ajustes
          </h2>

          {/* Acréscimo */}
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
              className="flex-1 border border-gray-300 rounded p-1.5 text-right text-sm text-green-600 focus:ring-1 focus:ring-green-500 outline-none"
              placeholder="Acréscimo"
              value={surchargeValue}
              onChange={(e) => setSurchargeValue(e.target.value)}
            />
          </div>

          {/* Desconto */}
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
              className="flex-1 border border-gray-300 rounded p-1.5 text-right text-sm text-red-600 focus:ring-1 focus:ring-red-500 outline-none"
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

        {/* Card Pagamento */}
        <div className="bg-white p-5 rounded-xl shadow-md border-l-4 border-blue-600 flex-1 flex flex-col">
          <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-4">
            Pagamento
          </h2>

          {/* Lista de Pagamentos Adicionados */}
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

          {/* Adicionar Novo Pagamento */}
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
                  <option value="1">1x</option>
                  <option value="2">2x</option>
                  <option value="3">3x</option>
                  <option value="4">4x</option>
                  <option value="5">5x</option>
                  <option value="6">6x</option>
                  <option value="7">7x</option>
                  <option value="8">8x</option>
                  <option value="9">9x</option>
                  <option value="10">10x</option>
                  <option value="11">11x</option>
                  <option value="12">12x</option>
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
                onFocus={autoFillRemaining} // Sugere o valor restante ao clicar
              />
              <button
                onClick={addPayment}
                className="bg-blue-600 text-white px-4 py-2 rounded font-bold hover:bg-blue-700"
              >
                +
              </button>
            </div>
          </div>

          {/* Status do Pagamento */}
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
              disabled={totals.remaining > 0.01} // Permite margem de 1 centavo
              className={`w-full mt-4 py-3 rounded-lg font-bold text-white transition shadow-lg ${
                totals.remaining > 0.01
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-green-600 hover:bg-green-700 transform active:scale-95"
              }`}
            >
              CONCLUIR VENDA
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Vendas;
