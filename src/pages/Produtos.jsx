// @ts-nocheck
import React, { useState, useEffect } from "react";
import { useAlert } from "../context/AlertSystem";

const Produtos = () => {
  const { showAlert, showConfirm } = useAlert();
  const [products, setProducts] = useState([]);
  const [showProductModal, setShowProductModal] = useState(false);
  const [showStockModal, setShowStockModal] = useState(false);

  // Estados de Dados
  const [formData, setFormData] = useState({
    codigo: "",
    descricao: "",
    custo: "",
    preco_venda: "",
    estoque_atual: "",
  });
  const [stockData, setStockData] = useState({
    id: null,
    nome: "",
    quantidade_atual: 0,
    quantidade_adicionar: "",
  });
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    const data = await window.api.getProducts();
    setProducts(data);
  };

  // --- CRUD PRODUTO ---
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.codigo.trim()) {
      return showAlert("O campo Código é obrigatório.", "Erro", "error");
    }

    const productToSave = {
      ...formData,
      custo: parseFloat(formData.custo),
      preco_venda: parseFloat(formData.preco_venda),
      estoque_atual: parseInt(formData.estoque_atual),
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
    setFormData(product);
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

  // --- EXCLUSÃO SEGURA ---
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
    <div className="p-4 md:p-6 h-full flex flex-col w-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-6 gap-4">
        <h1 className="text-xl md:text-2xl font-bold text-gray-800">
          Gerenciar Estoque
        </h1>
        <button
          onClick={() => {
            resetForm();
            setShowProductModal(true);
          }}
          className="w-full sm:w-auto bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition flex items-center justify-center shadow-md text-sm md:text-base"
        >
          <i className="fas fa-box-open mr-2"></i> Novo Produto
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-md flex-1 overflow-hidden border border-gray-100 flex flex-col">
        <div className="overflow-auto flex-1">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="px-3 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider w-20">
                  Cód.
                </th>
                <th className="px-3 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider min-w-[150px]">
                  Descrição
                </th>
                {/* Coluna Custo oculta em telas pequenas para economizar espaço */}
                <th className="hidden md:table-cell px-3 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Custo
                </th>
                <th className="px-3 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Venda
                </th>
                <th className="px-3 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Saldo
                </th>
                <th className="px-3 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider w-24">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {products.map((p) => (
                <tr
                  key={p.id}
                  className={`hover:bg-gray-50 transition-colors ${
                    p.estoque_atual === 0 ? "bg-red-50" : ""
                  }`}
                >
                  <td className="px-3 py-3 whitespace-nowrap text-xs md:text-sm font-medium text-gray-900">
                    {p.codigo}
                  </td>
                  <td className="px-3 py-3 text-xs md:text-sm text-gray-700 break-words whitespace-normal">
                    {p.descricao}
                  </td>
                  <td className="hidden md:table-cell px-3 py-3 whitespace-nowrap text-xs md:text-sm text-right text-gray-500">
                    R$ {p.custo.toFixed(2)}
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap text-xs md:text-sm text-right font-medium text-gray-900">
                    R$ {p.preco_venda.toFixed(2)}
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap text-center">
                    <span
                      className={`px-2 py-1 inline-flex text-xs leading-4 font-bold rounded-full ${
                        p.estoque_atual > 5
                          ? "bg-green-100 text-green-800"
                          : p.estoque_atual > 0
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-red-200 text-red-900"
                      }`}
                    >
                      {p.estoque_atual}
                    </span>
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap text-center text-sm font-medium">
                    <div className="flex justify-center items-center gap-1 md:gap-2">
                      <button
                        onClick={() => openStockModal(p)}
                        className="text-white bg-green-500 hover:bg-green-600 p-1.5 rounded transition shadow-sm"
                        title="Repor Estoque"
                      >
                        <i className="fas fa-plus w-3 h-3 md:w-4 md:h-4 flex items-center justify-center"></i>
                      </button>
                      <button
                        onClick={() => handleEdit(p)}
                        className="text-blue-600 hover:text-blue-900 p-1.5 hover:bg-blue-50 rounded transition"
                        title="Editar"
                      >
                        <i className="fas fa-edit w-4 h-4 md:w-5 md:h-5"></i>
                      </button>
                      <button
                        onClick={() => handleDelete(p.id)}
                        className="text-red-500 hover:text-red-700 p-1.5 hover:bg-red-50 rounded transition"
                        title="Excluir"
                      >
                        <i className="fas fa-trash w-4 h-4 md:w-5 md:h-5"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {products.length === 0 && (
                <tr>
                  <td
                    colSpan="6"
                    className="px-6 py-10 text-center text-gray-500 flex flex-col items-center justify-center"
                  >
                    <i className="fas fa-box-open text-4xl mb-2 opacity-30"></i>
                    <span className="text-sm">Nenhum produto cadastrado.</span>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- MODAL DE PRODUTO (CRIAR/EDITAR) --- */}
      {showProductModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md transform transition-all scale-100 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4 text-gray-800 border-b pb-2">
              {editingId ? "Editar Produto" : "Cadastrar Produto"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                  Código
                </label>
                <input
                  className="block w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none"
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
                  className="block w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none"
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
                    className="block w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none"
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
                    className="block w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none"
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
                  className="block w-full border border-gray-300 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                  value={formData.estoque_atual}
                  onChange={(e) =>
                    setFormData({ ...formData, estoque_atual: e.target.value })
                  }
                  required
                />
              </div>
              <div className="flex justify-end gap-3 mt-6 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setShowProductModal(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-bold"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL DE REPOSIÇÃO DE ESTOQUE (+) --- */}
      {showStockModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 animate-fade-in">
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
                  className="block w-full border-2 border-green-100 rounded-lg p-3 text-xl font-bold text-center text-green-700 focus:border-green-500 focus:ring-0 outline-none"
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
                  className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-bold"
                >
                  Confirmar
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
