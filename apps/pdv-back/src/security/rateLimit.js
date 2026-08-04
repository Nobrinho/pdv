// =============================================================
// rateLimit.js - Rate limiting simples em memoria (janela deslizante).
// Suficiente para uma instancia; para multi-instancia use um store
// compartilhado (ex.: Redis).
// =============================================================
const buckets = new Map(); // chave -> lista de timestamps

let lastCleanup = Date.now();
function cleanup(windowMs) {
  const now = Date.now();
  if (now - lastCleanup < windowMs) return;
  lastCleanup = now;
  for (const [key, times] of buckets) {
    const kept = times.filter((t) => now - t < windowMs);
    if (kept.length) buckets.set(key, kept);
    else buckets.delete(key);
  }
}

// Retorna { limited, remaining }. Conta a tentativa atual.
function rateLimit(key, { windowMs, max }) {
  const now = Date.now();
  const times = (buckets.get(key) || []).filter((t) => now - t < windowMs);
  times.push(now);
  buckets.set(key, times);
  cleanup(windowMs);
  return { limited: times.length > max, remaining: Math.max(0, max - times.length) };
}

module.exports = { rateLimit };
