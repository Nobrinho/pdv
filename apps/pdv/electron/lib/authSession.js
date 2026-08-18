const {
  computeEffectivePermissions,
  hasCapability,
  ALL_CAPABILITIES,
} = require("../../../../packages/shared/domain/permissions");

const CAPABILITY_SET = new Set(ALL_CAPABILITIES);

// Lê perfis_acesso.permissoes_json (array de capabilities) do perfil atribuído,
// ou null quando não há perfil → cai no preset do cargo.
async function loadProfileCaps(knex, perfilId) {
  if (!perfilId) return null;
  const perfil = await knex("perfis_acesso").where("id", perfilId).first();
  if (!perfil) return null;
  try {
    const arr = JSON.parse(perfil.permissoes_json || "[]");
    return Array.isArray(arr) ? arr.filter((c) => CAPABILITY_SET.has(c)) : null;
  } catch {
    return null;
  }
}

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

  const roleTemplate = await loadProfileCaps(knex, row.perfil_id);
  return computeEffectivePermissions({
    cargo: row.cargo,
    roleTemplate,
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

// Escopo de visibilidade de dados do usuário logado nesta janela.
//   { all: true }            → vê tudo (admin/grant, ou data.view_all)
//   { all: false, pessoaId } → só os próprios (pessoa vinculada; null se sem vínculo)
async function getDataScope(knex, event, authSession) {
  const eff = await getEffectivePermissions(knex, event, authSession);
  if (hasCapability(eff, "data.view_all")) return { all: true, pessoaId: null };
  const sessionUser = authSession?.getUser(event);
  if (!sessionUser?.id) return { all: false, pessoaId: null };
  const row = await knex("usuarios").where("id", sessionUser.id).first();
  return { all: false, pessoaId: row?.pessoa_id ?? null };
}

// Filtro de vendedor conforme o escopo. Escopado sem vínculo → -1 (nada).
function scopedSellerId(scope, requested) {
  if (scope.all) return requested;
  return scope.pessoaId ?? -1;
}

module.exports = {
  createAuthSession,
  hasUsers,
  requireAdmin,
  parseOverrides,
  loadProfileCaps,
  getEffectivePermissions,
  requirePerm,
  requirePermAny,
  getDataScope,
  scopedSellerId,
};
