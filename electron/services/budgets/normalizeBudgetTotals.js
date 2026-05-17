const toCents = (value) => Math.round((Number(value) || 0) * 100);
const fromCents = (cents) => Number((cents / 100).toFixed(2));

function normalizeBudgetTotals(budgetData) {
  const subtotalCents = toCents(budgetData.subtotal);
  const laborCents = toCents(budgetData.mao_de_obra);
  const surchargeCents = toCents(budgetData.acrescimo_valor);
  const discountCents = toCents(budgetData.desconto_valor);
  const totalCents = Math.max(0, subtotalCents + laborCents + surchargeCents - discountCents);

  return {
    subtotalCents,
    laborCents,
    surchargeCents,
    discountCents,
    totalCents,
    fromCents,
  };
}

module.exports = {
  normalizeBudgetTotals,
  toCents,
  fromCents,
};
