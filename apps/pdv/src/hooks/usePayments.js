// =============================================================
// usePayments.js — Hook de gerenciamento de pagamentos múltiplos
// =============================================================
import { useState, useMemo, useCallback } from "react";
import { useAlert } from "../context/AlertSystem";

const usePayments = ({
  subtotal,
  discountValue,
  discountType,
  surchargeValue,
  surchargeType,
  laborInput,
}) => {
  const { showAlert } = useAlert();
  const [payments, setPayments] = useState([]);
  const [currentPaymentMethod, setCurrentPaymentMethod] = useState("Dinheiro");
  const [currentPaymentValue, setCurrentPaymentValue] = useState("");
  const [installments, setInstallments] = useState(1);

  // --- CÁLCULOS TOTAIS ---
  const totals = useMemo(() => {
    const distVal = parseFloat(discountValue) || 0;
    let discountAmount = 0;
    if (distVal > 0)
      discountAmount =
        discountType === "fixed" ? distVal : (subtotal * distVal) / 100;

    const surVal = parseFloat(surchargeValue) || 0;
    let surchargeAmount = 0;
    if (surVal > 0)
      surchargeAmount =
        surchargeType === "fixed" ? surVal : (subtotal * surVal) / 100;

    const laborValue = parseFloat(laborInput || 0);
    const total = Math.max(
      0,
      subtotal + laborValue + surchargeAmount - discountAmount,
    );

    const totalPaid = payments.reduce((acc, p) => acc + p.valor, 0);
    const remaining = Math.max(0, total - totalPaid);
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
  }, [
    subtotal,
    discountValue,
    discountType,
    surchargeValue,
    surchargeType,
    payments,
    laborInput,
  ]);

  const addPayment = useCallback(() => {
    const valor = parseFloat(currentPaymentValue);
    if (!valor || valor <= 0) return showAlert("Digite um valor válido.");

    const currentTotalPaid = payments.reduce((acc, p) => acc + p.valor, 0);
    const currentRemaining = totals.total - currentTotalPaid;

    if (
      valor > currentRemaining + 0.01 &&
      currentPaymentMethod !== "Dinheiro"
    ) {
      return showAlert(
        "Valor maior que o restante. Para troco, use 'Dinheiro'.",
        "Aviso",
        "warning",
      );
    }

    let detalhes = "";
    if (currentPaymentMethod.includes("Crédito")) detalhes = `${installments}x`;

    setPayments((prev) => [
      ...prev,
      { metodo: currentPaymentMethod, valor, detalhes },
    ]);
    setCurrentPaymentValue("");
  }, [currentPaymentValue, currentPaymentMethod, installments, payments, totals.total, showAlert]);

  const removePayment = useCallback((index) => {
    setPayments((prev) => {
      const newPayments = [...prev];
      newPayments.splice(index, 1);
      return newPayments;
    });
  }, []);

  const autoFillRemaining = useCallback(() => {
    if (totals.remaining > 0) {
      setCurrentPaymentValue(totals.remaining.toFixed(2));
    }
  }, [totals.remaining]);

  const clearPayments = useCallback(() => {
    setPayments([]);
    setCurrentPaymentValue("");
    setInstallments(1);
  }, []);

  return {
    payments,
    totals,
    currentPaymentMethod,
    setCurrentPaymentMethod,
    currentPaymentValue,
    setCurrentPaymentValue,
    installments,
    setInstallments,
    addPayment,
    removePayment,
    autoFillRemaining,
    clearPayments,
  };
};

export default usePayments;
