export const toBudgetNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

export const calculateBudgetTotals = ({
  cart = [],
  laborInput = 0,
  surchargeValue = 0,
  discountValue = 0,
}) => {
  const subtotal = cart.reduce(
    (acc, item) => acc + toBudgetNumber(item.preco_venda) * toBudgetNumber(item.qty),
    0,
  );
  const labor = Math.max(0, toBudgetNumber(laborInput));
  const surcharge = Math.max(0, toBudgetNumber(surchargeValue));
  const discount = Math.max(0, toBudgetNumber(discountValue));
  const total = Math.max(0, subtotal + labor + surcharge - discount);

  return {
    subtotal,
    labor,
    surcharge,
    discount,
    total,
  };
};
