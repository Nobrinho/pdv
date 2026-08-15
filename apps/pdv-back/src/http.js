// Aplica CORS (allowlist) e cabecalhos de seguranca. Chamado no inicio de
// cada request; usa setHeader para persistir ate o writeHead.
// App desktop (cliente primeiro-parte): em dev roda em localhost; empacotado
// (file://) manda Origin "null". Esses contextos sao sempre liberados.
function isFirstPartyAppOrigin(origin) {
  if (origin === "null") return true;
  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
}

// Normaliza uma origem para comparar sem tropecar em barra no fim / espacos.
function normalizeOrigin(o) {
  return String(o || "").trim().replace(/\/+$/, "").toLowerCase();
}

function applySecurity(req, res, config) {
  const origin = req.headers.origin;
  const normOrigin = normalizeOrigin(origin);
  const list = (config.corsOrigins || []).map(normalizeOrigin);
  let allowOrigin = null;

  if (!list.length) {
    allowOrigin = "*"; // dev: sem allowlist
  } else if (origin && list.includes(normOrigin)) {
    allowOrigin = origin; // origem web autorizada (compara normalizado; ecoa a original)
  } else if (origin && isFirstPartyAppOrigin(origin)) {
    allowOrigin = origin; // app desktop (localhost em dev ou file:// empacotado)
  }

  if (allowOrigin) {
    res.setHeader("Access-Control-Allow-Origin", allowOrigin);
    if (allowOrigin !== "*") res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
}

function sendJson(res, statusCode, data) {
  const body = JSON.stringify(data);
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
  });
  res.end(body);
}

function sendHtml(res, statusCode, html) {
  res.writeHead(statusCode, {
    "Content-Type": "text/html; charset=utf-8",
    "Content-Length": Buffer.byteLength(html),
  });
  res.end(html);
}

function sendError(res, statusCode, message, details) {
  sendJson(res, statusCode, {
    success: false,
    error: message,
    ...(details ? { details } : {}),
  });
}

// Limite do corpo da requisicao. Importacao/backup enviam dumps grandes,
// entao o teto e generoso (configuravel por MAX_BODY_MB, padrao 25MB).
const MAX_BODY_BYTES = Number(process.env.MAX_BODY_MB || 25) * 1024 * 1024;

function readJson(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    let aborted = false;
    req.on("data", (chunk) => {
      if (aborted) return;
      body += chunk;
      if (body.length > MAX_BODY_BYTES) {
        aborted = true;
        reject(new Error("Payload muito grande."));
      }
    });
    req.on("end", () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new Error("JSON invalido."));
      }
    });
    req.on("error", reject);
  });
}

module.exports = { sendJson, sendHtml, sendError, readJson, applySecurity };
