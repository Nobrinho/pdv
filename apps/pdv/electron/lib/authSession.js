const {
  computeEffectivePermissions,
  hasCapability,
} = require("../../../../packages/shared/domain/permissions");

// Interpreta o permissoes_json do usuário → { grants:[], denies:[] }.
function parseOverrides(raw) {
  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw || "{}") : raw || {};
    return {
      grants: Array.isArray(parsed.grants) ? parsed.grants : [],
      denies: Array.isArray(parsed.denies) ? parsed.denies : [],
    };
  } catch {
    return { grants: [], denies: [] };
  }
}

function createAuthSession() {
  const sessions = new Map();
  const adminGrants = new Map();

  const getSenderId = (event) => event?.sender?.id || "default";
  const isGrantActive = (senderId) => {
    const expiresAt = adminGrants.get(senderId);
    if (!expiresAt) return false;
    if (expiresAt <= Date.now()) {
      adminGrants.delete(senderId);
      return false;
    }
    return true;
  };

  return {
    setUser(event, user) {
      sessions.set(getSenderId(event), user);
    },
    getUser(event) {
      return sessions.get(getSenderId(event)) || null;
    },
    clearUser(event) {
      const senderId = getSenderId(event);
      sessions.delete(senderId);
      adminGrants.delete(senderId);
    },
    grantAdmin(event, ttlMs = 10 * 60 * 1000) {
      adminGrants.set(getSenderId(event), Date.now() + ttlMs);
    },
    isAdmin(event) {
      const senderId = getSenderId(event);
      return sessions.get(senderId)?.cargo === "admin" || isGrantActive(senderId);
    },
  };
}

async function hasUsers(knex) {
  const result = await knex("usuarios").count("id as total").first();
  return Number(result?.total || 0) > 0;
}

async function requireAdmin(event, knex, authSession, options = {}) {
  const { allowBootstrap = false } = options;

  if (allowBootstrap && !(await hasUsers(knex))) {
    return null;
  }

  if (authSession?.isAdmin(event)) {
    return null;
  }

  return {
    success: false,
    error: "Permissao de administrador necessaria.",
  };
}

// Permissões efetivas do usuário logado nesta janela (lê o banco a cada
// checagem, como no backend online). Admin — ou grant de supervisor ativo —
// recebe tudo. Sem sessão → sem permissões.
async function getEffectivePermissions(knex, event, authSession) {
  if (authSession?.isAdmin(event)) {
    return computeEffectivePermissions({ cargo: "admin" });
  }

  const sessionUser = authSession?.getUser(event);
  if (!sessionUser?.id) return [];

  const row = await knex("usuarios").where("id", sessionUser.id).first();
  if (!row) return [];

  return computeEffectivePermissions({
    cargo: row.cargo,
    overrides: parseOverrides(row.permissoes_json),
  });
}

// Retorna null se autorizado; senão o objeto de erro padrão (mesmo formato de
// requireAdmin). Uso: `const err = await requirePerm(...); if (err) return err;`
async function requirePerm(event, knex, authSession, capability) {
  const eff = await getEffectivePermissions(knex, event, authSession);
  if (hasCapability(eff, capability)) return null;
  return { success: false, error: "Voce nao tem permissao para esta acao." };
}

// Autoriza se o usuário tem QUALQUER uma das capabilities.
async function requirePermAny(event, knex, authSession, capabilities) {
  const eff = await getEffectivePermissions(knex, event, authSession);
  if (capabilities.some((c) => hasCapability(eff, c))) return null;
  return { success: false, error: "Voce nao tem permissao para esta acao." };
}

module.exports = {
  createAuthSession,
  hasUsers,
  requireAdmin,
  parseOverrides,
  getEffectivePermissions,
  requirePerm,
  requirePermAny,
};
