const { hashPassword, verifyPassword } = require("../security/password");
const { createToken } = require("../security/token");
const {
  computeEffectivePermissions,
  ALL_CAPABILITIES,
} = require("../../../../packages/shared/domain/permissions");

const CAPABILITY_SET = new Set(ALL_CAPABILITIES);

// Lê a coluna usuarios.permissoes_json (jsonb ou string) como {grants,denies}.
function parseOverrides(raw) {
  try {
    const obj = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!obj || typeof obj !== "object") return {};
    return {
      grants: Array.isArray(obj.grants) ? obj.grants : [],
      denies: Array.isArray(obj.denies) ? obj.denies : [],
    };
  } catch {
    return {};
  }
}

function userPermissions(user) {
  return computeEffectivePermissions({
    cargo: user.cargo,
    overrides: parseOverrides(user.permissoes_json),
  });
}

function publicStoreUser(user) {
  return {
    id: user.id,
    lojaId: user.loja_id,
    nome: user.nome,
    username: user.username,
    cargo: user.cargo,
    permissions: userPermissions(user),
  };
}

// Permissões efetivas a partir do `auth` do token (para enforcement no backend).
// Sempre lê do banco → nunca fica "velho" após uma edição de permissões.
async function getEffectivePermissions(knex, auth) {
  if (String(auth?.cargo || "").toLowerCase() === "admin") {
    return computeEffectivePermissions({ cargo: "admin" });
  }
  const user = await knex("usuarios").where({ id: auth.userId, loja_id: auth.lojaId }).first();
  if (!user || !user.ativo) return [];
  return userPermissions(user);
}

