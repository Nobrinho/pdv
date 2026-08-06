// @ts-nocheck
import React, { useState, useEffect, useRef } from "react";
import { useAlert } from "../context/AlertSystem";
import SaleCartPanel from "../components/sales/SaleCartPanel";
import SaleEntryBar from "../components/sales/SaleEntryBar";
import SalePaymentPanel from "../components/sales/SalePaymentPanel";
import QuickClientModal from "../components/sales/QuickClientModal";
import SaleReceiptModal from "../components/sales/SaleReceiptModal";
import Sheet from "../components/ui/Sheet";
import StickyActionBar from "../components/ui/StickyActionBar";
import { formatCurrency } from "../utils/format";
import { applyCpfCnpjMask, validarDocumento } from "../utils/validators";
import { findSavedClient, findSelectedClient, getSalesPeopleByRole } from "../utils/salesViewModel";
import { thermalizeReceiptHtml } from "../context/TenantContext";
import useCart from "../hooks/useCart";
import usePayments from "../hooks/usePayments";
import useProductSearch from "../hooks/useProductSearch";
import useClientSearch from "../hooks/useClientSearch";
import { api } from "../services/api";

const INITIAL_NEW_CLIENT_DATA = {
  nome: "",
  documento: "",
  telefone: "",
  endereco: "",
};

