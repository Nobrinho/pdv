/**
 * Handlers de autenticacao e usuarios.
 */
const { hashPassword, verifyPassword } = require("../services/auth");
const { requireAdmin, requirePerm, parseOverrides, loadProfileCaps } = require("../lib/authSession");
const {
  computeEffectivePermissions,
  ALL_CAPABILITIES,
} = require("../../../../packages/shared/domain/permissions");

const CAPABILITY_SET = new Set(ALL_CAPABILITIES);

// Filtra os overrides para conter só capabilities conhecidas (evita lixo no DB).
function sanitizeOverrides(overrides) {
  const { grants, denies } = parseOverrides(overrides);
  return {
    grants: grants.filter((c) => CAPABILITY_SET.has(c)),
    denies: denies.filter((c) => CAPABILITY_SET.has(c)),
  };
}

// Filtra uma lista de capabilities (para salvar um perfil).
function sanitizeCaps(caps) {
  return (Array.isArray(caps) ? caps : []).filter((c) => CAPABILITY_SET.has(c));
}

async function buildPublicUser(knex, user) {
  const overrides = parseOverrides(user.permissoes_json);
  const roleTemplate = await loadProfileCaps(knex, user.perfil_id);
  let perfilNome = null;
  if (user.perfil_id) {
    const perfil = await knex("perfis_acesso").where("id", user.perfil_id).first();
    perfilNome = perfil?.nome ?? null;
  }
  return {
    id: user.id,
    nome: user.nome,
    username: user.username,
    cargo: user.cargo,
    perfilId: user.perfil_id ?? null,
    perfilNome,
    overrides,
    permissions: computeEffectivePermissions({ cargo: user.cargo, roleTemplate, overrides }),
  };
}

const ALLOWED_ROLES = new Set(["admin", "gerente", "vendedor", "caixa"]);

