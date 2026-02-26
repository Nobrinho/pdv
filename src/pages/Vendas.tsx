import React, { useState, useMemo } from "react";
import { useAlert } from "../context/AlertSystem";
import CupomFiscal from "../components/CupomFiscal";
import { CompanyInfo, SalePayment } from "../types";
import { useProducts } from "../hooks/useProducts";
import { usePeople } from "../hooks/usePeople";
import { useClients } from "../hooks/useClients";
import { useSalesCart } from "../hooks/useSalesCart";

import CartTable from "../components/sales/CartTable";
import ProductSearch from "../components/sales/ProductSearch";
import ClientSearch from "../components/sales/ClientSearch";
import NewClientModal from "../components/sales/NewClientModal";
import AdjustmentSection from "../components/sales/AdjustmentSection";
import PaymentSection from "../components/sales/PaymentSection";

import { useQuery } from "@tanstack/react-query";
import * as z from "zod";

const saleSchema = z.object({
  cart: z.array(z.any()).min(1, "Carrinho vazio!"),
  vendedor_id: z.number({ message: "Selecione um vendedor!" }),
  remaining: z.number().max(0.01, { message: "Pagamento incompleto!" }),
  mao_de_obra: z.number(),
  trocador_id: z.number().nullable().optional(),
  pagamentos: z.array(z.any()),
  cliente_id: z.number().nullable().optional(),
}).refine(data => data.mao_de_obra <= 0 || !!data.trocador_id, {
  message: "Selecione o responsável pela mão de obra!",
})
.refine(data => !data.pagamentos.some(p => p.metodo === "Fiado") || !!data.cliente_id, {
  message: "Para vendas 'Fiado', é OBRIGATÓRIO selecionar um cliente.",
});

