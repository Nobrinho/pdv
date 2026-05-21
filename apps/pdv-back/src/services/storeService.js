const { createStoreAdmin } = require("./authService");

async function createStore(knex, payload = {}) {
  const store = payload.store || {};
  const admin = payload.admin || {};
  const device = payload.device || {};
  const settings = Array.isArray(payload.settings) ? payload.settings : [];

  const nome = String(store.nome || store.lojaNome || "").trim();
  if (!nome) {
    return { success: false, error: "Nome da loja e obrigatorio." };
  }

  return await knex.transaction(async (trx) => {
    const plan = await trx("planos").where("ativo", true).orderBy("id").first();
    const [loja] = await trx("lojas")
      .insert({
        nome,
        documento: store.documento || null,
        telefone: store.telefone || null,
        email: store.email || null,
        cidade: store.cidade || null,
        status: store.status || "trial",
        plano_id: plan?.id || null,
        trial_ends_at: store.trial_ends_at || null,
      })
      .returning(["id", "nome", "status", "plano_id"]);

    await trx("assinaturas").insert({
      loja_id: loja.id,
      plano_id: loja.plano_id,
      status: loja.status,
      valor: plan?.preco_mensal || 0,
    });

    const adminResult = await createStoreAdmin(trx, loja.id, admin);
    if (!adminResult.success) {
      throw new Error(adminResult.error);
    }

    const deviceId = String(device.deviceId || device.device_id || "").trim();
    if (deviceId) {
      await trx("dispositivos").insert({
        loja_id: loja.id,
        nome_maquina: String(device.nomeMaquina || device.nome_maquina || "Dispositivo principal"),
        device_id: deviceId,
        autorizado: true,
        ultimo_acesso_em: trx.fn.now(),
      });
    }

    const configRows = settings
      .filter((item) => item && item.chave)
      .map((item) => ({
        loja_id: loja.id,
        chave: String(item.chave),
        valor: item.valor == null ? "" : String(item.valor),
      }));

    if (!configRows.some((item) => item.chave === "loja_nome")) {
      configRows.push({ loja_id: loja.id, chave: "loja_nome", valor: nome });
    }

    if (configRows.length) {
      await trx("configuracoes").insert(configRows).onConflict(["loja_id", "chave"]).merge();
    }

    return {
      success: true,
      loja,
      admin: adminResult.user,
    };
  });
}

async function listStores(knex) {
  return await knex("lojas")
    .leftJoin("planos", "lojas.plano_id", "planos.id")
    .select(
      "lojas.id",
      "lojas.nome",
      "lojas.documento",
      "lojas.telefone",
      "lojas.email",
      "lojas.cidade",
      "lojas.status",
      "lojas.created_at",
      "lojas.updated_at",
      "planos.nome as plano_nome",
    )
    .orderBy("lojas.id", "desc");
}

async function setStoreStatus(knex, lojaId, status, motivo) {
  const payload = {
    status,
    updated_at: knex.fn.now(),
  };

  if (status === "blocked") {
    payload.bloqueada_em = knex.fn.now();
    payload.bloqueio_motivo = motivo || "Bloqueio administrativo";
  }

  if (status === "active") {
    payload.bloqueada_em = null;
    payload.bloqueio_motivo = null;
  }

  const [loja] = await knex("lojas").where("id", lojaId).update(payload).returning("*");
  if (!loja) {
    return { success: false, error: "Loja nao encontrada." };
  }
  return { success: true, loja };
}

module.exports = { createStore, listStores, setStoreStatus };
