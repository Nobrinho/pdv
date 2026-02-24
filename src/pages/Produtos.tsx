import React, { useState, useMemo } from "react";
import { useAlert } from "../context/AlertSystem";
import { useProducts } from "../hooks/useProducts";
import { Product, User } from "../types";
import ProductTable from "../components/products/ProductTable";
import ProductModal from "../components/products/ProductModal";
import StockModal from "../components/products/StockModal";
import SecurityModal from "../components/shared/SecurityModal";

interface ProdutosProps {
  user: User;
}

const Produtos: React.FC<ProdutosProps> = ({ user }) => {
  const { showAlert, showConfirm } = useAlert();
  const { products, saveProduct, deleteProduct, updateStock, isLoading } = useProducts();

  // Estados de UI
  const [showProductModal, setShowProductModal] = useState(false);
  const [showStockModal, setShowStockModal] = useState(false);
  const [showSecurityModal, setShowSecurityModal] = useState(false);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("descricao");
  
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  // --- SEGURANÇA ---
  const withPermission = (action: () => void) => {
    if (user?.cargo === "admin") {
      action();
    } else {
      setPendingAction(() => action);
      setShowSecurityModal(true);
    }
  };

  const handleSecuritySuccess = () => {
    if (pendingAction) pendingAction();
    setPendingAction(null);
  };

  // --- FILTROS ---
  const filteredAndSortedProducts = useMemo(() => {
    let result = products.filter(
      (p: { descricao: string; codigo: string; }) =>
        p.descricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.codigo.toLowerCase().includes(searchTerm.toLowerCase())
    );

    result.sort((a: { descricao: string; estoque_atual: any; preco_venda: number; }, b: { descricao: any; estoque_atual: any; preco_venda: number; }) => {
      switch (sortBy) {
        case "descricao":
          return a.descricao.localeCompare(b.descricao);
        case "estoque_asc":
          return (a.estoque_atual || 0) - (b.estoque_atual || 0);
        case "estoque_desc":
          return (b.estoque_atual || 0) - (a.estoque_atual || 0);
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

  // --- HANDLERS ---
  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setShowProductModal(true);
  };

  const handleCreate = () => {
    setEditingProduct(null);
    setShowProductModal(true);
  };

  const handleSaveProduct = async (productData: any) => {
    const result = await saveProduct(productData);
    if (result.success) {
      showAlert("Produto salvo!", "Sucesso", "success");
    } else {
      showAlert(result.error || "Erro ao salvar", "Erro", "error");
    }
    return result;
  };

  const handleDeleteProduct = async (id: number) => {
    const confirmou = await showConfirm(
      "Tem a certeza que deseja excluir este produto?"
    );
    if (confirmou) {
      const result = await deleteProduct(id);
      if (result.success) {
        showAlert("Produto excluído.", "Sucesso", "success");
      } else {
        showAlert(result.error || "Erro ao excluir", "Erro", "error");
      }
    }
  };

  const handleAddStock = (product: Product) => {
    setSelectedProduct(product);
    setShowStockModal(true);
  };

  const handleConfirmStock = async (id: number, quantity: number) => {
    const result = await updateStock(id, quantity);
    if (result.success) {
      setShowStockModal(false);
      showAlert("Estoque atualizado!", "Sucesso", "success");
    } else {
      showAlert(result.error || "Erro ao atualizar estoque", "Erro", "error");
    }
  };

  return (
    <div className="p-4 md:p-6 h-full flex flex-col w-full overflow-hidden">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
        <h1 className="text-xl md:text-2xl font-bold text-gray-800">
          Gerenciar Estoque
        </h1>
        <button
          onClick={() => withPermission(handleCreate)}
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

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <i className="fas fa-circle-notch fa-spin text-blue-500 text-3xl"></i>
        </div>
      ) : (
        <ProductTable
          products={filteredAndSortedProducts}
          onAddStock={(p) => withPermission(() => handleAddStock(p))}
          onEdit={(p) => withPermission(() => handleEdit(p))}
          onDelete={(id) => withPermission(() => handleDeleteProduct(id))}
        />
      )}

      <ProductModal
        isOpen={showProductModal}
        onClose={() => setShowProductModal(false)}
        onSave={handleSaveProduct}
        editingProduct={editingProduct}
      />

      <StockModal
        isOpen={showStockModal}
        onClose={() => setShowStockModal(false)}
        product={selectedProduct}
        onConfirm={handleConfirmStock}
      />

      <SecurityModal
        isOpen={showSecurityModal}
        onClose={() => setShowSecurityModal(false)}
        onSuccess={handleSecuritySuccess}
      />
    </div>
  );
};

export default Produtos;
