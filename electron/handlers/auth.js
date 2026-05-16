/**
 * Handlers de autenticacao e usuarios.
 */
const { hashPassword, verifyPassword } = require("../services/auth");
const { requireAdmin } = require("../lib/authSession");

function buildPublicUser(user) {
  return {
    id: user.id,
    nome: user.nome,
    username: user.username,
    cargo: user.cargo,
  };
}

const ALLOWED_ROLES = new Set(["admin", "gerente", "vendedor", "caixa"]);

function normalizeUserPayload(userData = {}) {
  const nome = String(userData.nome || "").trim();
  const username = String(userData.username || "").trim();
  const password = String(userData.password || "");
  const cargo = String(userData.cargo || "admin").trim().toLowerCase();

  if (!nome) {
    return { error: "Nome obrigatorio." };
  }
  if (!username) {
    return { error: "Nome de usuario obrigatorio." };
  }
  if (password.length < 4) {
    return { error: "Senha deve ter pelo menos 4 caracteres." };
  }
  if (!ALLOWED_ROLES.has(cargo)) {
    return { error: "Cargo de usuario invalido." };
  }

  return { nome, username, password, cargo };
}

async function attemptLogin(knex, { username, password }) {
  const user = await knex("usuarios")
    .whereRaw("LOWER(username) = LOWER(?)", [String(username || "").trim()])
    .first();

  if (!user || user.ativo === 0 || user.ativo === false) {
    return { success: false, error: "Usuario invalido ou inativo." };
  }

  const result = verifyPassword(password, user.salt, user.password_hash);
  if (!result.valid) {
    return { success: false, error: "Senha incorreta" };
  }

  if (result.needsRehash) {
    const { salt, hash } = hashPassword(password);
    await knex("usuarios").where("id", user.id).update({
      password_hash: hash,
      salt,
    });
    console.log(`Senha re-hasheada para usuario: ${user.username}`);
  }

  return { success: true, user: buildPublicUser(user) };
}

function register(safeHandle, knex, authSession) {
  safeHandle("check-users-exist", async () => {
    return (await knex("usuarios").count("id as total").first()).total > 0;
  });

  safeHandle("check-onboarding-status", async () => {
    const userCount = (await knex("usuarios").count("id as total").first()).total;
    const storeName = await knex("configuracoes").where("chave", "loja_nome").first();

    return {
      onboardingDone: userCount > 0 && !!storeName,
      hasUsers: userCount > 0,
      hasStoreConfig: !!storeName,
    };
  });

  safeHandle("register-user", async (event, userData) => {
    const authError = await requireAdmin(event, knex, authSession, { allowBootstrap: true });
    if (authError) return authError;

    const normalized = normalizeUserPayload(userData);
    if (normalized.error) {
      return { success: false, error: normalized.error };
    }

    const { salt, hash } = hashPassword(normalized.password);
    const usernameTratado = normalized.username;

    const existing = await knex("usuarios")
      .whereRaw("LOWER(username) = LOWER(?)", [usernameTratado])
      .first();

    if (existing) {
      if (existing.ativo === 0 || existing.ativo === false) {
        await knex("usuarios").where("id", existing.id).update({
          nome: normalized.nome,
          password_hash: hash,
          salt,
          cargo: normalized.cargo,
          ativo: 1,
        });
        return { success: true };
      }

      return {
        success: false,
        error: "Este nome de usuario ja esta em uso. Escolha outro.",
      };
    }

    try {
      await knex("usuarios").insert({
        nome: normalized.nome,
        username: usernameTratado,
        password_hash: hash,
        salt,
        cargo: normalized.cargo,
        ativo: 1,
      });
      return { success: true };
    } catch (error) {
      if (error.code === "SQLITE_CONSTRAINT_UNIQUE") {
        return {
          success: false,
          error: "Este nome de usuario ja esta em uso. Escolha outro.",
        };
      }
      throw error;
    }
  });

  safeHandle("login-attempt", async (event, credentials) => {
    const result = await attemptLogin(knex, credentials);
    if (result.success) authSession?.setUser(event, result.user);
    return result;
  });

  safeHandle("verify-admin", async (event, credentials) => {
    const result = await attemptLogin(knex, credentials);
    if (!result.success) return result;
    if (result.user.cargo !== "admin") {
      return { success: false, error: "Permissao de administrador necessaria." };
    }
    authSession?.grantAdmin(event);
    return result;
  });

  safeHandle("logout-session", async (event) => {
    authSession?.clearUser(event);
    return { success: true };
  });

  safeHandle("get-users", async (event) => {
    const authError = await requireAdmin(event, knex, authSession);
    if (authError) return authError;

    return await knex("usuarios")
      .where("ativo", 1)
      .orWhere("ativo", true)
      .select("id", "nome", "username", "cargo");
  });

  safeHandle("delete-user", async (event, id) => {
    const authError = await requireAdmin(event, knex, authSession);
    if (authError) return authError;

    const user = await knex("usuarios").where("id", id).first();
    if (!user || user.ativo === 0 || user.ativo === false) {
      return { success: false, error: "Usuario nao encontrado." };
    }

    if (user.cargo === "admin") {
      const activeAdmins = await knex("usuarios")
        .where("cargo", "admin")
        .where(function () {
          this.where("ativo", 1).orWhere("ativo", true);
        })
        .count("id as total")
        .first();

      if (Number(activeAdmins?.total || 0) <= 1) {
        return { success: false, error: "Nao e permitido excluir o ultimo administrador." };
      }
    }

    await knex("usuarios").where("id", id).update({ ativo: 0 });
    return { success: true };
  });
}

module.exports = { register, attemptLogin };