// Salva os overrides de permissão de um usuário (config.users).
async function saveUserPermissions(knex, lojaId, userId, overrides = {}) {
  const user = await knex("usuarios").where({ id: userId, loja_id: lojaId }).first();
  if (!user || !user.ativo) return { success: false, error: "Usuario nao encontrado." };

  // Só aceita capabilities conhecidas (ignora lixo).
  const clean = {
    grants: (Array.isArray(overrides.grants) ? overrides.grants : []).filter((c) => CAPABILITY_SET.has(c)),
    denies: (Array.isArray(overrides.denies) ? overrides.denies : []).filter((c) => CAPABILITY_SET.has(c)),
  };

  await knex("usuarios").where({ id: userId, loja_id: lojaId }).update({
    permissoes_json: JSON.stringify(clean),
    updated_at: knex.fn.now(),
  });

  const updated = await knex("usuarios").where({ id: userId, loja_id: lojaId }).first();
  return { success: true, id: userId, permissions: userPermissions(updated), overrides: clean };
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

async function registerDevice(knex, lojaId, device = {}, plan = null) {
  const deviceId = String(device.deviceId || device.device_id || "").trim();
  if (!deviceId) return { success: true, device: null };

  const nomeMaquina = String(device.nomeMaquina || device.nome_maquina || "Dispositivo").trim() || "Dispositivo";

  const existing = await knex("dispositivos").where({ loja_id: lojaId, device_id: deviceId }).first();
  if (existing) {
    if (!existing.autorizado) {
      return { success: false, error: "Dispositivo bloqueado para esta loja. Contate o administrador." };
    }
    await knex("dispositivos")
      .where({ id: existing.id })
      .update({ nome_maquina: nomeMaquina, ultimo_acesso_em: knex.fn.now(), updated_at: knex.fn.now() });
    return { success: true, device: { id: existing.id, deviceId, novo: false } };
  }

  const limite = Number(plan?.limite_dispositivos ?? 0);
  if (limite > 0) {
    const count = await knex("dispositivos")
      .where({ loja_id: lojaId, autorizado: true })
      .count("id as total")
      .first();
    if (Number(count?.total || 0) >= limite) {
      return {
        success: false,
        error: `Limite de dispositivos do plano atingido (${limite}). Remova um dispositivo no painel para liberar.`,
      };
    }
  }

  const [created] = await knex("dispositivos")
    .insert({
      loja_id: lojaId,
      nome_maquina: nomeMaquina,
      device_id: deviceId,
      autorizado: true,
      ultimo_acesso_em: knex.fn.now(),
    })
    .returning(["id"]);

  return { success: true, device: { id: created.id, deviceId, novo: true } };
}

async function joinStore(knex, payload = {}) {
  const username = String(payload.username || "").trim();
  const password = String(payload.password || "");
  const codigo = String(payload.codigo || payload.invite || "").trim();
  let lojaId = Number(payload.lojaId || payload.loja_id) || null;

  if (!username || !password) {
    return { success: false, error: "Usuario e senha sao obrigatorios." };
  }

  let invite = null;
  if (codigo) {
    invite = await knex("store_invites").whereRaw("LOWER(codigo) = LOWER(?)", [codigo]).first();
    if (!invite || !invite.ativo || invite.usado_em) {
      return { success: false, error: "Convite invalido ou ja utilizado." };
    }
    if (invite.expira_em && new Date(invite.expira_em) < new Date()) {
      return { success: false, error: "Convite expirado." };
    }
    lojaId = invite.loja_id;
  }

  if (!lojaId) {
    return { success: false, error: "Informe o codigo da loja ou um convite valido." };
  }

  const loja = await knex("lojas").where("id", lojaId).first();
  if (!loja) return { success: false, error: "Loja nao encontrada." };
  if (["blocked", "cancelled", "suspended"].includes(loja.status)) {
    return { success: false, error: "Acesso da loja bloqueado." };
  }

  const user = await knex("usuarios")
    .where("loja_id", lojaId)
    .whereRaw("LOWER(username) = LOWER(?)", [username])
    .first();
  if (!user || !user.ativo) return { success: false, error: "Usuario invalido ou inativo." };
  if (!verifyPassword(password, user.salt, user.password_hash)) {
    return { success: false, error: "Senha incorreta." };
  }

  const plan = loja.plano_id ? await knex("planos").where("id", loja.plano_id).first() : null;
  const deviceResult = await registerDevice(knex, lojaId, payload.device || {}, plan);
  if (!deviceResult.success) return { success: false, error: deviceResult.error };

  // Convite e um link de acesso reutilizavel (nao consome ao entrar).

  return {
    success: true,
    user: publicStoreUser(user),
    loja: { id: loja.id, nome: loja.nome, status: loja.status },
    device: deviceResult.device,
    token: createToken({ type: "store", lojaId: loja.id, userId: user.id, cargo: user.cargo }),
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
  const rows = await knex("usuarios")
    .where({ loja_id: lojaId, ativo: true })
    .select("id", "nome", "username", "cargo", "permissoes_json")
    .orderBy("nome", "asc");
  return rows.map((u) => ({
    id: u.id,
    nome: u.nome,
    username: u.username,
    cargo: u.cargo,
    overrides: parseOverrides(u.permissoes_json),
    permissions: userPermissions(u),
  }));
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

function generatePassword(length = 8) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  let out = "";
  for (let i = 0; i < length; i += 1) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}

// Reset de senha de um usuario de loja, acionado pelo admin da plataforma.
async function resetStoreUserPassword(knex, lojaId, userId, newPassword) {
  const user = await knex("usuarios").where({ id: userId, loja_id: lojaId }).first();
  if (!user) return { success: false, error: "Usuario nao encontrado." };

  const senha = newPassword && String(newPassword).length >= 4 ? String(newPassword) : generatePassword();
  const { salt, hash } = hashPassword(senha);
  await knex("usuarios").where({ id: userId, loja_id: lojaId }).update({
    salt,
    password_hash: hash,
    updated_at: knex.fn.now(),
  });

  return { success: true, password: senha, generated: !newPassword };
}

// Ativa/desativa um usuario de loja pelo admin da plataforma.
async function setStoreUserActive(knex, lojaId, userId, ativo) {
  const user = await knex("usuarios").where({ id: userId, loja_id: lojaId }).first();
  if (!user) return { success: false, error: "Usuario nao encontrado." };

  if (!ativo && user.cargo === "admin" && user.ativo) {
    const activeAdmins = await knex("usuarios")
      .where({ loja_id: lojaId, cargo: "admin", ativo: true })
      .count("id as total")
      .first();
    if (Number(activeAdmins?.total || 0) <= 1) {
      return { success: false, error: "Nao e permitido desativar o ultimo administrador da loja." };
    }
  }

  await knex("usuarios").where({ id: userId, loja_id: lojaId }).update({
    ativo: !!ativo,
    updated_at: knex.fn.now(),
  });
  return { success: true, ativo: !!ativo };
}

module.exports = {
  loginPlatform,
  loginStore,
  joinStore,
  resetStoreUserPassword,
  setStoreUserActive,
  registerDevice,
  createStoreAdmin,
  listStoreUsers,
  saveStoreUser,
  deleteStoreUser,
  getEffectivePermissions,
  saveUserPermissions,
};
