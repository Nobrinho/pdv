// =============================================================
// logger.js - Log estruturado em JSON (uma linha por evento).
// Facilita busca/agregacao em producao.
// =============================================================
function emit(level, msg, ctx = {}) {
  const line = JSON.stringify({ ts: new Date().toISOString(), level, msg, ...ctx });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

module.exports = {
  info: (msg, ctx) => emit("info", msg, ctx),
  warn: (msg, ctx) => emit("warn", msg, ctx),
  error: (msg, ctx) => emit("error", msg, ctx),
};