const Vendas: React.FC = () => {
  const { showAlert } = useAlert();
  const { products, loadProducts } = useProducts();
  const { sellers, mechanics } = usePeople();
  const { clients, saveClient } = useClients();
  const { cart, addToCart, handleQuantityChange, removeFromCart, clearCart } = useSalesCart(products);

  // --- ESTADOS DE SELEÇÃO ---
  const [selectedSeller, setSelectedSeller] = useState<string | number>("");
  const [selectedClient, setSelectedClient] = useState<number | null>(null);
  const [selectedMechanic, setSelectedMechanic] = useState<string | number>("");

  // --- VALORES GERAIS ---
  const [discountValue, setDiscountValue] = useState("");
  const [discountType, setDiscountType] = useState<"percent" | "fixed">("percent");
  const [surchargeValue, setSurchargeValue] = useState("");
  const [surchargeType, setSurchargeType] = useState<"percent" | "fixed">("fixed");
  const [laborInput, setLaborInput] = useState<string | number>(0);

  // --- PAGAMENTO MULTIPLO ---
  const [payments, setPayments] = useState<SalePayment[]>([]);

  // --- MODAIS ---
  const [showReceipt, setShowReceipt] = useState(false);
  const [showClientModal, setShowClientModal] = useState(false);
  const [lastSale, setLastSale] = useState<any>(null);

  const { data: companyInfo } = useQuery<CompanyInfo>({
    queryKey: ["companyInfo"],
    queryFn: () => window.api.getCompanyInfo(),
  });

  // --- CÁLCULOS TOTAIS ---
  const totals = useMemo(() => {
    const subtotal = cart.reduce((acc, item) => acc + item.preco_venda * item.qty, 0);

    const distVal = parseFloat(discountValue) || 0;
    let discountAmount = 0;
    if (distVal > 0)
      discountAmount = discountType === "fixed" ? distVal : (subtotal * distVal) / 100;

    const surVal = parseFloat(surchargeValue) || 0;
    let surchargeAmount = 0;
    if (surVal > 0)
      surchargeAmount = surchargeType === "fixed" ? surVal : (subtotal * surVal) / 100;

    const laborValue = parseFloat(laborInput.toString() || "0");
    const total = Math.max(0, subtotal + laborValue + surchargeAmount - discountAmount);

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
      laborValue,
    };
  }, [cart, discountValue, discountType, surchargeValue, surchargeType, payments, laborInput]);

  // --- HANDLERS ---
  const handleAddPayment = (payment: SalePayment) => {
    if (payment.valor > totals.remaining + 0.01 && payment.metodo !== "Dinheiro") {
      return showAlert("Valor maior que o restante. Para troco, use 'Dinheiro'.", "Aviso", "info");
    }
    setPayments([...payments, payment]);
  };

  const handleRemovePayment = (index: number) => {
    const newPayments = [...payments];
    newPayments.splice(index, 1);
    setPayments(newPayments);
  };

  const handleFinishSale = async () => {
    const labor = parseFloat(laborInput.toString()) || 0;
    
    const validationData = {
      cart,
      vendedor_id: Number(selectedSeller) || undefined,
      remaining: totals.remaining,
      mao_de_obra: labor,
      trocador_id: selectedMechanic ? Number(selectedMechanic) : null,
      pagamentos: payments,
      cliente_id: selectedClient,
    };

    const validation = saleSchema.safeParse(validationData);
    if (!validation.success) {
      return showAlert(validation.error.issues[0].message, "Erro de Validação", "info");
    }

    const saleData = {
      vendedor_id: Number(selectedSeller),
      trocador_id: selectedMechanic ? Number(selectedMechanic) : null,
      cliente_id: selectedClient ? Number(selectedClient) : null,
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
      const result = await window.api.createSale(saleData);

      if (result.success) {
        const sellerName = sellers.find((s: any) => s.id === Number(selectedSeller))?.nome;
        const mechanicName = mechanics.find((m: any) => m.id === Number(selectedMechanic))?.nome;
        const clientName = clients.find((c: any) => c.id === selectedClient)?.nome;

        setLastSale({
          ...saleData,
          id: result.id,
          data_venda: new Date(),
          vendedor_nome: sellerName,
          trocador_nome: mechanicName,
          cliente_nome: clientName,
        });

        setShowReceipt(true);
        showAlert("Venda realizada com sucesso!", "Sucesso", "success");

        clearCart();
        setPayments([]);
        setDiscountValue("");
        setSurchargeValue("");
        setLaborInput(0);
        setSelectedClient(null);
        setSelectedMechanic("");
        loadProducts();
      } else {
        showAlert("Erro ao salvar: " + result.error, "Erro", "error");
      }
    } catch (err) {
      showAlert("Erro técnico.", "Erro", "error");
    }
  };

  const handleSilentPrint = async () => {
    const receiptElement = document.getElementById("cupom-fiscal");
    if (!receiptElement) return showAlert("Erro interno: Cupom não encontrado.", "Erro", "error");
    
    const result = await window.api.printSilent(
      receiptElement.outerHTML,
      await window.api.getConfig("impressora_padrao")
    );
    
    if (result.success) showAlert("Impressão enviada com sucesso!", "Sucesso", "success");
    else showAlert("Erro na impressão: " + result.error, "Erro", "error");
  };

  const formatCurrency = (val: number) => `R$ ${val.toFixed(2).replace(".", ",")}`;

  return (
    <div className="flex h-full gap-4 p-4 bg-gray-100 dark:bg-slate-950">
      <div className="flex-1 flex flex-col gap-4">
        <ClientSearch
          clients={clients}
          sellers={sellers}
          selectedClient={selectedClient || ""}
          selectedSeller={selectedSeller}
          onSelectClient={(c: any) => setSelectedClient(c ? c.id! : null)}
          onSelectSeller={setSelectedSeller}
          onOpenNewClientModal={() => setShowClientModal(true)}
        />

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-slate-800">
          <ProductSearch products={products} onAddToCart={addToCart} />
        </div>

        <CartTable
          cart={cart}
          onQuantityChange={(id: number, qty: string) => handleQuantityChange(id, parseInt(qty))}
          onRemove={removeFromCart}
          subtotal={totals.subtotal}
        />
      </div>

      <div className="w-96 flex flex-col gap-4">
        <AdjustmentSection
          laborInput={laborInput}
          setLaborInput={setLaborInput}
          mechanics={mechanics}
          selectedMechanic={selectedMechanic}
          setSelectedMechanic={setSelectedMechanic}
          surchargeType={surchargeType}
          setSurchargeType={setSurchargeType}
          surchargeValue={surchargeValue}
          setSurchargeValue={setSurchargeValue}
          discountType={discountType}
          setDiscountType={setDiscountType}
          discountValue={discountValue}
          setDiscountValue={setDiscountValue}
          total={totals.total}
        />

        <PaymentSection
          payments={payments}
          onAddPayment={handleAddPayment}
          onRemovePayment={handleRemovePayment}
          remaining={totals.remaining}
          total={totals.total}
        />

        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl shadow-md border-t-4 border-green-600">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-800 dark:text-slate-100 dark:text-slate-400 font-medium">Situação:</span>
            <span className={`font-bold ${totals.remaining <= 0.01 ? "text-green-600" : "text-amber-600"}`}>
              {totals.remaining <= 0.01 ? "PAGO TOTAL" : `FALTA ${formatCurrency(totals.remaining)}`}
            </span>
          </div>
          {totals.change > 0 && (
            <div className="flex justify-between items-center p-2 bg-yellow-50 rounded border border-yellow-200 mb-4 animate-bounce">
              <span className="text-sm font-bold text-yellow-800">TROCO</span>
              <span className="text-xl font-black text-yellow-900">{formatCurrency(totals.change)}</span>
            </div>
          )}
          <button
            onClick={handleFinishSale}
            className="w-full py-4 bg-green-600 text-white rounded-xl font-black text-lg hover:bg-green-700 transition shadow-lg shadow-green-200 dark:shadow-green-900/30 flex items-center justify-center gap-2"
          >
            <i className="fas fa-check-double"></i>
            FINALIZAR VENDA
          </button>
        </div>
      </div>

      <NewClientModal
        isOpen={showClientModal}
        onClose={() => setShowClientModal(false)}
        onSave={async (data: any) => {
          const res = await saveClient(data);
          if (res.success) {
             const updated = await window.api.getClients();
             const newC = updated.find((c: any) => c.documento === data.documento);
             if (newC) setSelectedClient(newC.id);
          }
          return res;
        }}
      />

      {showReceipt && lastSale && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[100] p-4 bg-blur-sm">
          <div className="bg-white dark:bg-slate-900 p-8 rounded-xl shadow-2xl max-w-sm w-full max-h-[90vh] overflow-y-auto relative animate-scale-in">
            <button
              onClick={() => setShowReceipt(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:text-slate-300"
            >
              <i className="fas fa-times text-xl"></i>
            </button>
            <CupomFiscal 
              sale={lastSale} 
              items={lastSale.itens || []} 
              companyInfo={companyInfo || null} 
              id="cupom-fiscal" 
            />
            <div className="mt-8 flex gap-3">
              <button
                onClick={handleSilentPrint}
                className="flex-1 bg-brand-primary text-white py-3 rounded-lg font-bold hover:bg-brand-dark transition shadow-md"
              >
                <i className="fas fa-print mr-2"></i>Imprimir
              </button>
              <button
                onClick={() => setShowReceipt(false)}
                className="flex-1 bg-gray-100 dark:bg-slate-950 text-gray-700 py-3 rounded-lg font-bold hover:bg-gray-200 transition"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Vendas;
