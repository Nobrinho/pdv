const { hashPassword, verifyPassword } = require("../security/password");
const { createToken } = require("../security/token");
const {
  computeEffectivePermissions,
  hasCapability,
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

// Lê perfis_acesso.permissoes_json (jsonb ou string) como array de capabilities.
function parseProfileCaps(raw) {
  try {
    const arr = typeof raw === "string" ? JSON.parse(raw) : raw;
    return Array.isArray(arr) ? arr.filter((c) => CAPABILITY_SET.has(c)) : null;
  } catch {
    return null;
  }
}

// Conjunto-base de capabilities do perfil atribuído ao usuário (ou null → cai no
// preset do cargo). Carrega do banco para refletir edições de perfil na hora.
async function loadProfileCaps(knex, lojaId, perfilId) {
  if (!perfilId) return null;
  const perfil = await knex("perfis_acesso").where({ id: perfilId, loja_id: lojaId }).first();
  return perfil ? parseProfileCaps(perfil.permissoes_json) : null;
}

// Permissões efetivas: base(perfil | preset do cargo) ∪ grants − denies.
function computeUserPermissions(user, roleTemplate) {
  return computeEffectivePermissions({
    cargo: user.cargo,
    roleTemplate,
    overrides: parseOverrides(user.permissoes_json),
  });
}

// Versão que resolve o perfil no banco (admin → tudo, sem consultar).
async function resolveUserPermissions(knex, user) {
  if (String(user?.cargo || "").toLowerCase() === "admin") {
    return computeEffectivePermissions({ cargo: "admin" });
  }
  const template = await loadProfileCaps(knex, user.loja_id, user.perfil_id);
  return computeUserPermissions(user, template);
}

async function publicStoreUser(knex, user) {
  return {
    id: user.id,
    lojaId: user.loja_id,
    nome: user.nome,
    username: user.username,
    cargo: user.cargo,
    perfilId: user.perfil_id ?? null,
    pessoaId: user.pessoa_id ?? null,
    permissions: await resolveUserPermissions(knex, user),
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
  return resolveUserPermissions(knex, user);
}

// Escopo de visibilidade de dados do usuário do token.
//   { all: true }               → vê tudo (admin ou data.view_all)
//   { all: false, pessoaId }    → vê só os próprios (pessoa vinculada; null se sem vínculo)
async function getDataScope(knex, auth) {
  const eff = await getEffectivePermissions(knex, auth);
  if (hasCapability(eff, "data.view_all")) return { all: true, pessoaId: null };
  const user = await knex("usuarios").where({ id: auth.userId, loja_id: auth.lojaId }).first();
  return { all: false, pessoaId: user?.pessoa_id ?? null };
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
  return {
    success: true,
    id: userId,
    permissions: await resolveUserPermissions(knex, updated),
    overrides: clean,
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

  const publicUser = await publicStoreUser(knex, user);
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
    user: await publicStoreUser(knex, user),
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

  return { success: true, user: await publicStoreUser(knex, user) };
}

function normalizeStoreUserPayload(user = {}, { requirePassword = true } = {}) {
  const nome = String(user.nome || "").trim();
  const username = String(user.username || "").trim();
  const password = String(user.password || "");
  const cargo = String(user.cargo || "vendedor").trim().toLowerCase();
  // Perfil custom é opcional; quando presente, ele fornece a base de permissões.
  const perfilRaw = user.perfilId ?? user.perfil_id;
  const perfilId = perfilRaw === null || perfilRaw === undefined || perfilRaw === "" ? null : Number(perfilRaw);
  // Vínculo com a pessoa/vendedor (para escopo "próprios dados").
  const pessoaRaw = user.pessoaId ?? user.pessoa_id;
  const pessoaId = pessoaRaw === null || pessoaRaw === undefined || pessoaRaw === "" ? null : Number(pessoaRaw);

  if (!nome) return { error: "Nome obrigatorio." };
  if (!username) return { error: "Nome de usuario obrigatorio." };
  if (requirePassword && password.length < 4) return { error: "Senha deve ter pelo menos 4 caracteres." };
  if (!ALLOWED_STORE_ROLES.has(cargo)) return { error: "Cargo de usuario invalido." };
  if (perfilId !== null && !Number.isInteger(perfilId)) return { error: "Perfil invalido." };
  if (pessoaId !== null && !Number.isInteger(pessoaId)) return { error: "Vendedor vinculado invalido." };
  // Admin nunca usa perfil custom (tem acesso total por definição).
  if (cargo === "admin" && perfilId !== null) return { error: "Administrador nao usa perfil custom." };

  return { value: { nome, username, password, cargo, perfilId, pessoaId } };
}

async function listStoreUsers(knex, lojaId) {
  const rows = await knex("usuarios as u")
    .leftJoin("perfis_acesso as p", function () {
      this.on("u.perfil_id", "=", "p.id").andOn("p.loja_id", "=", "u.loja_id");
    })
    .leftJoin("pessoas as ps", function () {
      this.on("u.pessoa_id", "=", "ps.id").andOn("ps.loja_id", "=", "u.loja_id");
    })
    .where({ "u.loja_id": lojaId, "u.ativo": true })
    .select(
      "u.id",
      "u.nome",
      "u.username",
      "u.cargo",
      "u.perfil_id",
      "u.pessoa_id",
      "u.permissoes_json",
      "p.nome as perfil_nome",
      "ps.nome as pessoa_nome",
    )
    .orderBy("u.nome", "asc");
  return Promise.all(
    rows.map(async (u) => ({
      id: u.id,
      nome: u.nome,
      username: u.username,
      cargo: u.cargo,
      perfilId: u.perfil_id ?? null,
      perfilNome: u.perfil_nome ?? null,
      pessoaId: u.pessoa_id ?? null,
      pessoaNome: u.pessoa_nome ?? null,
      overrides: parseOverrides(u.permissoes_json),
      permissions: await resolveUserPermissions(knex, u),
    })),
  );
}

async function saveStoreUser(knex, lojaId, user = {}) {
  const normalized = normalizeStoreUserPayload(user, { requirePassword: !user.id });
  if (normalized.error) return { success: false, error: normalized.error };

  const { nome, username, password, cargo, perfilId, pessoaId } = normalized.value;
  const existing = await knex("usuarios")
    .where("loja_id", lojaId)
    .whereRaw("LOWER(username) = LOWER(?)", [username])
    .modify((query) => {
      if (user.id) query.whereNot("id", user.id);
    })
    .first();

  if (existing) return { success: false, error: "Este nome de usuario ja esta em uso. Escolha outro." };

  // Valida que o perfil pertence à loja.
  if (perfilId !== null) {
    const perfil = await knex("perfis_acesso").where({ id: perfilId, loja_id: lojaId }).first();
    if (!perfil) return { success: false, error: "Perfil nao encontrado." };
  }
  // Valida que a pessoa/vendedor pertence à loja.
  if (pessoaId !== null) {
    const pessoa = await knex("pessoas").where({ id: pessoaId, loja_id: lojaId }).first();
    if (!pessoa) return { success: false, error: "Vendedor vinculado nao encontrado." };
  }

  if (user.id) {
    const payload = { nome, username, cargo, perfil_id: perfilId, pessoa_id: pessoaId, updated_at: knex.fn.now() };
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
      perfil_id: perfilId,
      pessoa_id: pessoaId,
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

// ------- Perfis de acesso (custom roles) -------

async function listProfiles(knex, lojaId) {
  const rows = await knex("perfis_acesso")
    .where("loja_id", lojaId)
    .select("id", "nome", "permissoes_json")
    .orderBy("nome", "asc");
  return rows.map((p) => ({
    id: p.id,
    nome: p.nome,
    permissoes: parseProfileCaps(p.permissoes_json) || [],
  }));
}

async function saveProfile(knex, lojaId, payload = {}) {
  const nome = String(payload.nome || "").trim();
  if (!nome) return { success: false, error: "Nome do perfil obrigatorio." };

  const caps = (Array.isArray(payload.permissoes) ? payload.permissoes : []).filter((c) => CAPABILITY_SET.has(c));
  const permissoes_json = JSON.stringify(caps);

  const existing = await knex("perfis_acesso")
    .where("loja_id", lojaId)
    .whereRaw("LOWER(nome) = LOWER(?)", [nome])
    .modify((q) => {
      if (payload.id) q.whereNot("id", payload.id);
    })
    .first();
  if (existing) return { success: false, error: "Ja existe um perfil com esse nome." };

  if (payload.id) {
    const updated = await knex("perfis_acesso")
      .where({ id: Number(payload.id), loja_id: lojaId })
      .update({ nome, permissoes_json, updated_at: knex.fn.now() });
    if (!updated) return { success: false, error: "Perfil nao encontrado." };
    return { success: true, id: Number(payload.id) };
  }

  const [created] = await knex("perfis_acesso")
    .insert({ loja_id: lojaId, nome, permissoes_json })
    .returning(["id"]);
  return { success: true, id: created.id };
}

async function deleteProfile(knex, lojaId, id) {
  const inUse = await knex("usuarios").where({ loja_id: lojaId, perfil_id: id, ativo: true }).first();
  if (inUse) return { success: false, error: "Perfil em uso por usuarios. Reatribua antes de excluir." };

  const deleted = await knex("perfis_acesso").where({ id, loja_id: lojaId }).del();
  if (!deleted) return { success: false, error: "Perfil nao encontrado." };
  return { success: true };
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
  getDataScope,
  saveUserPermissions,
  listProfiles,
  saveProfile,
  deleteProfile,
};
