// @ts-nocheck
import React, { useState, useEffect } from "react";
import { useAlert } from "../context/AlertSystem"; // 1. Importar o hook

const Produtos = () => {
  const { showAlert, showConfirm } = useAlert(); // 2. Usar o hook
  const [products, setProducts] = useState([]);
  // Modais Locais (Apenas para formulários complexos)
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
    const productToSave = {
      ...formData,
      custo: parseFloat(formData.custo),
      preco_venda: parseFloat(formData.preco_venda),
      estoque_atual: parseInt(formData.estoque_atual),
    };

    if (editingId) productToSave.id = editingId;

    await window.api.saveProduct(productToSave);
    setShowProductModal(false);
    resetForm();
    loadProducts();
    showAlert("Produto salvo com sucesso!", "Sucesso", "success"); // Alerta bonito
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

  // --- EXCLUSÃO SEGURA (Refatorada) ---
  const handleDelete = async (id) => {
    // Substitui o confirm() nativo e o modal complexo antigo
    const confirmou = await showConfirm(
      "Tem a certeza que deseja excluir este produto?"
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
    <div className="p-6 h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Gerenciar Estoque</h1>
        <button
          onClick={() => {
            resetForm();
            setShowProductModal(true);
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition flex items-center shadow-md"
        >
          <i className="fas fa-box-open mr-2"></i> Novo Produto
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-md overflow-hidden flex-1 overflow-y-auto border border-gray-100">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50 sticky top-0 z-10">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                Código
              </th>
              <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                Descrição
              </th>
              <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">
                Custo
              </th>
              <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">
                Venda
              </th>
              <th className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">
                Saldo
              </th>
              <th className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">
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
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {p.codigo}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                  {p.descricao}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-500">
                  R$ {p.custo.toFixed(2)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-gray-900">
                  R$ {p.preco_venda.toFixed(2)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  <span
                    className={`px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-full ${
                      p.estoque_atual > 5
                        ? "bg-green-100 text-green-800"
                        : p.estoque_atual > 0
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-red-200 text-red-900"
                    }`}
                  >
                    {p.estoque_atual} un
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                  <div className="flex justify-center items-center gap-2">
                    <button
                      onClick={() => openStockModal(p)}
                      className="text-white bg-green-500 hover:bg-green-600 p-1.5 rounded-md transition shadow-sm"
                      title="Repor Estoque"
                    >
                      <i className="fas fa-plus w-4 h-4 flex items-center justify-center"></i>
                    </button>
                    <button
                      onClick={() => handleEdit(p)}
                      className="text-blue-600 hover:text-blue-900 p-1.5 hover:bg-blue-50 rounded-md transition"
                      title="Editar"
                    >
                      <i className="fas fa-edit w-4 h-4"></i>
                    </button>
                    <button
                      onClick={() => handleDelete(p.id)}
                      className="text-red-500 hover:text-red-700 p-1.5 hover:bg-red-50 rounded-md transition"
                      title="Excluir"
                    >
                      <i className="fas fa-trash w-4 h-4"></i>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {products.length === 0 && (
              <tr>
                <td
                  colSpan="6"
                  className="px-6 py-10 text-center text-gray-500"
                >
                  Nenhum produto cadastrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL DE PRODUTO e MODAL DE ESTOQUE (Mantêm-se iguais, pois são formulários complexos) */}
      {showProductModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4 text-gray-800 border-b pb-2">
              {editingId ? "Editar Produto" : "Cadastrar Produto"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                  Código
                </label>
                <input
                  className="block w-full border border-gray-300 rounded-lg p-2 outline-none focus:ring-2 focus:ring-blue-500"
                  value={formData.codigo}
                  onChange={(e) =>
                    setFormData({ ...formData, codigo: e.target.value })
                  }
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                  Descrição
                </label>
                <input
                  className="block w-full border border-gray-300 rounded-lg p-2 outline-none focus:ring-2 focus:ring-blue-500"
                  value={formData.descricao}
                  onChange={(e) =>
                    setFormData({ ...formData, descricao: e.target.value })
                  }
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                    Custo
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    className="block w-full border border-gray-300 rounded-lg p-2 outline-none focus:ring-2 focus:ring-blue-500"
                    value={formData.custo}
                    onChange={(e) =>
                      setFormData({ ...formData, custo: e.target.value })
                    }
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                    Venda
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    className="block w-full border border-gray-300 rounded-lg p-2 outline-none focus:ring-2 focus:ring-blue-500"
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
                  {editingId ? "Ajustar Estoque" : "Estoque Inicial"}
                </label>
                <input
                  type="number"
                  className="block w-full border border-gray-300 rounded-lg p-2 outline-none focus:ring-2 focus:ring-blue-500"
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
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showStockModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm">
            <h2 className="text-lg font-bold mb-1 text-green-700 flex items-center">
              <i className="fas fa-plus-circle mr-2"></i> Entrada de Estoque
            </h2>
            <p className="text-sm text-gray-500 mb-4 border-b pb-2">
              Produto: <strong>{stockData.nome}</strong>
            </p>
            <form onSubmit={handleStockSubmit}>
              <div className="mb-4">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                  Quantidade a Adicionar
                </label>
                <input
                  type="number"
                  min="1"
                  className="block w-full border-2 border-green-100 rounded-lg p-3 text-xl font-bold text-center text-green-700 focus:border-green-500 outline-none"
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
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg font-bold"
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
