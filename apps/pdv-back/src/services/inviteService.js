// =============================================================
// inviteService.js - Convites/links de acesso da loja.
// Um convite embute a loja: o caixa abre o link e so digita
// usuario e senha. Reutilizavel ate expirar ou ser revogado.
// =============================================================

// Alfabeto sem caracteres ambiguos (0/O, 1/I/L).
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function generateCode(length = 8) {
  let out = "";
  for (let i = 0; i < length; i += 1) {
    out += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return out;
}

async function createInvite(knex, lojaId, userId, payload = {}) {
  let expiraEm = null;
  const dias = Number(payload.expiraEmDias);
  if (Number.isFinite(dias) && dias > 0) {
    const d = new Date();
    d.setDate(d.getDate() + dias);
    expiraEm = d.toISOString();
  }

  // Gera um codigo unico (tenta algumas vezes em caso de colisao).
  let codigo = null;
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const candidate = generateCode();
    const exists = await knex("store_invites").whereRaw("LOWER(codigo) = LOWER(?)", [candidate]).first();
    if (!exists) {
      codigo = candidate;
      break;
    }
  }
  if (!codigo) return { success: false, error: "Nao foi possivel gerar o codigo. Tente novamente." };

  const [row] = await knex("store_invites")
    .insert({
      loja_id: lojaId,
      codigo,
      criado_por_usuario_id: userId || null,
      expira_em: expiraEm,
      ativo: true,
    })
    .returning(["id", "codigo", "expira_em", "created_at"]);

  return { success: true, invite: row };
}

async function listInvites(knex, lojaId) {
  const invites = await knex("store_invites")
    .where({ loja_id: lojaId, ativo: true })
    .select("id", "codigo", "expira_em", "created_at")
    .orderBy("id", "desc");
  return { success: true, invites };
}

async function revokeInvite(knex, lojaId, id) {
  const updated = await knex("store_invites")
    .where({ id, loja_id: lojaId })
    .update({ ativo: false, updated_at: knex.fn.now() });
  if (!updated) return { success: false, error: "Convite nao encontrado." };
  return { success: true };
}

// Publico: resolve um codigo para os dados minimos da loja (nome), para a
// tela de login exibir "Loja X" ao abrir o link.
async function resolveInvite(knex, codigo) {
  const invite = await knex("store_invites")
    .whereRaw("LOWER(codigo) = LOWER(?)", [String(codigo || "").trim()])
    .first();
  if (!invite || !invite.ativo) return { success: false, error: "Convite invalido." };
  if (invite.expira_em && new Date(invite.expira_em) < new Date()) {
    return { success: false, error: "Convite expirado." };
  }
  const loja = await knex("lojas").where("id", invite.loja_id).select("id", "nome", "status").first();
  if (!loja) return { success: false, error: "Loja nao encontrada." };
  if (["blocked", "cancelled", "suspended"].includes(loja.status)) {
    return { success: false, error: "Acesso da loja bloqueado." };
  }
  return { success: true, loja: { id: loja.id, nome: loja.nome } };
}

module.exports = { createInvite, listInvites, revokeInvite, resolveInvite };
