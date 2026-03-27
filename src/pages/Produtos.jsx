// @ts-nocheck
import React, { useState, useEffect, useMemo } from "react";
import { useAlert } from "../context/AlertSystem";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";
import { formatCurrency } from "../utils/format";
import DataTable from "../components/ui/DataTable";
import FormField from "../components/ui/FormField";
import Modal from "../components/ui/Modal";
import StatusBadge from "../components/ui/StatusBadge";

const Produtos = () => {
  const { showAlert, showConfirm } = useAlert();
  const { withPermission } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);

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
    tipo: "novo",
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
    try {
      setLoading(true);
      const data = await api.products.list();
      setProducts(data || []);
    } catch (error) {
      console.error(error);
      showAlert("Erro ao carregar produtos", "Erro", "error");
    } finally {
      setLoading(false);
    }
  };

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
          return (a.preco_venda || 0) - (b.preco_venda || 0);
        case "preco_desc":
          return (b.preco_venda || 0) - (a.preco_venda || 0);
        default:
          return 0;
      }
    });

    return result;
  }, [products, searchTerm, sortBy]);

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();

    const productToSave = {
      ...formData,
      custo: parseFloat(formData.custo || 0),
      preco_venda: parseFloat(formData.preco_venda || 0),
      estoque_atual: parseInt(formData.estoque_atual || 0),
    };

    if (editingId) productToSave.id = editingId;

    try {
      const result = await api.products.save(productToSave);

      if (result.success) {
        setShowProductModal(false);
        resetForm();
        loadProducts();
        showAlert(editingId ? "Produto atualizado!" : "Produto cadastrado!", "Sucesso", "success");
      } else {
        showAlert(result.error, "Erro", "error");
      }
    } catch (error) {
      showAlert("Erro técnico ao salvar produto.", "Erro", "error");
    }
  };

  const handleEdit = (product) => {
    setFormData({
      ...product,
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
      tipo: "novo",
    });
    setEditingId(null);
  };

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
    if (e) e.preventDefault();
    const qtdAdicionar = parseInt(stockData.quantidade_adicionar);

    if (isNaN(qtdAdicionar) || qtdAdicionar <= 0) {
      return showAlert("Digite uma quantidade válida.", "Erro", "error");
    }

    try {
      const product = products.find((p) => p.id === stockData.id);
      const updatedProduct = {
        ...product,
        estoque_atual: product.estoque_atual + qtdAdicionar,
      };

      await api.products.save(updatedProduct);
      setShowStockModal(false);
      loadProducts();
      showAlert("Estoque atualizado!", "Sucesso", "success");
    } catch (error) {
      showAlert("Erro ao atualizar estoque.", "Erro", "error");
    }
  };

  const handleDelete = async (id) => {
    const confirmou = await showConfirm("Tem a certeza que deseja excluir este produto?");
    if (confirmou) {
      try {
        const result = await api.products.delete(id);
        if (result.success) {
          loadProducts();
          showAlert("Produto excluído.", "Sucesso", "success");
        } else {
          showAlert(result.error, "Não foi possível excluir", "error");
        }
      } catch (error) {
        showAlert("Erro técnico ao excluir.", "Erro", "error");
      }
    }
  };

  const columns = [
    { key: "codigo", label: "Cód.", bold: true },
    { key: "descricao", label: "Descrição", bold: true },
    { 
      key: "tipo", 
      label: "Tipo", 
      align: "center",
      format: (val) => (
        <StatusBadge 
          type={val === "usado" ? "usado" : "novo"} 
          label={val === "usado" ? "USADO" : "NOVO"} 
        />
      )
    },
    { key: "custo", label: "Custo", align: "right", format: formatCurrency },
    { key: "preco_venda", label: "Venda", align: "right", format: formatCurrency },
    {
      key: "estoque_atual",
      label: "Saldo",
      align: "center",
      format: (val) => (
        <span className={`px-2.5 py-1 text-xs font-black rounded-full shadow-sm ${
          val > 5 ? "bg-green-100 text-green-700" : val > 0 ? "bg-yellow-100 text-yellow-700 font-bold" : "bg-red-100 text-red-600"
        }`}>
          {val}
        </span>
      )
    },
    {
      key: "id",
      label: "Ações",
      align: "center",
      format: (_, row) => (
        <div className="flex justify-center items-center gap-2">
          <button
            onClick={() => withPermission(() => openStockModal(row))}
            className="text-white bg-green-600 hover:bg-green-700 p-2 rounded-lg transition shadow-sm active:scale-90"
            title="Entrada de Estoque"
          >
            <i className="fas fa-plus text-xs"></i>
          </button>
          <button
            onClick={() => withPermission(() => handleEdit(row))}
            className="text-white bg-blue-600 hover:bg-blue-700 p-2 rounded-lg transition shadow-sm active:scale-90"
            title="Editar Produto"
          >
            <i className="fas fa-edit text-xs"></i>
          </button>
          <button
            onClick={() => withPermission(() => handleDelete(row.id))}
            className="text-white bg-red-500 hover:bg-red-600 p-2 rounded-lg transition shadow-sm active:scale-90"
            title="Excluir"
          >
            <i className="fas fa-trash text-xs"></i>
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="p-4 md:p-6 h-full flex flex-col bg-gray-50 overflow-hidden">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-800">Gerenciar Estoque</h1>
          <p className="text-xs text-gray-500 mt-1">Controle de peças, preços e níveis de estoque.</p>
        </div>
        <button
          onClick={() => withPermission(() => { resetForm(); setShowProductModal(true); })}
          className="w-full sm:w-auto bg-blue-600 text-white px-5 py-2.5 rounded-xl hover:bg-blue-700 transition-all active:scale-95 flex items-center justify-center shadow-md font-bold text-sm gap-2"
        >
          <i className="fas fa-box-open"></i> Novo Produto
        </button>
      </div>

      <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 mb-4 flex flex-col md:flex-row gap-4 items-center">
        <FormField
          icon="fa-search"
          placeholder="Buscar por nome ou código..."
          value={searchTerm}
          onChange={setSearchTerm}
          className="flex-1"
        />
        <div className="w-full md:w-56">
          <select
            className="w-full border border-gray-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 text-sm bg-white transition-all"
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

      <div className="flex-1 overflow-hidden">
        <DataTable 
          columns={columns} 
          data={filteredAndSortedProducts} 
          loading={loading}
          emptyMessage="Nenhum produto em estoque."
        />
      </div>

      {/* --- MODAL DE PRODUTO --- */}
      <Modal
        isOpen={showProductModal}
        onClose={() => setShowProductModal(false)}
        title={editingId ? "Editar Produto" : "Cadastrar Produto"}
        icon="fa-tags"
        size="md"
        footer={
          <div className="flex justify-end gap-3 w-full">
            <button
              onClick={() => setShowProductModal(false)}
              className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition font-medium text-sm"
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              className="px-6 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition font-bold text-sm shadow-md active:scale-95"
            >
              <i className="fas fa-save mr-2"></i>
              {editingId ? "Atualizar" : "Salvar"}
            </button>
          </div>
        }
      >
        <div className="space-y-5">
          <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">
              Tipo de Produto
            </label>
            <div className="flex gap-6">
              <label className="flex items-center cursor-pointer group">
                <input
                  type="radio"
                  name="tipo"
                  value="novo"
                  checked={formData.tipo === "novo"}
                  onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                  className="mr-3 w-5 h-5 text-blue-600 border-gray-300 focus:ring-blue-500"
                />
                <span className={`text-sm font-bold ${formData.tipo === "novo" ? "text-blue-700" : "text-gray-500 group-hover:text-gray-700"}`}>
                  Novo (Peça)
                </span>
              </label>
              <label className="flex items-center cursor-pointer group">
                <input
                  type="radio"
                  name="tipo"
                  value="usado"
                  checked={formData.tipo === "usado"}
                  onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                  className="mr-3 w-5 h-5 text-orange-600 border-gray-300 focus:ring-orange-500"
                />
                <span className={`text-sm font-bold ${formData.tipo === "usado" ? "text-orange-700" : "text-gray-500 group-hover:text-gray-700"}`}>
                  Usado (Desmonte)
                </span>
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              label="Código"
              value={formData.codigo}
              onChange={(val) => setFormData({ ...formData, codigo: val })}
              placeholder="Ex: 12345"
              autoFocus
            />
            <FormField
              label="Descrição *"
              value={formData.descricao}
              onChange={(val) => setFormData({ ...formData, descricao: val })}
              placeholder="Ex: Óleo de Motor 1L"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <FormField
              label="Preço Custo"
              type="number"
              value={formData.custo}
              onChange={(val) => setFormData({ ...formData, custo: val })}
              icon="fa-dollar-sign"
              required
            />
            <FormField
              label="Preço Venda"
              type="number"
              value={formData.preco_venda}
              onChange={(val) => setFormData({ ...formData, preco_venda: val })}
              icon="fa-tag"
              required
            />
            <FormField
              label={editingId ? "Saldo Total" : "Estoque Inicial"}
              type="number"
              value={formData.estoque_atual}
              onChange={(val) => setFormData({ ...formData, estoque_atual: val })}
              icon="fa-warehouse"
              required
            />
          </div>
        </div>
      </Modal>

      {/* --- MODAL DE REPOSIÇÃO DE ESTOQUE --- */}
      <Modal
        isOpen={showStockModal}
        onClose={() => setShowStockModal(false)}
        title="Entrada de Estoque"
        icon="fa-plus-circle"
        size="md"
        footer={
          <div className="flex gap-2 w-full">
            <button
              type="button"
              onClick={() => setShowStockModal(false)}
              className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-medium text-sm hover:bg-gray-200 transition"
            >
              Cancelar
            </button>
            <button
              onClick={handleStockSubmit}
              className="flex-[2] px-4 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 font-black text-sm shadow-md active:scale-95 transition-all"
            >
              Confirmar Entrada
            </button>
          </div>
        }
      >
        <div className="space-y-6">
          <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
             <div className="text-xs font-bold text-gray-400 uppercase mb-2">Produto Selecionado</div>
             <div className="text-lg font-black text-gray-800">{stockData.nome}</div>
          </div>

          <div className="flex items-center justify-center gap-8 bg-blue-50/50 p-4 rounded-2xl border border-blue-100">
            <div className="text-center">
              <div className="text-[10px] font-black text-blue-400 uppercase mb-1">Atual</div>
              <div className="text-3xl font-black text-gray-400">{stockData.quantidade_atual}</div>
            </div>
            <i className="fas fa-arrow-right text-blue-200"></i>
            <div className="text-center">
              <div className="text-[10px] font-black text-green-500 uppercase mb-1">Novo</div>
              <div className="text-3xl font-black text-green-600">
                {stockData.quantidade_atual + (parseInt(stockData.quantidade_adicionar) || 0)}
              </div>
            </div>
          </div>

          <FormField
            label="Quantidade a Adicionar"
            type="number"
            min="1"
            value={stockData.quantidade_adicionar}
            onChange={(val) => setStockData({ ...stockData, quantidade_adicionar: val })}
            placeholder="0"
            className="text-center"
            autoFocus
          />
        </div>
      </Modal>
    </div>
  );
};

export default Produtos;