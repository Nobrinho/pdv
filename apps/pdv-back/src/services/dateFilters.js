function normalizeDateFilter(value, boundary) {
  if (value === undefined || value === null || value === "") return null;

  const raw = String(value);
  const numeric = Number(raw);
  let date;

  if (Number.isFinite(numeric)) {
    date = new Date(numeric);
  } else if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    date = new Date(`${raw}T${boundary === "end" ? "23:59:59.999" : "00:00:00.000"}`);
  } else {
    date = new Date(raw);
  }

  if (Number.isNaN(date.getTime())) return null;
  if (boundary === "start") date.setHours(0, 0, 0, 0);
  if (boundary === "end") date.setHours(23, 59, 59, 999);
  return date;
}

module.exports = { normalizeDateFilter };
