// @ts-nocheck
import React, { useState, useEffect, useMemo } from "react";
import { useAlert } from "../context/AlertSystem";

const Produtos = ({ user }) => {
  const { showAlert, showConfirm } = useAlert();
  const [products, setProducts] = useState([]);

  // Modais
  const [showProductModal, setShowProductModal] = useState(false);
  const [showStockModal, setShowStockModal] = useState(false);

  // Filtros e Ordenação
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("descricao");

  // Estados de Dados (Formulários)
  const [formData, setFormData] = useState({
    codigo: "",
    descricao: "",
    custo: "",
    preco_venda: "",
    estoque_atual: "",
    tipo: "novo", // <--- NOVO CAMPO: Padrão é novo
  });

  const [stockData, setStockData] = useState({
    id: null,
    nome: "",
    quantidade_atual: 0,
    quantidade_adicionar: "",
  });

  const [editingId, setEditingId] = useState(null);

  // --- SEGURANÇA (Modal Supervisor) ---
  const [showSecurityModal, setShowSecurityModal] = useState(false);
  const [securityData, setSecurityData] = useState({ user: "", pass: "" });
  const [pendingAction, setPendingAction] = useState(null);

  const withPermission = (action) => {
    if (user?.cargo === "admin") {
      action();
    } else {
      setPendingAction(() => action);
      setSecurityData({ user: "", pass: "" });
      setShowSecurityModal(true);
    }
  };

  const handleSecurityAuth = async (e) => {
    e.preventDefault();
    try {
      const result = await window.api.loginAttempt({
        username: securityData.user,
        password: securityData.pass,
      });

      if (result.success && result.user.cargo === "admin") {
        setShowSecurityModal(false);
        if (pendingAction) pendingAction();
        setPendingAction(null);
      } else {
        showAlert("Credenciais inválidas ou sem permissão de admin.", "Acesso Negado", "error");
      }
    } catch (error) {
      showAlert("Erro ao validar permissão.", "Erro", "error");
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const data = await window.api.getProducts();
      setProducts(data || []);
    } catch (error) {
      console.error(error);
      showAlert("Erro ao carregar produtos", "Erro", "error");
    }
  };

  // --- LÓGICA DE FILTRO E ORDENAÇÃO ---
  const filteredAndSortedProducts = useMemo(() => {
    let result = products.filter(
      (p) =>
        p.descricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.codigo.toLowerCase().includes(searchTerm.toLowerCase()),
    );

    result.sort((a, b) => {
      switch (sortBy) {
        case "descricao":
          return a.descricao.localeCompare(b.descricao);
        case "estoque_asc":
          return a.estoque_atual - b.estoque_atual;
        case "estoque_desc":
          return b.estoque_atual - a.estoque_atual;
        case "preco_asc":
          return a.preco_venda - b.preco_venda;
        case "preco_desc":
          return b.preco_venda - a.preco_venda;
        default:
          return 0;
      }
    });

    return result;
  }, [products, searchTerm, sortBy]);

  // --- CRUD PRODUTO ---
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.codigo.trim()) {
      // Se vazio, deixamos o backend gerar AUTO, ou forçamos aqui se preferir
      // return showAlert("O campo Código é obrigatório.", "Erro", "error");
    }

    const productToSave = {
      ...formData,
      custo: parseFloat(formData.custo),
      preco_venda: parseFloat(formData.preco_venda),
      estoque_atual: parseInt(formData.estoque_atual),
      tipo: formData.tipo, // Garante que o tipo vai pro backend
    };

    if (editingId) productToSave.id = editingId;

    const result = await window.api.saveProduct(productToSave);

    if (result.success) {
      setShowProductModal(false);
      resetForm();
      loadProducts();
      showAlert("Produto salvo!", "Sucesso", "success");
    } else {
      showAlert(result.error, "Erro", "error");
    }
  };

  const handleEdit = (product) => {
    setFormData({
      ...product,
      // Garante que produtos antigos sem 'tipo' sejam tratados como 'novo'
      tipo: product.tipo || "novo",
    });
    setEditingId(product.id);
    setShowProductModal(true);
  };

  const resetForm = () => {
    setFormData({
      codigo: "",
      descricao: "",
      custo: "",
      preco_venda: "",
      estoque_atual: "",
      tipo: "novo", // Reset para novo
    });
    setEditingId(null);
  };

  // --- REPOSIÇÃO DE ESTOQUE ---
  const openStockModal = (product) => {
    setStockData({
      id: product.id,
      nome: product.descricao,
      quantidade_atual: product.estoque_atual,
      quantidade_adicionar: "",
    });
    setShowStockModal(true);
  };

  const handleStockSubmit = async (e) => {
    e.preventDefault();
    const qtdAdicionar = parseInt(stockData.quantidade_adicionar);

    if (isNaN(qtdAdicionar) || qtdAdicionar <= 0) {
      return showAlert("Digite uma quantidade válida.", "Erro", "error");
    }

    const product = products.find((p) => p.id === stockData.id);
    const updatedProduct = {
      ...product,
      estoque_atual: product.estoque_atual + qtdAdicionar,
    };

    await window.api.saveProduct(updatedProduct);
    setShowStockModal(false);
    loadProducts();
    showAlert("Estoque atualizado!", "Sucesso", "success");
  };

  const handleDelete = async (id) => {
    const confirmou = await showConfirm(
      "Tem a certeza que deseja excluir este produto?",
    );
    if (confirmou) {
      const result = await window.api.deleteProduct(id);
      if (result.success) {
        loadProducts();
        showAlert("Produto excluído.", "Sucesso", "success");
      } else {
        showAlert(result.error, "Não foi possível excluir", "error");
      }
    }
  };

  return (
    <div className="p-4 md:p-6 h-full flex flex-col w-full overflow-hidden">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
        <h1 className="text-xl md:text-2xl font-bold text-gray-800">
          Gerenciar Estoque
        </h1>
        <button
          onClick={() => withPermission(() => {
            resetForm();
            setShowProductModal(true);
          })}
          className="w-full sm:w-auto bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition flex items-center justify-center shadow-md text-sm md:text-base whitespace-nowrap"
        >
          <i className="fas fa-box-open mr-2"></i> Novo Produto
        </button>
      </div>

      <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-200 mb-4 flex flex-col md:flex-row gap-3">
        <div className="flex-1 relative">
          <i className="fas fa-search absolute left-3 top-3 text-gray-400"></i>
          <input
            type="text"
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            placeholder="Buscar por nome ou código..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="w-full md:w-48">
          <select
            className="w-full border border-gray-300 rounded-lg py-2 px-3 outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="descricao">Nome (A-Z)</option>
            <option value="estoque_asc">Estoque (Menor)</option>
            <option value="estoque_desc">Estoque (Maior)</option>
            <option value="preco_asc">Preço (Menor)</option>
            <option value="preco_desc">Preço (Maior)</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-md flex-1 overflow-hidden border border-gray-100 flex flex-col">
        <div className="overflow-auto flex-1 custom-scrollbar">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="px-3 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider w-20">
                  Cód.
                </th>
                <th className="px-3 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider min-w-[150px]">
                  Descrição
                </th>
                <th className="px-3 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Tipo
                </th>
                <th className="hidden md:table-cell px-3 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Custo
                </th>
                <th className="px-3 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Venda
                </th>
                <th className="px-3 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Saldo
                </th>
                <th className="px-3 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider w-28">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredAndSortedProducts.map((p) => (
                <tr
                  key={p.id}
                  className={`hover:bg-gray-50 transition-colors ${p.estoque_atual === 0 ? "bg-red-50" : ""}`}
                >
                  <td className="px-3 py-3 whitespace-nowrap text-xs md:text-sm font-medium text-gray-900">
                    {p.codigo}
                  </td>
                  <td className="px-3 py-3 text-xs md:text-sm text-gray-700 break-words whitespace-normal font-medium">
                    {p.descricao}
                  </td>

                  {/* Coluna Tipo (NOVA) */}
                  <td className="px-3 py-3 whitespace-nowrap text-center">
                    <span
                      className={`px-2 py-1 rounded text-[10px] font-bold uppercase border ${
                        p.tipo === "usado"
                          ? "bg-orange-50 text-orange-700 border-orange-200"
                          : "bg-blue-50 text-blue-700 border-blue-200"
                      }`}
                    >
                      {p.tipo === "usado" ? "USADO" : "NOVO"}
                    </span>
                  </td>

                  <td className="hidden md:table-cell px-3 py-3 whitespace-nowrap text-xs md:text-sm text-right text-gray-500">
                    R$ {p.custo.toFixed(2)}
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap text-xs md:text-sm text-right font-medium text-gray-900">
                    R$ {p.preco_venda.toFixed(2)}
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap text-center">
                    <span
                      className={`px-2 py-1 inline-flex text-xs leading-4 font-bold rounded-full ${p.estoque_atual > 5 ? "bg-green-100 text-green-800" : p.estoque_atual > 0 ? "bg-yellow-100 text-yellow-800" : "bg-red-200 text-red-900"}`}
                    >
                      {p.estoque_atual}
                    </span>
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap text-center text-sm font-medium">
                    <div className="flex justify-center items-center gap-1 md:gap-2">
                      <button
                        onClick={() => withPermission(() => openStockModal(p))}
                        className="text-white bg-green-500 hover:bg-green-600 w-7 h-7 md:w-8 md:h-8 rounded transition shadow-sm flex items-center justify-center"
                      >
                        <i className="fas fa-plus text-xs"></i>
                      </button>
                      <button
                        onClick={() => withPermission(() => handleEdit(p))}
                        className="text-white bg-blue-500 hover:bg-blue-600 w-7 h-7 md:w-8 md:h-8 rounded transition shadow-sm flex items-center justify-center"
                      >
                        <i className="fas fa-edit text-xs"></i>
                      </button>
                      <button
                        onClick={() => withPermission(() => handleDelete(p.id))}
                        className="text-white bg-red-500 hover:bg-red-600 w-7 h-7 md:w-8 md:h-8 rounded transition shadow-sm flex items-center justify-center"
                      >
                        <i className="fas fa-trash text-xs"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {products.length === 0 && (
                <tr>
                  <td
                    colSpan="7"
                    className="px-6 py-12 text-center text-gray-500 flex flex-col items-center justify-center"
                  >
                    <i className="fas fa-box-open text-3xl mb-2 opacity-30"></i>
                    <span className="text-sm">Nenhum produto encontrado.</span>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- MODAL DE PRODUTO --- */}
      {showProductModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50 animate-fade-in backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md transform transition-all scale-100 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4 text-gray-800 border-b pb-2 flex items-center justify-between">
              <span>{editingId ? "Editar Produto" : "Cadastrar Produto"}</span>
              <button
                onClick={() => setShowProductModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <i className="fas fa-times"></i>
              </button>
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* SELETOR DE TIPO (NOVO) */}
              <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                  Tipo de Produto
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="tipo"
                      value="novo"
                      checked={formData.tipo === "novo"}
                      onChange={(e) =>
                        setFormData({ ...formData, tipo: e.target.value })
                      }
                      className="mr-2 w-4 h-4 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      Novo (Peça)
                    </span>
                  </label>
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="tipo"
                      value="usado"
                      checked={formData.tipo === "usado"}
                      onChange={(e) =>
                        setFormData({ ...formData, tipo: e.target.value })
                      }
                      className="mr-2 w-4 h-4 text-orange-600 focus:ring-orange-500"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      Usado (Desmonte)
                    </span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                  Código
                </label>
                <input
                  className="block w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none transition"
                  value={formData.codigo}
                  onChange={(e) =>
                    setFormData({ ...formData, codigo: e.target.value })
                  }
                  placeholder="Ex: 12345"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                  Descrição
                </label>
                <input
                  className="block w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none transition"
                  value={formData.descricao}
                  onChange={(e) =>
                    setFormData({ ...formData, descricao: e.target.value })
                  }
                  placeholder="Ex: Óleo de Motor 1L"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                    Preço Custo
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    className="block w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none transition"
                    value={formData.custo}
                    onChange={(e) =>
                      setFormData({ ...formData, custo: e.target.value })
                    }
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                    Preço Venda
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    className="block w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none transition"
                    value={formData.preco_venda}
                    onChange={(e) =>
                      setFormData({ ...formData, preco_venda: e.target.value })
                    }
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                  {editingId ? "Ajustar Estoque Total" : "Estoque Inicial"}
                </label>
                <input
                  type="number"
                  className="block w-full border border-gray-300 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none transition"
                  value={formData.estoque_atual}
                  onChange={(e) =>
                    setFormData({ ...formData, estoque_atual: e.target.value })
                  }
                  required
                />
              </div>
              <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setShowProductModal(false)}
                  className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition font-medium text-sm"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-bold text-sm shadow-md"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL DE REPOSIÇÃO DE ESTOQUE --- */}
      {showStockModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50 animate-fade-in backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm transform transition-all scale-100">
            <h2 className="text-lg font-bold mb-1 text-green-700 flex items-center">
              <i className="fas fa-plus-circle mr-2"></i> Entrada de Estoque
            </h2>
            <p className="text-sm text-gray-500 mb-4 border-b pb-2 truncate">
              Produto: <strong>{stockData.nome}</strong>
            </p>
            <form onSubmit={handleStockSubmit}>
              <div className="mb-4">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Atual</span>
                  <span>Novo Total</span>
                </div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="bg-gray-100 px-3 py-1 rounded font-bold text-gray-600">
                    {stockData.quantidade_atual}
                  </span>
                  <i className="fas fa-arrow-right text-gray-400 text-xs"></i>
                  <span className="bg-green-50 px-3 py-1 rounded font-bold text-green-700">
                    {stockData.quantidade_atual +
                      (parseInt(stockData.quantidade_adicionar) || 0)}
                  </span>
                </div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                  Quantidade a Adicionar
                </label>
                <input
                  type="number"
                  min="1"
                  className="block w-full border-2 border-green-100 rounded-lg p-3 text-xl font-bold text-center text-green-700 focus:border-green-500 focus:ring-0 outline-none transition"
                  value={stockData.quantidade_adicionar}
                  onChange={(e) =>
                    setStockData({
                      ...stockData,
                      quantidade_adicionar: e.target.value,
                    })
                  }
                  autoFocus
                  placeholder="0"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowStockModal(false)}
                  className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-medium text-sm"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 font-bold text-sm shadow-md"
                >
                  Confirmar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL DE SEGURANÇA (SUPERVISOR) --- */}
      {showSecurityModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[60] animate-fade-in">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-96 border-2 border-red-100">
            <h2 className="text-xl font-bold text-gray-800 mb-4 text-center flex flex-col items-center">
              <i className="fas fa-user-lock text-red-500 text-3xl mb-2"></i>
              Autorização Necessária
            </h2>
            <p className="text-sm text-gray-500 text-center mb-4">
              Esta ação requer permissão de um administrador.
            </p>
            <form onSubmit={handleSecurityAuth} className="space-y-4">
              <div className="bg-gray-50 p-3 rounded-lg">
                <input
                  className="w-full border border-gray-300 rounded p-2 text-sm mb-2 outline-none focus:border-red-500"
                  placeholder="Usuário Admin"
                  value={securityData.user}
                  onChange={(e) => setSecurityData({ ...securityData, user: e.target.value })}
                  autoFocus
                />
                <input
                  type="password"
                  className="w-full border border-gray-300 rounded p-2 text-sm outline-none focus:border-red-500"
                  placeholder="Senha"
                  value={securityData.pass}
                  onChange={(e) => setSecurityData({ ...securityData, pass: e.target.value })}
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowSecurityModal(false)}
                  className="flex-1 bg-gray-100 py-2 rounded-lg font-medium hover:bg-gray-200 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-red-600 text-white py-2 rounded-lg font-bold hover:bg-red-700 transition shadow"
                >
                  AUTORIZAR
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Produtos;