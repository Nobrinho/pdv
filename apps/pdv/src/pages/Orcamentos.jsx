import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dayjs from "dayjs";
import { api } from "../services/api";
import { useAlert } from "../context/AlertSystem";
import DataTable from "../components/ui/DataTable";
import StatusBadge from "../components/ui/StatusBadge";
import Modal from "../components/ui/Modal";
import SaleEntryBar from "../components/sales/SaleEntryBar";
import SaleCartPanel from "../components/sales/SaleCartPanel";
import BudgetSummaryPanel from "../components/budgets/BudgetSummaryPanel";
import BudgetDocument from "../components/budgets/BudgetDocument";
import QuickClientModal from "../components/sales/QuickClientModal";
import { formatCurrency } from "../utils/format";
import { validarDocumento } from "../utils/validators";
import useClientSearch from "../hooks/useClientSearch";
import { getSalesPeopleByRole, findSelectedClient, findSavedClient } from "../utils/salesViewModel";
import { calculateBudgetTotals } from "../utils/budgetTotals";
import { exportBudgetAsImage, exportBudgetAsPdf } from "../utils/budgetExport";
import { useTenant } from "../context/TenantContext";

const statusMeta = {
  ABERTO: { preset: "ok", label: "ABERTO" },
  CANCELADO: { preset: "cancelada", label: "CANCELADO" },
  CONVERTIDO: { preset: "novo", label: "CONVERTIDO" },
  EXPIRADO: { preset: "pendente", label: "EXPIRADO" },
};

const INITIAL_EDITOR_STATE = {
  cart: [],
  selectedSeller: "",
  selectedMechanic: "",
  laborInput: "",
  surchargeValue: "",
  discountValue: "",
  observations: "",
  validityDate: "",
  searchTerm: "",
};

const INITIAL_CONVERSION_STATE = {
  budgetId: null,
  budgetCode: "",
  clientName: "",
  total: 0,
  paymentMethod: "Dinheiro",
  installments: 1,
};

const INITIAL_NEW_CLIENT_DATA = {
  nome: "",
  documento: "",
  telefone: "",
  endereco: "",
};