const Vendas = () => {
  const { showAlert } = useAlert();

  // --- DADOS ---
  const [products, setProducts] = useState([]);
  const [sellers, setSellers] = useState([]);
  const [mechanics, setMechanics] = useState([]);
  const [clients, setClients] = useState([]);
  const [loadingData, setLoadingData] = useState(false);
  const [loadError, setLoadError] = useState("");

  // --- SELEÇÃO ---
  const [selectedSeller, setSelectedSeller] = useState("");
  const [selectedMechanic, setSelectedMechanic] = useState("");

  // --- VALORES GERAIS ---
  const [discountValue, setDiscountValue] = useState("");
  const [discountType, setDiscountType] = useState("percent");
  const [surchargeValue, setSurchargeValue] = useState("");
  const [surchargeType, setSurchargeType] = useState("fixed");
  const [laborInput, setLaborInput] = useState(0);

  // --- MODAIS ---
  const [showReceipt, setShowReceipt] = useState(false);
  const [showClientModal, setShowClientModal] = useState(false);
  const [lastSale, setLastSale] = useState(null);
  const [isFinishingSale, setIsFinishingSale] = useState(false);
  const [isSavingClient, setIsSavingClient] = useState(false);
  const [isPrintingReceipt, setIsPrintingReceipt] = useState(false);
  // Fluxo mobile por passos: pagamento vira um bottom sheet acionado por "Cobrar".
  const [paymentSheetOpen, setPaymentSheetOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia("(min-width: 1024px)").matches : true,
  );
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(min-width: 1024px)");
    const onChange = (e) => setIsDesktop(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  // --- CPF RECIBO ---
  const [optsCpfReceipt, setOptsCpfReceipt] = useState(false);
  const [receiptCpf, setReceiptCpf] = useState("");
  const [receiptName, setReceiptName] = useState("");
  const [receiptClientFound, setReceiptClientFound] = useState(null); // cliente já existente encontrado pelo doc
  const [receiptSearching, setReceiptSearching] = useState(false);
  const hasValidReceiptDocument = (client) => {
    const doc = (client?.documento || "").toString().trim();
    return !!doc && validarDocumento(doc);
  };
  const resetReceiptState = () => {
    setOptsCpfReceipt(false);
    setReceiptCpf("");
    setReceiptName("");
    setReceiptClientFound(null);
  };

  // Auto-busca quando CPF (11 dígitos) ou CNPJ (14 dígitos) está completo
  const handleReceiptCpfChange = async (rawValue) => {
    const masked = applyCpfCnpjMask(rawValue);
    setReceiptCpf(masked);
    const digits = masked.replace(/\D/g, "");

    // Resetar se o usuário apagar
    if (digits.length < 11) {
      setReceiptClientFound(null);
      setReceiptName("");
      return;
    }

    // CPF = 11 dígitos, CNPJ = 14 dígitos
    if (digits.length === 11 || digits.length === 14) {
      try {
        setReceiptSearching(true);
        const res = await api.clients.findByDoc(masked);
        if (res.success && res.client) {
          setReceiptClientFound(res.client);
          setReceiptName(res.client.nome);
        } else {
          setReceiptClientFound(null);
          setReceiptName("");
        }
      } catch (err) {
        console.error("Erro ao buscar cliente por documento:", err);
        setReceiptClientFound(null);
      } finally {
        setReceiptSearching(false);
      }
    }
  };

  // --- DADOS NOVO CLIENTE ---
  const [newClientData, setNewClientData] = useState(INITIAL_NEW_CLIENT_DATA);
  const updateNewClientField = (field, value) => {
    setNewClientData((current) => ({ ...current, [field]: value }));
  };
  const resetNewClientData = () => {
    setNewClientData(INITIAL_NEW_CLIENT_DATA);
  };
  const closeClientModal = () => {
    setShowClientModal(false);
  };
  const clearSelectedClient = () => {
    handleSelectClient(null);
  };

  const paymentInputRef = useRef(null);

  // ===== HOOKS CUSTOMIZADOS =====
  const { cart, addToCart, removeFromCart, handleQuantityChange, clearCart, subtotal } = useCart(products);

  const {
    payments, totals, currentPaymentMethod, setCurrentPaymentMethod,
    currentPaymentValue, setCurrentPaymentValue, installments, setInstallments,
    addPayment, removePayment, autoFillRemaining, clearPayments,
  } = usePayments({
    subtotal,
    discountValue, discountType,
    surchargeValue, surchargeType,
    laborInput,
  });

  const {
    searchTerm, setSearchTerm, searchResults, searchInputRef,
    handleSearchKeyDown, selectProduct, focusSearch, scanCode,
  } = useProductSearch(products, addToCart);

  const {
    clientSearchTerm, setClientSearchTerm,
    showClientResults, setShowClientResults,
    selectedClient,
    filteredClients, handleSelectClient,
  } = useClientSearch(clients);
  const selectedClientObject = clients.find((client) => client.id == selectedClient);
  const selectedClientHasValidDocument = hasValidReceiptDocument(selectedClientObject);

  // ===== LOAD DATA =====
  useEffect(() => {
    loadData();
    focusSearch();
  }, []);

  const loadData = async () => {
    try {
      setLoadingData(true);
      setLoadError("");
      const prods = await api.products.list();
      const people = await api.people.list();
      const clientsData = await api.clients.list();
      const { sellers: sellerOptions, mechanics: mechanicOptions } = getSalesPeopleByRole(people);

      setProducts(prods || []);
      setSellers(sellerOptions);
      setMechanics(mechanicOptions);
      setClients(clientsData || []);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      setLoadError("Nao foi possivel carregar os dados da venda.");
      showAlert("Erro ao carregar dados da venda.", "Erro", "error");
    } finally {
      setLoadingData(false);
    }
  };

  // --- CADASTRO RÁPIDO ---
  const handleSaveNewClient = async (e) => {
    e.preventDefault();
    if (isSavingClient) return;
    if (!newClientData.nome || !newClientData.telefone) {
      return showAlert(
        "Nome e Telefone são obrigatórios!",
        "Dados Incompletos",
        "warning",
      );
    }
    if (newClientData.documento && !validarDocumento(newClientData.documento)) {
      return showAlert("CPF/CNPJ inválido. Verifique o documento.", "Atenção", "error");
    }
    try {
      setIsSavingClient(true);
      const result = await api.clients.save(newClientData);
      if (result.success) {
        showAlert("Cliente cadastrado com sucesso!", "Sucesso", "success");
        const updatedClients = await api.clients.list();
        setClients(updatedClients);
        const newClient = findSavedClient(updatedClients, result.id, newClientData.documento);
        if (newClient) handleSelectClient(newClient);
        closeClientModal();
        resetNewClientData();
      } else {
        showAlert("Erro ao salvar: " + result.error, "Erro", "error");
      }
    } catch (err) {
      console.error(err);
      showAlert("Erro técnico ao salvar cliente.", "Erro", "error");
    } finally {
      setIsSavingClient(false);
    }
  };

  // --- FINALIZAR ---
  const handleFinishSale = async () => {
    if (isFinishingSale) return;
    if (cart.length === 0) return showAlert("Carrinho vazio!", "Erro", "error");
    if (!selectedSeller)
      return showAlert("Selecione um vendedor!", "Erro", "error");
    if (totals.remaining > 0.01)
      return showAlert(
        `Falta receber R$ ${totals.remaining.toFixed(2)}`,
        "Pagamento Incompleto",
        "warning",
      );
    // Trava de Negócio: Desconto não pode consumir valor de adicionais ou mão de obra
    if (totals.discountAmount > totals.subtotal) {
      return showAlert(
        "O desconto não pode ser maior que o subtotal das peças.",
        "Desconto Inválido",
        "error",
      );
    }

    const labor = parseFloat(laborInput) || 0;

    if (labor > 0 && !selectedMechanic)
      return showAlert(
        "Selecione o responsável pela mão de obra!",
        "Aviso",
        "warning",
      );

    const temFiado = payments.some((p) => p.metodo === "Fiado");
    if (temFiado && !selectedClient) {
      return showAlert(
        "Para vendas 'Fiado', É OBRIGATÓRIO selecionar um cliente.",
        "Cliente Necessário",
        "error",
      );
    }

    let finalClientId = selectedClient || null;
    let finalClientObj = findSelectedClient(clients, selectedClient);

    // --- CPF NO RECIBO LOGIC ---
    if (optsCpfReceipt) {
      if (finalClientId && hasValidReceiptDocument(finalClientObj)) {
        // Cliente selecionado já tem documento válido, segue normal
      } else if (finalClientId && !hasValidReceiptDocument(finalClientObj)) {
        if (!receiptCpf) return showAlert("Informe o CPF/CNPJ para o recibo.", "Aviso", "warning");
        if (!validarDocumento(receiptCpf)) return showAlert("Documento inválido.", "Aviso", "error");
        const res = await api.clients.save({ id: finalClientId, documento: receiptCpf });
        if (res.success) {
          finalClientObj = { ...finalClientObj, documento: receiptCpf };
        } else {
          return showAlert("Erro ao salvar documento do cliente.", "Erro", "error");
        }
      } else {
        // Sem cliente selecionado â€” usar o fluxo de auto-busca
        if (!receiptCpf) return showAlert("Informe o CPF/CNPJ para o recibo.", "Aviso", "warning");
        if (!validarDocumento(receiptCpf)) return showAlert("Documento inválido.", "Aviso", "error");

        if (receiptClientFound) {
          // Cliente já foi encontrado pela auto-busca
          finalClientId = receiptClientFound.id;
          finalClientObj = receiptClientFound;
        } else {
          // Cliente novo â€” precisa de nome
          if (!receiptName) return showAlert("Informe o nome do cliente para o recibo.", "Aviso", "warning");
          try {
            const res = await api.clients.save({ nome: receiptName, documento: receiptCpf });
            if (res.success && res.id) {
              finalClientId = res.id;
              finalClientObj = { id: res.id, nome: receiptName, documento: receiptCpf };
            } else {
              return showAlert("Erro ao salvar dados do cliente: " + res.error, "Erro", "error");
            }
          } catch (error) {
            return showAlert("Erro na verificação de cliente: " + error.message, "Erro", "error");
          }
        }
      }
    }

    const saleData = {
      vendedor_id: selectedSeller,
      trocador_id: selectedMechanic || null,
      cliente_id: finalClientId || null,
      subtotal: totals.subtotal,
      acrescimo_valor: totals.surchargeAmount,
      desconto_valor: totals.discountAmount,
      desconto_tipo: discountType,
      mao_de_obra: labor,
      total_final: totals.total,
      pagamentos: payments,
      itens: cart,
    };

    try {
      setIsFinishingSale(true);
      const result = await api.sales.create(saleData);

      if (result.success) {
        const sellerName = sellers.find((s) => s.id == selectedSeller)?.nome;
        const mechanicName = mechanics.find((m) => m.id == selectedMechanic)?.nome;
        const clientName = finalClientObj?.nome || clients.find((c) => c.id == selectedClient)?.nome;

        setLastSale({
          ...saleData,
          id: result.id,
          data_venda: new Date(),
          vendedor_nome: sellerName,
          trocador_nome: mechanicName,
          cliente_nome: clientName,
          cliente_documento: finalClientObj?.documento,
          cliente_telefone: finalClientObj?.telefone,
        });

        setShowReceipt(true);
        setPaymentSheetOpen(false);
        showAlert("Venda realizada com sucesso!", "Sucesso", "success");

        // Reset via hooks
        clearCart();
        clearPayments();
        setDiscountValue("");
        setSurchargeValue("");
        setLaborInput(0);
        setSearchTerm("");
        clearSelectedClient();
        setSelectedMechanic("");
        resetReceiptState();
        loadData();
      } else {
        showAlert("Erro ao salvar: " + result.error, "Erro", "error");
      }
    } catch (err) {
      showAlert("Erro técnico.", "Erro", "error");
    } finally {
      setIsFinishingSale(false);
    }
  };

  const handleSilentPrint = async () => {
    if (isPrintingReceipt) return;
    const receiptElement = document.getElementById("cupom-fiscal");
    if (!receiptElement)
      return showAlert("Erro interno: Cupom não encontrado.", "Erro", "error");
    try {
      setIsPrintingReceipt(true);
      const html = await thermalizeReceiptHtml(receiptElement);
      const result = await api.print.silent(
        html,
        await api.config.get("impressora_padrao"),
      );
      if (result.success) showAlert("Enviado para impressão.", "Sucesso", "success");
      else showAlert("Erro na impressão: " + result.error, "Erro", "error");
    } finally {
      setIsPrintingReceipt(false);
    }
  };

  const renderPaymentPanel = () => (
    <SalePaymentPanel
      laborInput={laborInput}
      onLaborInputChange={setLaborInput}
      selectedMechanic={selectedMechanic}
      onMechanicChange={setSelectedMechanic}
      mechanics={mechanics}
      surchargeType={surchargeType}
      onSurchargeTypeChange={setSurchargeType}
      surchargeValue={surchargeValue}
      onSurchargeValueChange={setSurchargeValue}
      discountType={discountType}
      onDiscountTypeChange={setDiscountType}
      discountValue={discountValue}
      onDiscountValueChange={setDiscountValue}
      totals={totals}
      payments={payments}
      onRemovePayment={removePayment}
      currentPaymentMethod={currentPaymentMethod}
      onCurrentPaymentMethodChange={setCurrentPaymentMethod}
      installments={installments}
      onInstallmentsChange={setInstallments}
      paymentInputRef={paymentInputRef}
      currentPaymentValue={currentPaymentValue}
      onCurrentPaymentValueChange={setCurrentPaymentValue}
      onPaymentValueFocus={autoFillRemaining}
      onAddPayment={addPayment}
      optsCpfReceipt={optsCpfReceipt}
      onOptsCpfReceiptChange={setOptsCpfReceipt}
      selectedClient={selectedClient}
      selectedClientHasValidDocument={selectedClientHasValidDocument}
      receiptCpf={receiptCpf}
      onReceiptCpfChange={setReceiptCpf}
      receiptName={receiptName}
      onReceiptNameChange={setReceiptName}
      receiptClientFound={receiptClientFound}
      receiptSearching={receiptSearching}
      onHandleReceiptCpfChange={handleReceiptCpfChange}
      onFinishSale={handleFinishSale}
      isFinishingSale={isFinishingSale}
    />
  );

  return (
    <div className="h-full px-4 pt-4 pb-28 lg:pb-4 bg-surface-200 overflow-y-auto lg:overflow-hidden custom-scrollbar">
      <div className="flex h-full min-h-0 flex-col gap-4">
        {(loadingData || loadError) && (
          <div className={`rounded-xl border px-4 py-3 text-sm ${
            loadError
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-primary-200 bg-primary-50 text-primary-700"
          }`}>
            {loadError || "Carregando dados da venda..."}
          </div>
        )}

        <div className="flex min-h-0 flex-1 flex-col gap-4 lg:flex-row">
          {/* Esquerda: Produtos e Carrinho */}
          <div className="flex-1 flex flex-col gap-4">
        {/* Barra de Busca e Seleção */}
        <SaleEntryBar
          selectedSeller={selectedSeller}
          onSellerChange={setSelectedSeller}
          sellers={sellers}
          selectedClient={selectedClient}
          clientSearchTerm={clientSearchTerm}
          onClientSearchTermChange={setClientSearchTerm}
          onClearSelectedClient={clearSelectedClient}
          showClientResults={showClientResults}
          onShowClientResultsChange={setShowClientResults}
          clients={clients}
          filteredClients={filteredClients}
          onSelectClient={handleSelectClient}
          onOpenClientModal={() => setShowClientModal(true)}
          searchInputRef={searchInputRef}
          searchTerm={searchTerm}
          onSearchTermChange={setSearchTerm}
          onSearchKeyDown={handleSearchKeyDown}
          searchResults={searchResults}
          onSelectProduct={selectProduct}
          onScanCode={scanCode}
        />

        {/* Tabela do Carrinho */}
        <SaleCartPanel
          cart={cart}
          totals={totals}
          onQuantityChange={handleQuantityChange}
          onRemoveItem={removeFromCart}
        />
          </div>

          {/* Direita: Pagamento — inline no desktop; no mobile vai para o sheet. */}
          {isDesktop && renderPaymentPanel()}
        </div>

        {/* Mobile: barra fixa "Cobrar" + pagamento em bottom sheet */}
        {!isDesktop && (
          <>
            <StickyActionBar>
              <button
                type="button"
                onClick={() => cart.length > 0 && setPaymentSheetOpen(true)}
                disabled={cart.length === 0}
                className="w-full flex items-center justify-between gap-3 rounded-xl bg-green-600 px-5 py-3.5 font-black text-white shadow-lg active:scale-[0.99] transition disabled:bg-surface-400 disabled:opacity-70"
              >
                <span className="text-sm uppercase tracking-widest">Cobrar</span>
                <span className="text-lg">{formatCurrency(totals.total)}</span>
              </button>
            </StickyActionBar>
            <Sheet
              isOpen={paymentSheetOpen}
              onClose={() => setPaymentSheetOpen(false)}
              title="Pagamento"
              size="full"
            >
              {renderPaymentPanel()}
            </Sheet>
          </>
        )}

        {showClientModal && (
          <QuickClientModal
            newClientData={newClientData}
            onClientFieldChange={updateNewClientField}
            onClose={closeClientModal}
            onSubmit={handleSaveNewClient}
            isSavingClient={isSavingClient}
          />
        )}

        {showReceipt && lastSale && (
          <SaleReceiptModal
            lastSale={lastSale}
            onPrint={handleSilentPrint}
            onClose={() => setShowReceipt(false)}
            isPrintingReceipt={isPrintingReceipt}
          />
        )}
      </div>
    </div>
  );
};

export default Vendas;







