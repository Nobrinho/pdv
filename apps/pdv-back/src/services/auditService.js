async function logPlatformAction(knex, data = {}) {
  await knex("platform_audit_logs").insert({
    platform_user_id: data.platformUserId || null,
    loja_id: data.lojaId || null,
    acao: data.acao,
    entidade: data.entidade || null,
    entidade_id: data.entidadeId ? String(data.entidadeId) : null,
    metadata_json: data.metadata || {},
    ip: data.ip || null,
    user_agent: data.userAgent || null,
  });
}

module.exports = { logPlatformAction };
