async function buildBudgetCode(knex, referenceTs = Date.now()) {
  const date = new Date(referenceTs);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const prefix = `ORC-${year}${month}${day}`;

  const startOfDay = new Date(year, date.getMonth(), date.getDate()).getTime();
  const endOfDay = new Date(year, date.getMonth(), date.getDate() + 1).getTime() - 1;

  const result = await knex("orcamentos")
    .whereBetween("data_criacao", [startOfDay, endOfDay])
    .count("id as total")
    .first();

  const sequence = String(Number(result?.total || 0) + 1).padStart(4, "0");
  return `${prefix}-${sequence}`;
}

module.exports = { buildBudgetCode };
