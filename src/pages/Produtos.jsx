// @ts-nocheck
import React, { useState, useEffect, useMemo } from "react";
import * as XLSX from "xlsx";
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

  // --- IMPORTAÇÃO EM LOTE ---
  const [showImportModal, setShowImportModal] = useState(false);
  const [importData, setImportData] = useState([]);
  const [importFileName, setImportFileName] = useState("");
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [conflictMode, setConflictMode] = useState("skip");
  const [showImportHelp, setShowImportHelp] = useState(false);

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

  // === MAPEAMENTO FLEXÍVEL DE COLUNAS ===
  const mapColumnName = (header) => {
    const h = (header || "").toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const map = {
      descricao: "descricao", descricão: "descricao", nome: "descricao", produto: "descricao",
      codigo: "codigo", cod: "codigo", barcode: "codigo", "codigo de barras": "codigo",
      custo: "custo", "preco custo": "custo", "preco de custo": "custo",
      preco: "preco_venda", preco_venda: "preco_venda", valor: "preco_venda", "preco venda": "preco_venda",
      estoque: "estoque_atual", estoque_atual: "estoque_atual", qtd: "estoque_atual", quantidade: "estoque_atual",
      tipo: "tipo", condicao: "tipo",
    };
    return map[h] || null;
  };

  // === SELECIONAR ARQUIVO ===
  const handleSelectFile = async () => {
    try {
      const fileResult = await api.system.openFileDialog();
      if (fileResult.canceled) return;

      setImportFileName(fileResult.fileName);
      setImportResult(null);

      // Decodificar base64 e parsear com SheetJS
      const binaryStr = atob(fileResult.buffer);
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);

      const workbook = XLSX.read(bytes, { type: "array" });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const rawData = XLSX.utils.sheet_to_json(firstSheet, { defval: "" });

      if (rawData.length === 0) {
        return showAlert("A planilha está vazia ou sem dados válidos.", "Aviso", "warning");
      }

      // Mapear colunas
      const headers = Object.keys(rawData[0]);
      const columnMap = {};
      headers.forEach(h => {
        const mapped = mapColumnName(h);
        if (mapped) columnMap[h] = mapped;
      });

      if (!Object.values(columnMap).includes("descricao")) {
        return showAlert(
          "Coluna \"Descrição\" não encontrada. Verifique os cabeçalhos da planilha.",
          "Erro de Formato", "error"
        );
      }

      // Converter dados
      const mapped = rawData.map((row, idx) => {
        const product = { _row: idx + 2 }; // +2: header + 0-index
        Object.entries(columnMap).forEach(([orig, dest]) => {
          product[dest] = row[orig];
        });
        // Validar e marcar status
        if (!product.descricao || !String(product.descricao).trim()) {
          product._status = "error";
          product._statusMsg = "Descrição vazia";
        } else {
          // Verificar duplicata local existente
          const existing = product.codigo
            ? products.find(p => p.codigo === String(product.codigo))
            : null;
          product._status = existing ? "duplicate" : "new";
          product._statusMsg = existing ? "Código já cadastrado" : "Novo produto";
        }
        return product;
      });

      setImportData(mapped);
    } catch (error) {
      console.error("Erro ao ler planilha:", error);
      showAlert("Erro ao ler o arquivo: " + error.message, "Erro", "error");
    }
  };

  // === REMOVER LINHA DO PREVIEW ===
  const removeImportRow = (idx) => {
    setImportData(prev => prev.filter((_, i) => i !== idx));
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
        loadProducts();
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
    const ws = XLSX.utils.aoa_to_sheet([
      ["Código", "Descrição", "Custo", "Preço Venda", "Estoque", "Tipo"],
      ["P001", "Pneu 195/65 R15", 80.00, 120.00, 10, "novo"],
      ["P002", "Óleo Motor 5W30 1L", 25.00, 45.00, 50, "novo"],
    ]);
    ws["!cols"] = [{ wch: 12 }, { wch: 25 }, { wch: 10 }, { wch: 12 }, { wch: 10 }, { wch: 8 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Produtos");
    XLSX.writeFile(wb, "modelo_importacao_produtos.xlsx");
  };

  // === EXPORTAR PRODUTOS DO BANCO ===
  const handleExportProducts = () => {
    if (products.length === 0) {
      return showAlert("Não há produtos cadastrados para exportar.", "Aviso", "warning");
    }
    const rows = products.map(p => ({
      Código: p.codigo,
      Descrição: p.descricao,
      Custo: p.custo,
      "Preço Venda": p.preco_venda,
      Estoque: p.estoque_atual,
      Tipo: p.tipo || "novo",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = [{ wch: 14 }, { wch: 30 }, { wch: 10 }, { wch: 12 }, { wch: 10 }, { wch: 8 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Produtos");
    XLSX.writeFile(wb, `produtos_${new Date().toISOString().slice(0, 10)}.xlsx`);
    showAlert(`${products.length} produtos exportados com sucesso!`, "Sucesso", "success");
  };

  // === EXPORTAR PRODUTOS COMO CSV ===
  const handleExportCSV = () => {
    if (products.length === 0) {
      return showAlert("Não há produtos cadastrados para exportar.", "Aviso", "warning");
    }
    const rows = products.map(p => ({
      Código: p.codigo,
      Descrição: p.descricao,
      Custo: p.custo,
      "Preço Venda": p.preco_venda,
      Estoque: p.estoque_atual,
      Tipo: p.tipo || "novo",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Produtos");
    // Exportar com ponto-e-vírgula (padrão Excel Brasil)
    XLSX.writeFile(wb, `produtos_${new Date().toISOString().slice(0, 10)}.csv`, { bookType: 'csv', FS: ';' });
    showAlert(`${products.length} produtos exportados em CSV com sucesso!`, "Sucesso", "success");
  };

  // Contadores de status para preview
  const importStats = useMemo(() => {
    const stats = { new: 0, duplicate: 0, error: 0 };
    importData.forEach(r => { if (stats[r._status] !== undefined) stats[r._status]++; });
    return stats;
  }, [importData]);

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
            className="text-white bg-primary-600 hover:bg-primary-700 p-2 rounded-lg transition shadow-sm active:scale-90"
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
    <div className="p-4 md:p-6 h-full flex flex-col bg-surface-50 overflow-hidden">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-surface-800">Gerenciar Estoque</h1>
          <p className="text-xs text-surface-500 mt-1">Controle de peças, preços e níveis de estoque.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => withPermission(() => { setShowImportModal(true); setImportData([]); setImportResult(null); setImportFileName(""); })}
            className="w-full sm:w-auto bg-green-600 text-white px-5 py-2.5 rounded-xl hover:bg-green-700 transition-all active:scale-95 flex items-center justify-center shadow-md font-bold text-sm gap-2"
          >
            <i className="fas fa-file-import"></i> Importar Lote
          </button>
          <button
            onClick={() => withPermission(() => { resetForm(); setShowProductModal(true); })}
            className="w-full sm:w-auto bg-primary-600 text-white px-5 py-2.5 rounded-xl hover:bg-primary-700 transition-all active:scale-95 flex items-center justify-center shadow-md font-bold text-sm gap-2"
          >
            <i className="fas fa-box-open"></i> Novo Produto
          </button>
        </div>
      </div>

      <div className="bg-surface-100 p-3 rounded-xl shadow-sm border border-surface-200 mb-4 flex flex-col md:flex-row gap-4 items-center">
        <FormField
          icon="fa-search"
          placeholder="Buscar por nome ou código..."
          value={searchTerm}
          onChange={setSearchTerm}
          className="flex-1"
        />
        <div className="w-full md:w-56">
          <select
            className="w-full border border-surface-300 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-500 text-sm bg-surface-100 transition-all"
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
              className="px-5 py-2.5 bg-surface-200 text-surface-800 rounded-xl hover:bg-surface-300 transition font-medium text-sm"
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              className="px-6 py-2.5 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition font-bold text-sm shadow-md active:scale-95"
            >
              <i className="fas fa-save mr-2"></i>
              {editingId ? "Atualizar" : "Salvar"}
            </button>
          </div>
        }
      >
        <div className="space-y-5">
          <div className="bg-surface-50 p-4 rounded-xl border border-surface-200">
            <label className="block text-[10px] font-black text-surface-400 uppercase tracking-widest mb-3">
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
                  className="mr-3 w-5 h-5 text-primary-600 border-surface-300 focus:ring-primary-500"
                />
                <span className={`text-sm font-bold ${formData.tipo === "novo" ? "text-primary-700" : "text-surface-500 group-hover:text-surface-800"}`}>
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
                  className="mr-3 w-5 h-5 text-orange-600 border-surface-300 focus:ring-orange-500"
                />
                <span className={`text-sm font-bold ${formData.tipo === "usado" ? "text-orange-700" : "text-surface-500 group-hover:text-surface-800"}`}>
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
              className="flex-1 px-4 py-2.5 bg-surface-200 text-surface-800 rounded-xl font-medium text-sm hover:bg-surface-300 transition"
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
          <div className="bg-surface-50 p-4 rounded-xl border border-surface-200">
             <div className="text-xs font-bold text-surface-400 uppercase mb-2">Produto Selecionado</div>
             <div className="text-lg font-black text-surface-800">{stockData.nome}</div>
          </div>

          <div className="flex items-center justify-center gap-8 bg-primary-50/50 p-4 rounded-2xl border border-primary-100">
            <div className="text-center">
              <div className="text-[10px] font-black text-primary-400 uppercase mb-1">Atual</div>
              <div className="text-3xl font-black text-surface-400">{stockData.quantidade_atual}</div>
            </div>
            <i className="fas fa-arrow-right text-primary-200"></i>
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

      {/* --- MODAL DE IMPORTAÇÃO EM LOTE --- */}
      <Modal
        isOpen={showImportModal}
        onClose={() => { setShowImportModal(false); setShowImportHelp(false); }}
        title="Importar Produtos em Lote"
        icon="fa-file-import"
        size="2xl"
        footer={
          !importResult && (
            <div className="flex gap-2 w-full">
              <button
                onClick={() => setShowImportModal(false)}
                className="flex-1 px-4 py-2.5 bg-surface-200 text-surface-800 rounded-xl font-bold text-sm hover:bg-surface-300"
              >
                Cancelar
              </button>
              <button
                onClick={handleImportBatch}
                disabled={importing || importData.filter(r => r._status !== "error").length === 0}
                className={`flex-[2] px-4 py-2.5 rounded-xl font-black text-sm shadow-md active:scale-95 transition ${importing || importData.filter(r => r._status !== "error").length === 0 ? "bg-surface-300 text-surface-500 cursor-not-allowed" : "bg-primary-600 text-white hover:bg-primary-700"}`}
              >
                {importing ? (
                  <><i className="fas fa-spinner fa-spin mr-2"></i> Importando...</>
                ) : (
                  <><i className="fas fa-upload mr-2"></i> Importar {importData.filter(r => r._status !== "error").length} Produtos</>
                )}
              </button>
            </div>
          )
        }
      >
        <div className="space-y-4">
          {/* Botão de Ajuda */}
          <div className="flex justify-end">
            <button
              onClick={() => setShowImportHelp(!showImportHelp)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${showImportHelp ? "bg-primary-600 text-white" : "bg-primary-500/10 text-primary-600 hover:bg-primary-500/20 border border-primary-500/20"}`}
            >
              <i className="fas fa-question-circle mr-1"></i> Como usar
            </button>
          </div>

          {/* Painel de Ajuda */}
          {showImportHelp && (
            <div className="bg-primary-500/10 border border-primary-500/20 rounded-xl p-5 space-y-3 text-sm text-surface-800 animate-fade-in">
              <h3 className="font-black text-base flex items-center gap-2"><i className="fas fa-book text-primary-500"></i> Guia Completo de Importação em Massa</h3>
              <div className="space-y-3 text-xs leading-relaxed">
                <div className="flex gap-3"><span className="text-lg">1️⃣</span><div><strong>Prepare sua planilha</strong> — Use arquivos Excel (.xlsx) ou CSV. <span className="text-primary-600 font-bold">💡 Dica:</span> Você pode clicar em <strong>"Exportar Excel"</strong> para baixar todos os seus produtos atuais, editá-los no Excel e depois reimportar usando a opção "Atualizar".</div></div>
                <div className="flex gap-3"><span className="text-lg">2️⃣</span><div><strong>Selecione o arquivo</strong> — Clique em "Selecionar Planilha". O sistema mapeia automaticamente colunas como "Descrição", "Código", "Preço", etc., mesmo que tenham nomes um pouco diferentes.</div></div>
                <div className="flex gap-3"><span className="text-lg">3️⃣</span><div><strong>Resolva Conflitos</strong> — Se o sistema encontrar um código que já existe:
                  <ul className="list-disc ml-4 mt-1 space-y-0.5">
                    <li><strong>Pular:</strong> Ignora a linha e mantém o produto original.</li>
                    <li><strong>Atualizar:</strong> Sobrescreve nome, preços e estoque com os dados da planilha (isso também reativa produtos que foram excluídos).</li>
                  </ul>
                </div></div>
                <div className="flex gap-3"><span className="text-lg">4️⃣</span><div><strong>Confirmação</strong> — Revise os status <span className="inline-block bg-green-100 text-green-700 px-1.5 py-0.5 rounded text-[10px] font-bold">NOVO</span>, <span className="inline-block bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded text-[10px] font-bold">DUPLICADO</span> ou <span className="inline-block bg-red-100 text-red-600 px-1.5 py-0.5 rounded text-[10px] font-bold">ERRO</span> antes de terminar.</div></div>
                <div className="mt-2 p-3 bg-surface-100 rounded-lg border border-primary-100">
                  <div className="font-bold text-[10px] uppercase text-primary-500 mb-1">Colunas aceitas</div>
                  <div className="text-[11px] text-surface-600 space-y-0.5">
                    <div>• <strong>Descrição</strong>, Nome, Produto → campo descrição</div>
                    <div>• <strong>Código</strong>, Cod, Barcode → campo código</div>
                    <div>• <strong>Custo</strong>, Preço Custo → campo custo</div>
                    <div>• <strong>Preço</strong>, Valor, Preço Venda → campo preço</div>
                    <div>• <strong>Estoque</strong>, Qtd, Quantidade → campo estoque</div>
                  </div>
                </div>
              </div>
              <div className="flex justify-end">
                <button onClick={() => setShowImportHelp(false)} className="px-4 py-1.5 bg-primary-600 text-white rounded-lg text-xs font-bold hover:bg-primary-700">
                  Entendido
                </button>
              </div>
            </div>
          )}

          {/* Botões de ação */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleSelectFile}
              className="bg-surface-900 text-white px-4 py-2.5 rounded-xl font-bold text-sm hover:bg-surface-900 shadow-md active:scale-95 transition flex items-center gap-2"
            >
              <i className="fas fa-folder-open"></i> Selecionar Planilha
            </button>
            <button
              onClick={handleDownloadTemplate}
              className="bg-surface-200 text-surface-800 px-4 py-2.5 rounded-xl font-bold text-sm hover:bg-surface-300 border border-surface-300 transition flex items-center gap-2"
            >
              <i className="fas fa-download"></i> Baixar Modelo
            </button>
            <button
              onClick={handleExportProducts}
              className="bg-green-500/10 text-green-600 px-4 py-2.5 rounded-xl font-bold text-sm hover:bg-green-500/20 border border-green-500/20 transition flex items-center gap-2"
              title="Exportar como Excel (.xlsx)"
            >
              <i className="fas fa-file-excel"></i> Exportar Excel
            </button>
            <button
              onClick={handleExportCSV}
              className="bg-surface-200 text-surface-800 px-4 py-2.5 rounded-xl font-bold text-sm hover:bg-surface-300 border border-surface-300 transition flex items-center gap-2"
              title="Exportar como CSV (.csv)"
            >
              <i className="fas fa-file-csv"></i> Exportar CSV
            </button>
            {importFileName && (
              <span className="flex items-center gap-2 text-sm text-surface-500 bg-surface-50 px-3 py-2 rounded-xl border border-surface-200">
                <i className="fas fa-file-excel text-green-600"></i> {importFileName}
              </span>
            )}
          </div>

          {/* Seletor de conflito */}
          {importData.length > 0 && importStats.duplicate > 0 && !importResult && (
            <div className="flex items-center gap-4 p-3 bg-yellow-500/10 rounded-xl border border-yellow-500/20">
              <span className="text-xs font-bold text-yellow-600"><i className="fas fa-exclamation-triangle mr-1"></i> Duplicados encontrados:</span>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input type="radio" name="conflict" value="skip" checked={conflictMode === "skip"} onChange={() => setConflictMode("skip")} className="w-3.5 h-3.5 text-yellow-600" />
                <span className="text-xs font-bold text-surface-800">Pular</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input type="radio" name="conflict" value="update" checked={conflictMode === "update"} onChange={() => setConflictMode("update")} className="w-3.5 h-3.5 text-primary-600" />
                <span className="text-xs font-bold text-surface-800">Atualizar</span>
              </label>
            </div>
          )}

          {/* Tabela de Preview */}
          {importData.length > 0 && !importResult && (
            <>
              <div className="overflow-x-auto max-h-64 overflow-y-auto rounded-xl border border-surface-200">
                <table className="min-w-full text-sm">
                  <thead className="bg-surface-50 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left text-[10px] font-black text-surface-400 uppercase">Código</th>
                      <th className="px-3 py-2 text-left text-[10px] font-black text-surface-400 uppercase">Descrição</th>
                      <th className="px-3 py-2 text-right text-[10px] font-black text-surface-400 uppercase">Custo</th>
                      <th className="px-3 py-2 text-right text-[10px] font-black text-surface-400 uppercase">Preço</th>
                      <th className="px-3 py-2 text-center text-[10px] font-black text-surface-400 uppercase">Estoque</th>
                      <th className="px-3 py-2 text-center text-[10px] font-black text-surface-400 uppercase">Tipo</th>
                      <th className="px-3 py-2 text-center text-[10px] font-black text-surface-400 uppercase">Status</th>
                      <th className="px-3 py-2 w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {importData.map((row, idx) => (
                      <tr key={idx} className={`${row._status === "error" ? "bg-red-500/10 text-red-500" : row._status === "duplicate" ? "bg-yellow-500/10" : ""} hover:bg-surface-50`}>
                        <td className="px-3 py-2 font-mono text-surface-500">{row.codigo || "—"}</td>
                        <td className="px-3 py-2 font-bold text-surface-800">{row.descricao || ""}</td>
                        <td className="px-3 py-2 text-right text-surface-600">{row.custo ? parseFloat(row.custo).toFixed(2) : "—"}</td>
                        <td className="px-3 py-2 text-right text-surface-600">{row.preco_venda ? parseFloat(row.preco_venda).toFixed(2) : "—"}</td>
                        <td className="px-3 py-2 text-center text-surface-600">{row.estoque_atual ?? "—"}</td>
                        <td className="px-3 py-2 text-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${row.tipo === "usado" ? "bg-orange-100 text-orange-700" : "bg-primary-100 text-primary-700"}`}>
                            {row.tipo || "novo"}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                            row._status === "new" ? "bg-green-100 text-green-700" :
                            row._status === "duplicate" ? "bg-yellow-100 text-yellow-700" :
                            "bg-red-100 text-red-600"
                          }`} title={row._statusMsg}>
                            {row._status === "new" ? "NOVO" : row._status === "duplicate" ? "DUPLICADO" : "ERRO"}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-center">
                          <button onClick={() => removeImportRow(idx)} className="text-surface-300 hover:text-red-500 transition">
                            <i className="fas fa-times"></i>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex gap-3 text-xs font-bold">
                <span className="bg-surface-200 px-3 py-1.5 rounded-lg">{importData.length} total</span>
                {importStats.new > 0 && <span className="bg-green-100 text-green-700 px-3 py-1.5 rounded-lg">{importStats.new} novos</span>}
                {importStats.duplicate > 0 && <span className="bg-yellow-100 text-yellow-700 px-3 py-1.5 rounded-lg">{importStats.duplicate} duplicados</span>}
                {importStats.error > 0 && <span className="bg-red-100 text-red-600 px-3 py-1.5 rounded-lg">{importStats.error} erros</span>}
              </div>
            </>
          )}

          {/* Resultado pós-importação */}
          {importResult && (
            <div className="space-y-3 animate-fade-in">
              <div className="bg-green-500/10 text-green-600 border border-green-200 rounded-xl p-5 text-center">
                <i className="fas fa-check-circle text-green-500 text-4xl mb-3"></i>
                <h3 className="text-lg font-black text-surface-800 mb-2">Importação Concluída!</h3>
                <div className="flex justify-center gap-4 text-sm font-bold mt-3">
                  {importResult.created > 0 && <span className="bg-green-100 text-green-700 px-3 py-1.5 rounded-lg"><i className="fas fa-plus mr-1"></i>{importResult.created} criados</span>}
                  {importResult.updated > 0 && <span className="bg-primary-100 text-primary-700 px-3 py-1.5 rounded-lg"><i className="fas fa-sync mr-1"></i>{importResult.updated} atualizados</span>}
                  {importResult.skipped > 0 && <span className="bg-yellow-100 text-yellow-700 px-3 py-1.5 rounded-lg"><i className="fas fa-forward mr-1"></i>{importResult.skipped} pulados</span>}
                  {importResult.errors.length > 0 && <span className="bg-red-100 text-red-600 px-3 py-1.5 rounded-lg"><i className="fas fa-times mr-1"></i>{importResult.errors.length} erros</span>}
                </div>
              </div>
              {importResult.errors.length > 0 && (
                <div className="bg-red-500/10 text-red-500 border border-red-200 rounded-xl p-4">
                  <div className="text-xs font-bold text-red-600 uppercase mb-2">Detalhes dos erros</div>
                  {importResult.errors.map((err, i) => (
                    <div key={i} className="text-xs text-red-700 mb-1">Linha {err.row}: {err.error}</div>
                  ))}
                </div>
              )}
              <div className="flex justify-end">
                <button onClick={() => { setShowImportModal(false); setImportData([]); setImportResult(null); }} className="px-5 py-2.5 bg-primary-600 text-white rounded-xl font-bold text-sm hover:bg-primary-700 shadow-md">
                  Fechar
                </button>
              </div>
            </div>
          )}

          {/* Estado vazio */}
          {importData.length === 0 && !importResult && (
            <div className="text-center py-10 text-surface-400">
              <i className="fas fa-file-excel text-5xl mb-3 text-surface-200"></i>
              <p className="text-sm font-bold">Selecione uma planilha para começar</p>
              <p className="text-xs mt-1">Formatos aceitos: .xlsx, .xls, .csv</p>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default Produtos;