// @ts-nocheck
import React, { useState, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as XLSX from "xlsx";
import { useAlert } from "../context/AlertSystem";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";
import { formatCurrency } from "../utils/format";
import { buildProductImportPreviewRows } from "../utils/productImport";
import {
  downloadProductTemplate,
  exportProductsToCsv,
  exportProductsToExcel,
} from "../utils/productSpreadsheet";
import ProductListPanel from "../components/products/ProductListPanel";
import ProductFormModal from "../components/products/ProductFormModal";
import ProductImportModal from "../components/products/ProductImportModal";
import ProductsToolbar from "../components/products/ProductsToolbar";
import StockEntryModal from "../components/products/StockEntryModal";
import { Badge } from "../components/ui/Badge";
import { Icon } from "../components/ui/Icon";

const INITIAL_PRODUCT_FORM = {
  codigo: "",
  descricao: "",
  custo: "",
  preco_venda: "",
  estoque_atual: "",
  tipo: "novo",
};

const INITIAL_STOCK_FORM = {
  id: null,
  nome: "",
  quantidade_atual: 0,
  quantidade_adicionar: "",
};

const Produtos = () => {
  const { showAlert, showConfirm } = useAlert();
  const { withPermission } = useAuth();
  const queryClient = useQueryClient();
  const {
    data: products = [],
    isLoading: loading,
    isError: productsError,
  } = useQuery({ queryKey: ["products"], queryFn: () => api.products.list() });
  const loadError = productsError ? "Nao foi possivel carregar os produtos." : "";
  const refreshProducts = () => queryClient.invalidateQueries({ queryKey: ["products"] });
  const [isSavingProduct, setIsSavingProduct] = useState(false);
  const [isUpdatingStock, setIsUpdatingStock] = useState(false);
  const [deletingProductId, setDeletingProductId] = useState(null);

  // Modais
  const [showProductModal, setShowProductModal] = useState(false);
  const [showStockModal, setShowStockModal] = useState(false);

  // Filtros e Ordenação
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("descricao");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 100;

  // Estados de Dados (Formulários)
  const [formData, setFormData] = useState(INITIAL_PRODUCT_FORM);

  const [stockData, setStockData] = useState(INITIAL_STOCK_FORM);

  const [editingId, setEditingId] = useState(null);

  // --- IMPORTAÇÃO EM LOTE ---
  const [showImportModal, setShowImportModal] = useState(false);
  const [importData, setImportData] = useState([]);
  const [importFileName, setImportFileName] = useState("");
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [conflictMode, setConflictMode] = useState("skip");
  const [showImportHelp, setShowImportHelp] = useState(false);

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

  const totalPages = Math.ceil(filteredAndSortedProducts.length / PAGE_SIZE);
  const paginatedProducts = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredAndSortedProducts.slice(start, start + PAGE_SIZE);
  }, [filteredAndSortedProducts, page]);

  useEffect(() => {
    setPage(1);
  }, [searchTerm, sortBy]);

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (isSavingProduct) return;

    const productToSave = {
      ...formData,
      custo: parseFloat(formData.custo || 0),
      preco_venda: parseFloat(formData.preco_venda || 0),
      estoque_atual: parseInt(formData.estoque_atual || 0),
    };

    if (editingId) productToSave.id = editingId;
    if (!String(productToSave.descricao || "").trim()) {
      return showAlert("Descricao obrigatoria.", "Atencao", "warning");
    }
    if (Number(productToSave.custo) < 0 || Number(productToSave.preco_venda) < 0 || Number(productToSave.estoque_atual) < 0) {
      return showAlert("Custo, preco e estoque nao podem ser negativos.", "Atencao", "warning");
    }

    try {
      setIsSavingProduct(true);
      const result = await api.products.save(productToSave);

      if (result.success) {
        setShowProductModal(false);
        resetForm();
        refreshProducts();
        showAlert(editingId ? "Produto atualizado!" : "Produto cadastrado!", "Sucesso", "success");
      } else {
        showAlert(result.error, "Erro", "error");
      }
    } catch (error) {
      showAlert("Erro técnico ao salvar produto.", "Erro", "error");
    } finally {
      setIsSavingProduct(false);
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
    setFormData(INITIAL_PRODUCT_FORM);
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
    if (isUpdatingStock) return;
    const qtdAdicionar = parseInt(stockData.quantidade_adicionar);

    if (isNaN(qtdAdicionar) || qtdAdicionar <= 0) {
      return showAlert("Digite uma quantidade válida.", "Erro", "error");
    }

    try {
      setIsUpdatingStock(true);
      const product = products.find((p) => p.id === stockData.id);
      const updatedProduct = {
        ...product,
        estoque_atual: product.estoque_atual + qtdAdicionar,
      };

      await api.products.save(updatedProduct);
      setShowStockModal(false);
      refreshProducts();
      showAlert("Estoque atualizado!", "Sucesso", "success");
    } catch (error) {
      showAlert("Erro ao atualizar estoque.", "Erro", "error");
    } finally {
      setIsUpdatingStock(false);
    }
  };

  const handleDelete = async (id) => {
    const confirmou = await showConfirm("Tem a certeza que deseja excluir este produto?");
    if (confirmou) {
      try {
        setDeletingProductId(id);
        const result = await api.products.delete(id);
        if (result.success) {
          refreshProducts();
          showAlert("Produto excluído.", "Sucesso", "success");
        } else {
          showAlert(result.error, "Não foi possível excluir", "error");
        }
      } catch (error) {
        showAlert("Erro técnico ao excluir.", "Erro", "error");
      } finally {
        setDeletingProductId(null);
      }
    }
  };  // === SELECIONAR ARQUIVO ===
  const selectSpreadsheetInBrowser = () =>
    new Promise((resolve) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = [
        ".xlsx",
        ".xls",
        ".csv",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.ms-excel",
        "text/csv",
      ].join(",");
      input.onchange = async () => {
        const file = input.files?.[0];
        if (!file) return resolve({ canceled: true });

        try {
          const buffer = await file.arrayBuffer();
          resolve({
            canceled: false,
            fileName: file.name,
            bytes: new Uint8Array(buffer),
          });
        } catch (error) {
          resolve({
            canceled: false,
            error: error.message || "Nao foi possivel ler o arquivo.",
          });
        }
      };
      input.click();
    });

  const handleSelectFile = async () => {
    try {
      const fileResult = api.isRemote
        ? await selectSpreadsheetInBrowser()
        : await api.system.openFileDialog();
      if (fileResult.canceled) return;
      if (fileResult.error) throw new Error(fileResult.error);

      setImportFileName(fileResult.fileName);
      setImportResult(null);

      let bytes = fileResult.bytes;
      if (!bytes) {
        const binaryStr = atob(fileResult.buffer);
        bytes = new Uint8Array(binaryStr.length);
        for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);
      }

      const workbook = XLSX.read(bytes, { type: "array" });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const rawData = XLSX.utils.sheet_to_json(firstSheet, { defval: "" });

      if (rawData.length === 0) {
        return showAlert("A planilha está vazia ou sem dados válidos.", "Aviso", "warning");
      }      const preview = buildProductImportPreviewRows(rawData, products);

      if (!preview.hasDescriptionColumn) {
        return showAlert(
          "Coluna \"Descrição\" não encontrada. Verifique os cabeçalhos da planilha.",
          "Erro de Formato", "error"
        );
      }

      setImportData(preview.rows);
    } catch (error) {
      console.error("Erro ao ler planilha:", error);
      showAlert("Erro ao ler o arquivo: " + error.message, "Erro", "error");
    }
  };

  // === REMOVER LINHA DO PREVIEW ===
  const removeImportRow = (idx) => {
    setImportData(prev => prev.filter((_, i) => i !== idx));
  };

  const resetImportState = () => {
    setImportData([]);
    setImportFileName("");
    setImportResult(null);
    setConflictMode("skip");
    setShowImportHelp(false);
  };

  const openImportModal = () => {
    resetImportState();
    setShowImportModal(true);
  };

  const closeImportModal = () => {
    setShowImportModal(false);
    setShowImportHelp(false);
  };

  const closeImportResult = () => {
    setShowImportModal(false);
    resetImportState();
  };

  const openNewProductModal = () => {
    resetForm();
    setShowProductModal(true);
  };

  // === EXECUTAR IMPORTAÇÃO ===
  const handleImportBatch = async () => {
    const validRows = importData
      .filter(r => r._status !== "error")
      .map(({ _row, _status, _statusMsg, ...rest }) => rest);

    if (validRows.length === 0) {
      return showAlert("Não há produtos válidos para importar.", "Aviso", "warning");
    }

    try {
      setImporting(true);
      const result = await api.products.importBatch({ products: validRows, conflictMode });

      if (result.success) {
        setImportResult(result);
        refreshProducts();
        showAlert(
          `Importação concluída! ${result.created} criados, ${result.updated} atualizados, ${result.skipped} pulados, ${result.errors.length} erros.`,
          "Sucesso", "success"
        );
      } else {
        showAlert("Erro na importação: " + result.error, "Erro", "error");
      }
    } catch (error) {
      showAlert("Erro técnico na importação.", "Erro", "error");
    } finally {
      setImporting(false);
    }
  };

  // === BAIXAR MODELO ===
  const handleDownloadTemplate = () => {
    downloadProductTemplate();
  };

  // === EXPORTAR PRODUTOS DO BANCO ===
  const handleExportProducts = () => {
    if (products.length === 0) {
      return showAlert("Não há produtos cadastrados para exportar.", "Aviso", "warning");
    }
    exportProductsToExcel(products);
    showAlert(`${products.length} produtos exportados com sucesso!`, "Sucesso", "success");
  };

  // === EXPORTAR PRODUTOS COMO CSV ===
  const handleExportCSV = () => {
    if (products.length === 0) {
      return showAlert("Não há produtos cadastrados para exportar.", "Aviso", "warning");
    }
    exportProductsToCsv(products);
    showAlert(`${products.length} produtos exportados em CSV com sucesso!`, "Sucesso", "success");
  };

  // Contadores de status para preview
  const importStats = useMemo(() => {
    const stats = { new: 0, duplicate: 0, error: 0 };
    importData.forEach(r => { if (stats[r._status] !== undefined) stats[r._status]++; });
    return stats;
  }, [importData]);

  const validImportCount = useMemo(
    () => importData.filter((row) => row._status !== "error").length,
    [importData],
  );

  const margin = (row) =>
    row.preco_venda > 0 ? ((row.preco_venda - (row.custo || 0)) / row.preco_venda) * 100 : 0;

  const columns = [
    {
      key: "codigo",
      label: "Cód.",
      format: (val) => (
        <span className="text-[var(--muted-foreground)]" style={{ fontFamily: "var(--font-mono)" }}>{val}</span>
      ),
    },
    { key: "descricao", label: "Descrição", bold: true },
    {
      key: "tipo",
      label: "Tipo",
      align: "center",
      format: (val) => (
        <Badge variant={val === "usado" ? "warning" : "info"}>{val === "usado" ? "Usado" : "Novo"}</Badge>
      ),
    },
    { key: "custo", label: "Custo", align: "right", format: formatCurrency },
    { key: "preco_venda", label: "Venda", align: "right", format: formatCurrency },
    {
      key: "margem",
      label: "Margem",
      align: "right",
      format: (_, row) => (
        <span className="text-[var(--money-positive)] font-medium">
          {margin(row).toFixed(1).replace(".", ",")}%
        </span>
      ),
    },
    {
      key: "estoque_atual",
      label: "Saldo",
      align: "right",
      format: (val) => (
        <span
          className={
            val > 5 ? "text-[var(--foreground)]" : val > 0 ? "text-[var(--warning-icon)] font-semibold" : "text-[var(--danger)] font-semibold"
          }
        >
          {val}
        </span>
      ),
    },
    {
      key: "situacao",
      label: "Situação",
      align: "center",
      format: (_, row) => {
        const s = row.estoque_atual > 5 ? "emestoque" : row.estoque_atual > 0 ? "estoquebaixo" : "esgotado";
        return <Badge.Status status={s} />;
      },
    },
    {
      key: "id",
      label: "Ações",
      align: "center",
      format: (_, row) => (
        <div className="flex justify-center items-center gap-1">
          <button
            onClick={() => withPermission(() => openStockModal(row), "products.stock_entry")}
            className="p-2 rounded-[var(--radius-md)] text-[var(--muted-foreground)] hover:text-[var(--success)] hover:bg-[var(--hover-surface)] transition"
            title="Entrada de estoque"
          >
            <Icon name="plus" size={16} />
          </button>
          <button
            onClick={() => withPermission(() => handleEdit(row), "products.edit")}
            className="p-2 rounded-[var(--radius-md)] text-[var(--muted-foreground)] hover:text-[var(--primary)] hover:bg-[var(--hover-surface)] transition"
            title="Editar produto"
          >
            <Icon name="pencil" size={16} />
          </button>
          <button
            onClick={() => withPermission(() => handleDelete(row.id), "products.delete")}
            disabled={deletingProductId === row.id}
            className="p-2 rounded-[var(--radius-md)] text-[var(--muted-foreground)] hover:text-[var(--danger)] hover:bg-[var(--hover-surface)] transition disabled:opacity-50"
            title="Excluir"
          >
            <Icon name={deletingProductId === row.id ? "refresh-cw" : "trash-2"} size={16} className={deletingProductId === row.id ? "animate-spin" : ""} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="p-4 md:p-6 h-full flex flex-col bg-surface-50 overflow-hidden">
      <ProductsToolbar
        searchTerm={searchTerm}
        onSearchTermChange={setSearchTerm}
        sortBy={sortBy}
        onSortByChange={setSortBy}
        onImportClick={() => withPermission(openImportModal, "products.import")}
        onNewProductClick={() => withPermission(openNewProductModal, "products.create")}
      />

      <ProductListPanel
        columns={columns}
        data={paginatedProducts}
        loading={loading}
        error={loadError}
        emptyMessage="Nenhum produto em estoque."
        page={page}
        totalPages={totalPages}
        totalItems={filteredAndSortedProducts.length}
        onPreviousPage={() => setPage((currentPage) => Math.max(1, currentPage - 1))}
        onNextPage={() => setPage((currentPage) => Math.min(totalPages, currentPage + 1))}
        onRefresh={refreshProducts}
      />
      {/* --- MODAL DE PRODUTO --- */}
      <ProductFormModal
        isOpen={showProductModal}
        onClose={() => setShowProductModal(false)}
        onSubmit={handleSubmit}
        isSaving={isSavingProduct}
        editingId={editingId}
        formData={formData}
        onFormChange={(field, value) => setFormData({ ...formData, [field]: value })}
      />

      <StockEntryModal
        isOpen={showStockModal}
        onClose={() => setShowStockModal(false)}
        onSubmit={handleStockSubmit}
        isUpdating={isUpdatingStock}
        stockData={stockData}
        onQuantityChange={(value) => setStockData({ ...stockData, quantidade_adicionar: value })}
      />

      <ProductImportModal
        isOpen={showImportModal}
        onClose={closeImportModal}
        importResult={importResult}
        importing={importing}
        validImportCount={validImportCount}
        onImport={handleImportBatch}
        showImportHelp={showImportHelp}
        onToggleHelp={() => setShowImportHelp(!showImportHelp)}
        onDismissHelp={() => setShowImportHelp(false)}
        onSelectFile={handleSelectFile}
        onDownloadTemplate={handleDownloadTemplate}
        onExportProducts={handleExportProducts}
        onExportCSV={handleExportCSV}
        importFileName={importFileName}
        importData={importData}
        importStats={importStats}
        conflictMode={conflictMode}
        onConflictModeChange={setConflictMode}
        onRemoveRow={removeImportRow}
        onResetAndClose={closeImportResult}
      />
    </div>
  );
};

export default Produtos;