function normalizeUserPayload(userData = {}, { requirePassword = true } = {}) {
  const nome = String(userData.nome || "").trim();
  const username = String(userData.username || "").trim();
  const password = String(userData.password || "");
  const cargo = String(userData.cargo || "admin").trim().toLowerCase();
  const perfilRaw = userData.perfilId ?? userData.perfil_id;
  const perfilId = perfilRaw === null || perfilRaw === undefined || perfilRaw === "" ? null : Number(perfilRaw);
  const pessoaRaw = userData.pessoaId ?? userData.pessoa_id;
  const pessoaId = pessoaRaw === null || pessoaRaw === undefined || pessoaRaw === "" ? null : Number(pessoaRaw);

  if (!nome) {
    return { error: "Nome obrigatorio." };
  }
  if (!username) {
    return { error: "Nome de usuario obrigatorio." };
  }
  // No update a senha é opcional (vazia = mantém a atual).
  if ((requirePassword || password) && password.length < 4) {
    return { error: "Senha deve ter pelo menos 4 caracteres." };
  }
  if (!ALLOWED_ROLES.has(cargo)) {
    return { error: "Cargo de usuario invalido." };
  }
  if (perfilId !== null && !Number.isInteger(perfilId)) {
    return { error: "Perfil invalido." };
  }
  if (pessoaId !== null && !Number.isInteger(pessoaId)) {
    return { error: "Vendedor vinculado invalido." };
  }
  if (cargo === "admin" && perfilId !== null) {
    return { error: "Administrador nao usa perfil custom." };
  }

  return { nome, username, password, cargo, perfilId, pessoaId };
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

  return { success: true, user: await buildPublicUser(knex, user) };
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

    const userId = userData?.id ? Number(userData.id) : null;
    const isUpdate = Number.isInteger(userId) && userId > 0;

    const normalized = normalizeUserPayload(userData, { requirePassword: !isUpdate });
    if (normalized.error) {
      return { success: false, error: normalized.error };
    }

    // Valida que o perfil existe (se informado).
    if (normalized.perfilId !== null) {
      const perfil = await knex("perfis_acesso").where("id", normalized.perfilId).first();
      if (!perfil) return { success: false, error: "Perfil nao encontrado." };
    }
    // Valida que a pessoa/vendedor existe (se informado).
    if (normalized.pessoaId !== null) {
      const pessoa = await knex("pessoas").where("id", normalized.pessoaId).first();
      if (!pessoa) return { success: false, error: "Vendedor vinculado nao encontrado." };
    }

    const usernameTratado = normalized.username;

    // --- Edição de usuário existente ---
    if (isUpdate) {
      const current = await knex("usuarios").where("id", userId).first();
      if (!current) return { success: false, error: "Usuario nao encontrado." };

      const dup = await knex("usuarios")
        .whereRaw("LOWER(username) = LOWER(?)", [usernameTratado])
        .whereNot("id", userId)
        .first();
      if (dup) return { success: false, error: "Este nome de usuario ja esta em uso. Escolha outro." };

      const patch = {
        nome: normalized.nome,
        username: usernameTratado,
        cargo: normalized.cargo,
        perfil_id: normalized.perfilId,
        pessoa_id: normalized.pessoaId,
      };
      if (normalized.password) {
        const { salt, hash } = hashPassword(normalized.password);
        patch.password_hash = hash;
        patch.salt = salt;
      }
      await knex("usuarios").where("id", userId).update(patch);
      return { success: true, id: userId };
    }

    const { salt, hash } = hashPassword(normalized.password);

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
          perfil_id: normalized.perfilId,
          pessoa_id: normalized.pessoaId,
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
        perfil_id: normalized.perfilId,
        pessoa_id: normalized.pessoaId,
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

    const rows = await knex("usuarios as u")
      .leftJoin("perfis_acesso as p", "u.perfil_id", "p.id")
      .where(function () {
        this.where("u.ativo", 1).orWhere("u.ativo", true);
      })
      .select(
        "u.id",
        "u.nome",
        "u.username",
        "u.cargo",
        "u.perfil_id",
        "u.permissoes_json",
        "p.nome as perfil_nome",
      );

    return Promise.all(
      rows.map(async (row) => {
        const overrides = parseOverrides(row.permissoes_json);
        const roleTemplate = await loadProfileCaps(knex, row.perfil_id);
        return {
          id: row.id,
          nome: row.nome,
          username: row.username,
          cargo: row.cargo,
          perfilId: row.perfil_id ?? null,
          perfilNome: row.perfil_nome ?? null,
          overrides,
          permissions: computeEffectivePermissions({ cargo: row.cargo, roleTemplate, overrides }),
        };
      }),
    );
  });

  // Salva os overrides de permissão de um usuário (controle de acesso granular).
  // Espelha PUT /users/:id/permissions do backend online.
  safeHandle("save-user-permissions", async (event, payload = {}) => {
    const authError = await requirePerm(event, knex, authSession, "config.users");
    if (authError) return authError;

    const userId = Number(payload.userId);
    if (!Number.isInteger(userId) || userId <= 0) {
      return { success: false, error: "Usuario invalido." };
    }

    const user = await knex("usuarios").where("id", userId).first();
    if (!user) return { success: false, error: "Usuario nao encontrado." };

    // Admin sempre tem acesso total — não faz sentido gravar overrides nele.
    if (String(user.cargo).toLowerCase() === "admin") {
      return { success: false, error: "Administrador tem acesso total." };
    }

    const overrides = sanitizeOverrides(payload.overrides);
    await knex("usuarios")
      .where("id", userId)
      .update({ permissoes_json: JSON.stringify(overrides) });

    return { success: true, overrides };
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

  // ------- Perfis de acesso (custom roles) -------
  safeHandle("get-profiles", async (event) => {
    const authError = await requirePerm(event, knex, authSession, "config.roles");
    if (authError) return authError;

    const rows = await knex("perfis_acesso").select("id", "nome", "permissoes_json").orderBy("nome", "asc");
    return rows.map((p) => {
      let permissoes = [];
      try {
        const arr = JSON.parse(p.permissoes_json || "[]");
        permissoes = Array.isArray(arr) ? arr.filter((c) => CAPABILITY_SET.has(c)) : [];
      } catch {
        permissoes = [];
      }
      return { id: p.id, nome: p.nome, permissoes };
    });
  });

  safeHandle("save-profile", async (event, payload = {}) => {
    const authError = await requirePerm(event, knex, authSession, "config.roles");
    if (authError) return authError;

    const nome = String(payload.nome || "").trim();
    if (!nome) return { success: false, error: "Nome do perfil obrigatorio." };
    const permissoes_json = JSON.stringify(sanitizeCaps(payload.permissoes));

    const existing = await knex("perfis_acesso")
      .whereRaw("LOWER(nome) = LOWER(?)", [nome])
      .modify((q) => {
        if (payload.id) q.whereNot("id", Number(payload.id));
      })
      .first();
    if (existing) return { success: false, error: "Ja existe um perfil com esse nome." };

    if (payload.id) {
      const updated = await knex("perfis_acesso").where("id", Number(payload.id)).update({ nome, permissoes_json });
      if (!updated) return { success: false, error: "Perfil nao encontrado." };
      return { success: true, id: Number(payload.id) };
    }

    const [id] = await knex("perfis_acesso").insert({ nome, permissoes_json });
    return { success: true, id };
  });

  safeHandle("delete-profile", async (event, id) => {
    const authError = await requirePerm(event, knex, authSession, "config.roles");
    if (authError) return authError;

    const inUse = await knex("usuarios")
      .where("perfil_id", id)
      .where(function () {
        this.where("ativo", 1).orWhere("ativo", true);
      })
      .first();
    if (inUse) return { success: false, error: "Perfil em uso por usuarios. Reatribua antes de excluir." };

    const deleted = await knex("perfis_acesso").where("id", id).del();
    if (!deleted) return { success: false, error: "Perfil nao encontrado." };
    return { success: true };
  });
}

module.exports = { register, attemptLogin };
