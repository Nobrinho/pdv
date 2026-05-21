const { hashPassword, verifyPassword } = require("../security/password");
const { createToken } = require("../security/token");

function publicStoreUser(user) {
  return {
    id: user.id,
    lojaId: user.loja_id,
    nome: user.nome,
    username: user.username,
    cargo: user.cargo,
  };
}

const ALLOWED_STORE_ROLES = new Set(["admin", "gerente", "vendedor", "caixa"]);

function publicPlatformUser(user) {
  return {
    id: user.id,
    nome: user.nome,
    email: user.email,
    role: user.role,
  };
}

async function loginPlatform(knex, credentials = {}) {
  const email = String(credentials.email || "").trim();
  const password = String(credentials.password || "");

  const user = await knex("platform_users").whereRaw("LOWER(email) = LOWER(?)", [email]).first();
  if (!user || !user.ativo) {
    return { success: false, error: "Usuario invalido ou inativo." };
  }

  if (!verifyPassword(password, user.salt, user.password_hash)) {
    return { success: false, error: "Senha incorreta." };
  }

  const publicUser = publicPlatformUser(user);
  return {
    success: true,
    user: publicUser,
    token: createToken({ type: "platform", userId: user.id, role: user.role }),
  };
}

async function loginStore(knex, credentials = {}) {
  const username = String(credentials.username || "").trim();
  const password = String(credentials.password || "");
  const lojaId = Number(credentials.lojaId || credentials.loja_id);

  if (!lojaId || !username || !password) {
    return { success: false, error: "Loja, usuario e senha sao obrigatorios." };
  }

  const loja = await knex("lojas").where("id", lojaId).first();
  if (!loja) {
    return { success: false, error: "Loja nao encontrada." };
  }
  if (["blocked", "cancelled", "suspended"].includes(loja.status)) {
    return { success: false, error: "Acesso da loja bloqueado." };
  }

  const user = await knex("usuarios")
    .where("loja_id", lojaId)
    .whereRaw("LOWER(username) = LOWER(?)", [username])
    .first();

  if (!user || !user.ativo) {
    return { success: false, error: "Usuario invalido ou inativo." };
  }

  if (!verifyPassword(password, user.salt, user.password_hash)) {
    return { success: false, error: "Senha incorreta." };
  }

  const publicUser = publicStoreUser(user);
  return {
    success: true,
    user: publicUser,
    loja: {
      id: loja.id,
      nome: loja.nome,
      status: loja.status,
    },
    token: createToken({
      type: "store",
      lojaId: loja.id,
      userId: user.id,
      cargo: user.cargo,
    }),
  };
}

async function createStoreAdmin(knex, lojaId, admin = {}) {
  const nome = String(admin.nome || "").trim();
  const username = String(admin.username || "").trim();
  const password = String(admin.password || "");

  if (!nome || !username || password.length < 4) {
    return { success: false, error: "Administrador exige nome, usuario e senha com 4+ caracteres." };
  }

  const { salt, hash } = hashPassword(password);
  const [user] = await knex("usuarios")
    .insert({
      loja_id: lojaId,
      nome,
      username,
      password_hash: hash,
      salt,
      cargo: "admin",
      ativo: true,
    })
    .returning(["id", "loja_id", "nome", "username", "cargo"]);

  return { success: true, user: publicStoreUser(user) };
}

function normalizeStoreUserPayload(user = {}, { requirePassword = true } = {}) {
  const nome = String(user.nome || "").trim();
  const username = String(user.username || "").trim();
  const password = String(user.password || "");
  const cargo = String(user.cargo || "vendedor").trim().toLowerCase();

  if (!nome) return { error: "Nome obrigatorio." };
  if (!username) return { error: "Nome de usuario obrigatorio." };
  if (requirePassword && password.length < 4) return { error: "Senha deve ter pelo menos 4 caracteres." };
  if (!ALLOWED_STORE_ROLES.has(cargo)) return { error: "Cargo de usuario invalido." };

  return { value: { nome, username, password, cargo } };
}

async function listStoreUsers(knex, lojaId) {
  return await knex("usuarios")
    .where({ loja_id: lojaId, ativo: true })
    .select("id", "nome", "username", "cargo")
    .orderBy("nome", "asc");
}

async function saveStoreUser(knex, lojaId, user = {}) {
  const normalized = normalizeStoreUserPayload(user, { requirePassword: !user.id });
  if (normalized.error) return { success: false, error: normalized.error };

  const { nome, username, password, cargo } = normalized.value;
  const existing = await knex("usuarios")
    .where("loja_id", lojaId)
    .whereRaw("LOWER(username) = LOWER(?)", [username])
    .modify((query) => {
      if (user.id) query.whereNot("id", user.id);
    })
    .first();

  if (existing) return { success: false, error: "Este nome de usuario ja esta em uso. Escolha outro." };

  if (user.id) {
    const payload = { nome, username, cargo, updated_at: knex.fn.now() };
    if (password) {
      const { salt, hash } = hashPassword(password);
      payload.salt = salt;
      payload.password_hash = hash;
    }
    const updated = await knex("usuarios").where({ id: user.id, loja_id: lojaId }).update(payload);
    if (!updated) return { success: false, error: "Usuario nao encontrado." };
    return { success: true, id: user.id };
  }

  const { salt, hash } = hashPassword(password);
  const [created] = await knex("usuarios")
    .insert({
      loja_id: lojaId,
      nome,
      username,
      password_hash: hash,
      salt,
      cargo,
      ativo: true,
    })
    .returning(["id"]);

  return { success: true, id: created.id };
}

async function deleteStoreUser(knex, lojaId, userId) {
  const user = await knex("usuarios").where({ id: userId, loja_id: lojaId }).first();
  if (!user || !user.ativo) return { success: false, error: "Usuario nao encontrado." };

  if (user.cargo === "admin") {
    const activeAdmins = await knex("usuarios")
      .where({ loja_id: lojaId, cargo: "admin", ativo: true })
      .count("id as total")
      .first();
    if (Number(activeAdmins?.total || 0) <= 1) {
      return { success: false, error: "Nao e permitido excluir o ultimo administrador." };
    }
  }

  await knex("usuarios").where({ id: userId, loja_id: lojaId }).update({
    ativo: false,
    updated_at: knex.fn.now(),
  });
  return { success: true };
}

module.exports = {
  loginPlatform,
  loginStore,
  createStoreAdmin,
  listStoreUsers,
  saveStoreUser,
  deleteStoreUser,
};