const Orcamentos = () => {
  const { showAlert, showConfirm } = useAlert();
  const { tenant } = useTenant();
  const [budgets, setBudgets] = useState([]);
  const [products, setProducts] = useState([]);
  const [people, setPeople] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [showEditor, setShowEditor] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [editingBudgetId, setEditingBudgetId] = useState(null);
  const [editingBudgetCode, setEditingBudgetCode] = useState("");
  const [previewBudget, setPreviewBudget] = useState(null);
  const [conversionData, setConversionData] = useState(INITIAL_CONVERSION_STATE);
  const [showClientModal, setShowClientModal] = useState(false);
  const [newClientData, setNewClientData] = useState(INITIAL_NEW_CLIENT_DATA);
  const [isSavingClient, setIsSavingClient] = useState(false);
  const [cart, setCart] = useState(INITIAL_EDITOR_STATE.cart);
  const [selectedSeller, setSelectedSeller] = useState(INITIAL_EDITOR_STATE.selectedSeller);
  const [selectedMechanic, setSelectedMechanic] = useState(INITIAL_EDITOR_STATE.selectedMechanic);
  const [laborInput, setLaborInput] = useState(INITIAL_EDITOR_STATE.laborInput);
  const [surchargeValue, setSurchargeValue] = useState(INITIAL_EDITOR_STATE.surchargeValue);
  const [discountValue, setDiscountValue] = useState(INITIAL_EDITOR_STATE.discountValue);
  const [observations, setObservations] = useState(INITIAL_EDITOR_STATE.observations);
  const [validityDate, setValidityDate] = useState(INITIAL_EDITOR_STATE.validityDate);
  const [searchTerm, setSearchTerm] = useState(INITIAL_EDITOR_STATE.searchTerm);
  const searchInputRef = useRef(null);
  const budgetDocumentRef = useRef(null);
  const {
    clientSearchTerm,
    setClientSearchTerm,
    showClientResults,
    setShowClientResults,
    selectedClient,
    setSelectedClient,
    filteredClients,
    handleSelectClient,
  } = useClientSearch(clients);

  const { sellers, mechanics } = useMemo(() => getSalesPeopleByRole(people), [people]);
  const selectedClientData = useMemo(
    () => findSelectedClient(clients, selectedClient),
    [clients, selectedClient],
  );
  const editorTotals = useMemo(
    () => calculateBudgetTotals({ cart, laborInput, surchargeValue, discountValue }),
    [cart, laborInput, surchargeValue, discountValue],
  );

  const resetEditorState = useCallback(() => {
    setEditingBudgetId(null);
    setEditingBudgetCode("");
    setCart(INITIAL_EDITOR_STATE.cart);
    setSelectedSeller(INITIAL_EDITOR_STATE.selectedSeller);
    setSelectedMechanic(INITIAL_EDITOR_STATE.selectedMechanic);
    setLaborInput(INITIAL_EDITOR_STATE.laborInput);
    setSurchargeValue(INITIAL_EDITOR_STATE.surchargeValue);
    setDiscountValue(INITIAL_EDITOR_STATE.discountValue);
    setObservations(INITIAL_EDITOR_STATE.observations);
    setValidityDate(INITIAL_EDITOR_STATE.validityDate);
    setSearchTerm(INITIAL_EDITOR_STATE.searchTerm);
    setSelectedClient("");
    setClientSearchTerm("");
    setShowClientResults(false);
  }, [setClientSearchTerm, setSelectedClient, setShowClientResults]);

  const closeEditor = useCallback(() => {
    setShowEditor(false);
    resetEditorState();
  }, [resetEditorState]);

  const loadPageData = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError("");
      const [budgetResult, productResult, peopleResult, clientResult] = await Promise.all([
        api.budgets.list(),
        api.products.list(),
        api.people.list(),
        api.clients.list(),
      ]);

      const budgetRows = Array.isArray(budgetResult) ? budgetResult : budgetResult?.data || [];
      const productRows = Array.isArray(productResult) ? productResult : [];
      const peopleRows = Array.isArray(peopleResult) ? peopleResult : [];
      const clientRows = Array.isArray(clientResult) ? clientResult : [];

      setBudgets(budgetRows);
      setProducts(
        productRows.map((product) => ({
          ...product,
          preco_venda: Number(product.preco_venda || 0),
          custo: Number(product.custo || 0),
          estoque_atual: Number(product.estoque_atual || 0),
        })),
      );
      setPeople(peopleRows);
      setClients(clientRows);
    } catch (error) {
      console.error(error);
      setLoadError("Nao foi possivel carregar os dados de orcamentos.");
      showAlert("Erro ao carregar dados de orcamentos.", "Erro", "error");
    } finally {
      setLoading(false);
    }
  }, [showAlert]);

  useEffect(() => {
    loadPageData();
  }, [loadPageData]);

  const searchResults = useMemo(() => {
    const normalized = searchTerm.trim().toLowerCase();
    if (!normalized) return [];

    return products
      .filter((product) => product.ativo !== false && product.ativo !== 0)
      .filter((product) => {
        const code = String(product.codigo || "").toLowerCase();
        const description = String(product.descricao || "").toLowerCase();
        return code.includes(normalized) || description.includes(normalized);
      })
      .slice(0, 8);
  }, [products, searchTerm]);

  const addProductToCart = useCallback((product) => {
    if (!product) return;

    setCart((currentCart) => {
      const existing = currentCart.find((item) => item.id === product.id);
      if (existing) {
        return currentCart.map((item) =>
          item.id === product.id ? { ...item, qty: item.qty + 1 } : item,
        );
      }

      return [
        ...currentCart,
        {
          id: product.id,
          codigo: product.codigo || "",
          descricao: product.descricao,
          preco_venda: Number(product.preco_venda || 0),
          custo: Number(product.custo || 0),
          estoque_atual: Number(product.estoque_atual || 0),
          tipo: product.tipo || "",
          qty: 1,
        },
      ];
    });

    setSearchTerm("");
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, []);

  const handleSearchKeyDown = useCallback(
    (event) => {
      if (event.key === "Enter" && searchResults.length > 0) {
        event.preventDefault();
        addProductToCart(searchResults[0]);
      }
    },
    [addProductToCart, searchResults],
  );

  const handleScanCode = useCallback(
    (rawCode) => {
      const code = String(rawCode || "").trim();
      if (!code) return;
      const exact = products.find((p) => String(p.codigo).trim() === code);
      if (exact) {
        addProductToCart(exact);
      } else {
        setSearchTerm(code);
        setTimeout(() => searchInputRef.current?.focus(), 10);
      }
    },
    [products, addProductToCart],
  );

  const handleQuantityChange = useCallback((itemId, value) => {
    const quantity = Number.parseInt(value, 10);
    setCart((currentCart) =>
      currentCart.map((item) =>
        item.id === itemId
          ? { ...item, qty: Number.isInteger(quantity) && quantity > 0 ? quantity : 1 }
          : item,
      ),
    );
  }, []);

  const handleRemoveItem = useCallback((itemId) => {
    setCart((currentCart) => currentCart.filter((item) => item.id !== itemId));
  }, []);

  const openNewBudgetEditor = useCallback(() => {
    resetEditorState();
    setShowEditor(true);
    requestAnimationFrame(() => searchInputRef.current?.focus());
  }, [resetEditorState]);

  const openQuickClientModal = useCallback(() => {
    setNewClientData(INITIAL_NEW_CLIENT_DATA);
    setShowClientModal(true);
  }, []);

  const updateNewClientField = useCallback((field, value) => {
    setNewClientData((current) => ({ ...current, [field]: value }));
  }, []);

  const handleSaveNewClient = useCallback(
    async (event) => {
      if (event) event.preventDefault();
      if (isSavingClient) return;
      if (!newClientData.nome || !newClientData.telefone) {
        return showAlert("Nome e Telefone são obrigatórios!", "Dados Incompletos", "warning");
      }
      if (newClientData.documento && !validarDocumento(newClientData.documento)) {
        return showAlert("CPF/CNPJ inválido. Verifique o documento.", "Atenção", "error");
      }
      try {
        setIsSavingClient(true);
        const result = await api.clients.save(newClientData);
        if (result.success) {
          const updatedClients = await api.clients.list();
          setClients(updatedClients);
          const newClient = findSavedClient(updatedClients, result.id, newClientData.documento);
          if (newClient) {
            setSelectedClient(String(newClient.id));
            setClientSearchTerm(newClient.nome);
            setShowClientResults(false);
          }
          setShowClientModal(false);
          setNewClientData(INITIAL_NEW_CLIENT_DATA);
          showAlert("Cliente cadastrado e vinculado ao orçamento!", "Sucesso", "success");
        } else {
          showAlert("Erro ao salvar: " + result.error, "Erro", "error");
        }
      } catch (err) {
        console.error(err);
        showAlert("Erro técnico ao salvar cliente.", "Erro", "error");
      } finally {
        setIsSavingClient(false);
      }
    },
    [isSavingClient, newClientData, setClientSearchTerm, setSelectedClient, setShowClientResults, showAlert],
  );

  const hydrateBudgetEditor = useCallback(
    (budget) => {
      const productMap = new Map(products.map((product) => [product.id, product]));
      const mappedCart = Array.isArray(budget?.itens)
        ? budget.itens.map((item) => {
            const product = productMap.get(item.produto_id) || {};
            return {
              id: item.produto_id,
              codigo: item.codigo_snapshot || product.codigo || "",
              descricao: item.descricao_snapshot || product.descricao || "Produto",
              preco_venda: Number(item.preco_unitario || product.preco_venda || 0),
              custo: Number(item.custo_unitario || product.custo || 0),
              estoque_atual: Number(product.estoque_atual || 0),
              tipo: item.tipo_snapshot || product.tipo || "",
              qty: Number(item.quantidade || 0),
            };
          })
        : [];

      setEditingBudgetId(budget.id);
      setEditingBudgetCode(budget.codigo || "");
      setCart(mappedCart);
      setSelectedSeller(String(budget.vendedor_id || ""));
      setSelectedMechanic(budget.trocador_id ? String(budget.trocador_id) : "");
      setLaborInput(String(Number(budget.mao_de_obra || 0) || ""));
      setSurchargeValue(String(Number(budget.acrescimo_valor || 0) || ""));
      setDiscountValue(String(Number(budget.desconto_valor || 0) || ""));
      setObservations(budget.observacoes || "");
      setValidityDate(
        budget.validade_em ? dayjs(Number(budget.validade_em)).format("YYYY-MM-DD") : "",
      );
      setSelectedClient(budget.cliente_id ? String(budget.cliente_id) : "");
      setClientSearchTerm(budget.cliente_nome || "");
      setShowClientResults(false);
      setSearchTerm("");
      setShowEditor(true);
    },
    [products, setClientSearchTerm, setSelectedClient, setShowClientResults],
  );

  const handleEditBudget = useCallback(
    async (budgetId) => {
      try {
        const budget = await api.budgets.getById(budgetId);
        if (!budget) {
          showAlert("Orcamento nao encontrado.", "Aviso", "error");
          return;
        }
        if (budget.status !== "ABERTO") {
          showAlert(
            "Apenas orcamentos em aberto podem ser editados nesta etapa.",
            "Orcamento bloqueado",
            "info",
          );
          return;
        }
        hydrateBudgetEditor(budget);
      } catch (error) {
        console.error(error);
        showAlert("Nao foi possivel abrir o orcamento.", "Erro", "error");
      }
    },
    [hydrateBudgetEditor, showAlert],
  );

  const handleDuplicateBudget = useCallback(
    async (budgetId) => {
      try {
        const result = await api.budgets.duplicate(budgetId);
        if (!result?.success) {
          showAlert(result?.error || "Nao foi possivel duplicar o orcamento.", "Erro", "error");
          return;
        }
        await loadPageData();
        showAlert(`Orcamento ${result.codigo} criado a partir da copia.`, "Duplicado", "success");
      } catch (error) {
        console.error(error);
        showAlert("Nao foi possivel duplicar o orcamento.", "Erro", "error");
      }
    },
    [loadPageData, showAlert],
  );

  const handleCancelBudget = useCallback(
    async (budgetId) => {
      const confirmed = await showConfirm(
        "Deseja cancelar este orcamento? Ele permanecera no historico, mas nao podera mais ser editado.",
        "Cancelar orcamento",
      );
      if (!confirmed) return;

      try {
        const result = await api.budgets.cancel(budgetId);
        if (!result?.success) {
          showAlert(result?.error || "Nao foi possivel cancelar o orcamento.", "Erro", "error");
          return;
        }
        await loadPageData();
        showAlert("Orcamento cancelado com sucesso.", "Concluido", "success");
      } catch (error) {
        console.error(error);
        showAlert("Nao foi possivel cancelar o orcamento.", "Erro", "error");
      }
    },
    [loadPageData, showAlert, showConfirm],
  );

  const handlePreviewBudget = useCallback(
    async (budgetId) => {
      try {
        setPreviewLoading(true);
        const budget = await api.budgets.getById(budgetId);
        if (!budget) {
          showAlert("Orcamento nao encontrado.", "Aviso", "error");
          return;
        }
        setPreviewBudget(budget);
        setShowPreview(true);
      } catch (error) {
        console.error(error);
        showAlert("Nao foi possivel abrir o preview do orcamento.", "Erro", "error");
      } finally {
        setPreviewLoading(false);
      }
    },
    [showAlert],
  );

  const openConvertModal = useCallback((budget) => {
    setConversionData({
      budgetId: budget.id,
      budgetCode: budget.codigo || "",
      clientName: budget.cliente_nome || "",
      total: Number(budget.total_final || 0),
      paymentMethod: "Dinheiro",
      installments: 1,
    });
    setShowConvertModal(true);
  }, []);

  const closeConvertModal = useCallback(() => {
    setShowConvertModal(false);
    setConversionData(INITIAL_CONVERSION_STATE);
  }, []);

  const handleConvertBudget = useCallback(async () => {
    if (!conversionData.budgetId) return;
    if (conversionData.paymentMethod === "Fiado" && !conversionData.clientName) {
      showAlert(
        "Para converter em Fiado, o orcamento precisa ter um cliente vinculado.",
        "Conversao bloqueada",
        "info",
      );
      return;
    }

    try {
      setIsConverting(true);
      const detalhes =
        conversionData.paymentMethod === "Crédito" ? `${conversionData.installments}x` : "";

      const result = await api.budgets.convert({
        budgetId: conversionData.budgetId,
        pagamentos: [
          {
            metodo: conversionData.paymentMethod,
            valor: conversionData.total,
            detalhes,
          },
        ],
      });

      if (!result?.success) {
        showAlert(result?.error || "Nao foi possivel converter o orcamento.", "Erro", "error");
        return;
      }

      await loadPageData();
      closeConvertModal();
      showAlert(`Orcamento convertido em venda #${result.saleId}.`, "Conversao", "success");
    } catch (error) {
      console.error(error);
      showAlert("Nao foi possivel converter o orcamento.", "Erro", "error");
    } finally {
      setIsConverting(false);
    }
  }, [closeConvertModal, conversionData, loadPageData, showAlert]);

  const handleExportPreviewAsPdf = useCallback(async () => {
    if (!previewBudget || !budgetDocumentRef.current) return;

    try {
      setIsExporting(true);
      await exportBudgetAsPdf(budgetDocumentRef.current, previewBudget.codigo || "orcamento");
      showAlert("PDF do orcamento salvo com sucesso.", "Exportacao", "success");
    } catch (error) {
      console.error(error);
      showAlert(error.message || "Nao foi possivel exportar o PDF.", "Erro", "error");
    } finally {
      setIsExporting(false);
    }
  }, [previewBudget, showAlert]);

  const handleExportPreviewAsImage = useCallback(async () => {
    if (!previewBudget || !budgetDocumentRef.current) return;

    try {
      setIsExporting(true);
      await exportBudgetAsImage(budgetDocumentRef.current, previewBudget.codigo || "orcamento");
      showAlert("Imagem do orcamento salva com sucesso.", "Exportacao", "success");
    } catch (error) {
      console.error(error);
      showAlert(error.message || "Nao foi possivel exportar a imagem.", "Erro", "error");
    } finally {
      setIsExporting(false);
    }
  }, [previewBudget, showAlert]);

  const handlePrintPreview = useCallback(async () => {
    if (!budgetDocumentRef.current) return;

    try {
      setIsPrinting(true);
      const printerName = await api.config.get("impressora_padrao");
      const result = await api.print.silent(
        budgetDocumentRef.current.outerHTML,
        printerName,
        { layout: "document" },
      );

      if (!result?.success) {
        showAlert(result?.error || "Nao foi possivel imprimir o orcamento.", "Erro", "error");
        return;
      }

      showAlert("Orcamento enviado para impressao.", "Impressao", "success");
    } catch (error) {
      console.error(error);
      showAlert("Nao foi possivel imprimir o orcamento.", "Erro", "error");
    } finally {
      setIsPrinting(false);
    }
  }, [showAlert]);

  const handleSaveBudget = useCallback(async () => {
    if (!selectedSeller) {
      showAlert("Selecione um vendedor para salvar o orcamento.", "Dados incompletos", "info");
      return;
    }

    if (cart.length === 0) {
      showAlert("Adicione ao menos um item ao orcamento.", "Dados incompletos", "info");
      return;
    }

    try {
      setIsSaving(true);
      const payload = {
        id: editingBudgetId,
        cliente_id: selectedClient ? Number(selectedClient) : null,
        vendedor_id: Number(selectedSeller),
        trocador_id: selectedMechanic ? Number(selectedMechanic) : null,
        subtotal: editorTotals.subtotal,
        mao_de_obra: editorTotals.labor,
        acrescimo_valor: editorTotals.surcharge,
        desconto_valor: editorTotals.discount,
        desconto_tipo: "fixed",
        total_final: editorTotals.total,
        observacoes: observations.trim() || null,
        validade_em: validityDate ? dayjs(validityDate).endOf("day").valueOf() : null,
        itens: cart.map((item) => ({
          id: item.id,
          qty: item.qty,
          preco_venda: Number(item.preco_venda || 0),
          custo: Number(item.custo || 0),
        })),
      };

      const result = editingBudgetId
        ? await api.budgets.update(payload)
        : await api.budgets.create(payload);

      if (!result?.success) {
        showAlert(result?.error || "Nao foi possivel salvar o orcamento.", "Erro", "error");
        return;
      }

      await loadPageData();
      closeEditor();
      showAlert(
        editingBudgetId
          ? "Orcamento atualizado com sucesso."
          : `Orcamento ${result.codigo || ""} salvo com sucesso.`.trim(),
        "Concluido",
        "success",
      );
    } catch (error) {
      console.error(error);
      showAlert("Nao foi possivel salvar o orcamento.", "Erro", "error");
    } finally {
      setIsSaving(false);
    }
  }, [
    cart,
    closeEditor,
    editingBudgetId,
    editorTotals,
    loadPageData,
    observations,
    selectedClient,
    selectedMechanic,
    selectedSeller,
    showAlert,
    validityDate,
  ]);

  const columns = useMemo(
    () => [
      { key: "codigo", label: "Codigo", bold: true },
      {
        key: "data_criacao",
        label: "Data",
        format: (value) => dayjs(Number(value)).format("DD/MM/YYYY HH:mm"),
      },
      {
        key: "cliente_nome",
        label: "Cliente",
        format: (value) => value || "Consumidor nao informado",
      },
      { key: "vendedor_nome", label: "Vendedor" },
      {
        key: "status",
        label: "Status",
        align: "center",
        format: (value) => {
          const meta = statusMeta[value] || { preset: "pendente", label: value || "N/A" };
          return <StatusBadge preset={meta.preset} label={meta.label} />;
        },
      },
      {
        key: "total_final",
        label: "Total",
        align: "right",
        format: (value) => formatCurrency(Number(value || 0)),
      },
      {
        key: "acoes",
        label: "Acoes",
        align: "center",
        format: (_, row) => (
          <div className="flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                openConvertModal(row);
              }}
              disabled={row.status !== "ABERTO"}
              className={`h-8 w-8 rounded-lg border transition ${
                row.status === "ABERTO"
                  ? "border-green-200 text-green-600 hover:bg-green-50"
                  : "border-surface-200 text-surface-300 cursor-not-allowed"
              }`}
              title="Converter em venda"
            >
              <i className="fas fa-right-left text-xs"></i>
            </button>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                handlePreviewBudget(row.id);
              }}
              className="h-8 w-8 rounded-lg border border-surface-200 text-surface-500 hover:bg-surface-50 transition"
              title="Visualizar"
            >
              <i className={`fas ${previewLoading ? "fa-spinner fa-spin" : "fa-eye"} text-xs`}></i>
            </button>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                handleEditBudget(row.id);
              }}
              disabled={row.status !== "ABERTO"}
              className={`h-8 w-8 rounded-lg border transition ${
                row.status === "ABERTO"
                  ? "border-primary-200 text-primary-600 hover:bg-primary-50"
                  : "border-surface-200 text-surface-300 cursor-not-allowed"
              }`}
              title="Editar"
            >
              <i className="fas fa-pen text-xs"></i>
            </button>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                handleDuplicateBudget(row.id);
              }}
              className="h-8 w-8 rounded-lg border border-surface-200 text-surface-500 hover:bg-surface-50 transition"
              title="Duplicar"
            >
              <i className="fas fa-copy text-xs"></i>
            </button>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                handleCancelBudget(row.id);
              }}
              disabled={row.status !== "ABERTO"}
              className={`h-8 w-8 rounded-lg border transition ${
                row.status === "ABERTO"
                  ? "border-red-200 text-red-500 hover:bg-red-50"
                  : "border-surface-200 text-surface-300 cursor-not-allowed"
              }`}
              title="Cancelar"
            >
              <i className="fas fa-ban text-xs"></i>
            </button>
          </div>
        ),
      },
    ],
    [
      handleCancelBudget,
      handleDuplicateBudget,
      handleEditBudget,
      handlePreviewBudget,
      openConvertModal,
      previewLoading,
    ],
  );

  return (
    <div className="p-4 md:p-6 h-full flex flex-col bg-surface-50 overflow-hidden">
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-surface-800 tracking-tight">
            Orcamentos
          </h1>
          <p className="text-xs text-surface-500 mt-1">
            Dominio separado de orcamentos, sem misturar com vendas, estoque, contas a receber ou
            comissoes.
          </p>
        </div>
        <button
          type="button"
          onClick={openNewBudgetEditor}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-primary-700"
        >
          <i className="fas fa-plus"></i>
          Novo Orcamento
        </button>
      </div>

      <div className="flex-1 overflow-hidden">
        <DataTable
          columns={columns}
          data={budgets}
          loading={loading}
          error={loadError}
          onRefresh={loadPageData}
          emptyIcon="fa-file-invoice-dollar"
          emptyMessage="Nenhum orcamento cadastrado ainda."
        />
      </div>

      <Modal
        isOpen={showEditor}
        onClose={closeEditor}
        title={editingBudgetId ? "Editar Orcamento" : "Novo Orcamento"}
        icon="fa-file-invoice-dollar"
        size="full"
      >
        <div className="flex flex-col gap-4 xl:flex-row">
          <div className="min-w-0 flex-1 flex flex-col gap-4">
            <SaleEntryBar
              selectedSeller={selectedSeller}
              onSellerChange={setSelectedSeller}
              sellers={sellers}
              selectedClient={selectedClient}
              clientSearchTerm={clientSearchTerm}
              onClientSearchTermChange={setClientSearchTerm}
              onClearSelectedClient={() => {
                setSelectedClient("");
                setClientSearchTerm("");
              }}
              showClientResults={showClientResults}
              onShowClientResultsChange={setShowClientResults}
              clients={clients}
              filteredClients={filteredClients}
              onSelectClient={handleSelectClient}
              onOpenClientModal={openQuickClientModal}
              searchInputRef={searchInputRef}
              searchTerm={searchTerm}
              onSearchTermChange={setSearchTerm}
              onSearchKeyDown={handleSearchKeyDown}
              searchResults={searchResults}
              onSelectProduct={addProductToCart}
              onScanCode={handleScanCode}
            />

            {selectedClientData && (
              <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                <div className="font-bold">{selectedClientData.nome}</div>
                <div className="text-xs text-green-700/80">
                  {selectedClientData.documento || "Documento nao informado"}
                  {selectedClientData.telefone ? ` • ${selectedClientData.telefone}` : ""}
                </div>
              </div>
            )}

            <SaleCartPanel
              cart={cart}
              totals={editorTotals}
              onQuantityChange={handleQuantityChange}
              onRemoveItem={handleRemoveItem}
            />
          </div>

          <BudgetSummaryPanel
            showSellerField={false}
            sellers={sellers}
            selectedSeller={selectedSeller}
            onSelectedSellerChange={setSelectedSeller}
            mechanics={mechanics}
            selectedMechanic={selectedMechanic}
            onSelectedMechanicChange={setSelectedMechanic}
            laborInput={laborInput}
            onLaborInputChange={setLaborInput}
            surchargeValue={surchargeValue}
            onSurchargeValueChange={setSurchargeValue}
            discountValue={discountValue}
            onDiscountValueChange={setDiscountValue}
            observations={observations}
            onObservationsChange={setObservations}
            validityDate={validityDate}
            onValidityDateChange={setValidityDate}
            totals={editorTotals}
            onSave={handleSaveBudget}
            isSaving={isSaving}
            editingCode={editingBudgetCode}
          />
        </div>
      </Modal>

      {/* Cadastro rapido de cliente (abre por cima do editor) */}
      {showClientModal && (
        <div className="relative z-[210]">
          <QuickClientModal
            newClientData={newClientData}
            onClientFieldChange={updateNewClientField}
            onClose={() => setShowClientModal(false)}
            onSubmit={handleSaveNewClient}
            isSavingClient={isSavingClient}
          />
        </div>
      )}

      <Modal
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        title={previewBudget ? `Preview ${previewBudget.codigo}` : "Preview do Orcamento"}
        icon="fa-file-lines"
        size="full"
        footer={
          <div className="flex flex-col gap-2 md:flex-row md:justify-between">
            <button
              type="button"
              onClick={() => setShowPreview(false)}
              className="rounded-lg bg-surface-200 px-4 py-2.5 text-sm font-bold text-surface-800 transition hover:bg-surface-300"
            >
              Fechar
            </button>
            <div className="flex flex-col gap-2 md:flex-row">
              <button
                type="button"
                onClick={handleExportPreviewAsImage}
                disabled={isExporting || isPrinting || !previewBudget}
                className="rounded-lg border border-surface-200 px-4 py-2.5 text-sm font-bold text-surface-700 transition hover:bg-surface-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <i className="fas fa-image mr-2"></i>
                Exportar Imagem
              </button>
              <button
                type="button"
                onClick={handleExportPreviewAsPdf}
                disabled={isExporting || isPrinting || !previewBudget}
                className="rounded-lg border border-surface-200 px-4 py-2.5 text-sm font-bold text-surface-700 transition hover:bg-surface-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <i className="fas fa-file-pdf mr-2"></i>
                {isExporting ? "Exportando..." : "Exportar PDF"}
              </button>
              <button
                type="button"
                onClick={handlePrintPreview}
                disabled={isExporting || isPrinting || !previewBudget}
                className="rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <i className={`fas mr-2 ${isPrinting ? "fa-spinner fa-spin" : "fa-print"}`}></i>
                {isPrinting ? "Imprimindo..." : "Imprimir"}
              </button>
            </div>
          </div>
        }
      >
        {previewBudget ? (
          <div className="rounded-xl bg-surface-200 p-2 md:p-4 -mx-2 md:mx-0 overflow-x-auto custom-scrollbar">
            <div className="min-w-[680px] lg:min-w-0">
              <BudgetDocument ref={budgetDocumentRef} budget={previewBudget} tenant={tenant} />
            </div>
          </div>
        ) : (
          <div className="flex min-h-48 items-center justify-center text-sm text-surface-500">
            Nenhum orcamento selecionado.
          </div>
        )}
      </Modal>

      <Modal
        isOpen={showConvertModal}
        onClose={closeConvertModal}
        title={conversionData.budgetCode ? `Converter ${conversionData.budgetCode}` : "Converter Orcamento"}
        icon="fa-cart-shopping"
        size="md"
        footer={
          <div className="flex gap-2">
            <button
              type="button"
              onClick={closeConvertModal}
              className="flex-1 rounded-lg bg-surface-200 px-4 py-2.5 text-sm font-bold text-surface-800 transition hover:bg-surface-300"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConvertBudget}
              disabled={isConverting}
              className="flex-[2] rounded-lg bg-green-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <i className={`fas mr-2 ${isConverting ? "fa-spinner fa-spin" : "fa-check"}`}></i>
              {isConverting ? "Convertendo..." : "Confirmar Conversao"}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="rounded-xl border border-surface-200 bg-surface-50 p-4">
            <div className="text-xs font-bold uppercase text-surface-500">Resumo</div>
            <div className="mt-2 text-sm text-surface-700">
              <div>
                <strong>Orcamento:</strong> {conversionData.budgetCode || "-"}
              </div>
              <div>
                <strong>Cliente:</strong> {conversionData.clientName || "Consumidor final"}
              </div>
              <div>
                <strong>Total:</strong> {formatCurrency(conversionData.total)}
              </div>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold uppercase text-surface-500">
              Metodo de Pagamento
            </label>
            <select
              className="w-full rounded-lg border border-surface-300 bg-surface-50 p-2.5 text-sm outline-none focus:ring-2 focus:ring-primary-500"
              value={conversionData.paymentMethod}
              onChange={(event) =>
                setConversionData((current) => ({
                  ...current,
                  paymentMethod: event.target.value,
                }))
              }
            >
              <option>Dinheiro</option>
              <option>Pix</option>
              <option>Crédito</option>
              <option>Débito</option>
              <option>Fiado</option>
            </select>
          </div>

          {conversionData.paymentMethod === "Crédito" && (
            <div>
              <label className="mb-1 block text-xs font-bold uppercase text-surface-500">
                Parcelas
              </label>
              <select
                className="w-full rounded-lg border border-surface-300 bg-surface-50 p-2.5 text-sm outline-none focus:ring-2 focus:ring-primary-500"
                value={conversionData.installments}
                onChange={(event) =>
                  setConversionData((current) => ({
                    ...current,
                    installments: Number(event.target.value),
                  }))
                }
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((installment) => (
                  <option key={installment} value={installment}>
                    {installment}x
                  </option>
                ))}
              </select>
            </div>
          )}

          {conversionData.paymentMethod === "Fiado" && !conversionData.clientName && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Este orcamento nao tem cliente vinculado. Para usar Fiado, vincule um cliente antes de converter.
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default Orcamentos;
