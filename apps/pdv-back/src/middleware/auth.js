const { verifyToken } = require("../security/token");

function getBearerToken(req) {
  const header = req.headers.authorization || "";
  const [type, token] = header.split(" ");
  if (type !== "Bearer" || !token) return null;
  return token;
}

function requireToken(req) {
  const token = getBearerToken(req);
  if (!token) return null;
  return verifyToken(token);
}

function requirePlatform(req) {
  const payload = requireToken(req);
  if (!payload || payload.type !== "platform") return null;
  return payload;
}

function requireStore(req) {
  const payload = requireToken(req);
  if (!payload || payload.type !== "store" || !payload.lojaId) return null;
  return payload;
}

function isStoreAdmin(auth) {
  return ["admin", "gerente"].includes(String(auth?.cargo || "").toLowerCase());
}

async function ensureStoreActive(knex, auth) {
  const loja = await knex("lojas").where("id", auth.lojaId).first();
  if (!loja) return { ok: false, error: "Loja nao encontrada." };
  if (["blocked", "cancelled", "suspended"].includes(loja.status)) {
    return { ok: false, error: "Acesso da loja bloqueado.", loja };
  }
  return { ok: true, loja };
}

module.exports = { requirePlatform, requireStore, isStoreAdmin, ensureStoreActive };
