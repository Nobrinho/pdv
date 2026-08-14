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

module.exports = { createAuthSession, hasUsers, requireAdmin };
