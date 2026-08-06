const { createStoreAdmin } = require("./authService");
const { getExpensesByStore } = require("./expenseService");

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
  const stores = await knex("lojas")
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

  const expensesByStore = await getExpensesByStore(knex);

  const metrics = await Promise.all(
    stores.map(async (store) => {
      const [sales, users, products] = await Promise.all([
        knex("vendas")
          .where({ loja_id: store.id, cancelada: false })
          .sum("total_final as faturamento")
          .count("id as total_vendas")
          .first(),
        knex("usuarios").where({ loja_id: store.id, ativo: true }).count("id as total_usuarios").first(),
        knex("produtos").where({ loja_id: store.id, ativo: true }).count("id as total_produtos").first(),
      ]);

      const faturamento = Number(sales?.faturamento || 0);
      const despesas = Number(expensesByStore[store.id] || 0);

      return {
        ...store,
        faturamento,
        total_vendas: Number(sales?.total_vendas || 0),
        total_usuarios: Number(users?.total_usuarios || 0),
        total_produtos: Number(products?.total_produtos || 0),
        despesas,
        resultado_liquido: Number((faturamento - despesas).toFixed(2)),
      };
    }),
  );

  return metrics;
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

async function getPlatformDashboard(knex) {
  const stores = await knex("lojas").select("id", "status");
  const blockedStatuses = ["blocked", "cancelled", "suspended"];

  const salesAgg = await knex("vendas")
    .where({ cancelada: false })
    .sum("total_final as faturamento")
    .count("id as total_vendas")
    .first();

  const monthAgg = await knex("vendas")
    .where({ cancelada: false })
    .andWhere("data_venda", ">=", knex.raw("date_trunc('month', now())"))
    .sum("total_final as faturamento_mes")
    .first()
    .catch(() => ({ faturamento_mes: 0 }));

  const devices = await knex("dispositivos").count("id as total").first();

  return {
    total_lojas: stores.length,
    lojas_ativas: stores.filter((s) => !blockedStatuses.includes(s.status)).length,
    lojas_bloqueadas: stores.filter((s) => blockedStatuses.includes(s.status)).length,
    faturamento_total: Number(salesAgg?.faturamento || 0),
    total_vendas: Number(salesAgg?.total_vendas || 0),
    faturamento_mes: Number(monthAgg?.faturamento_mes || 0),
    total_dispositivos: Number(devices?.total || 0),
  };
}

async function listStoreUsersForPlatform(knex, lojaId) {
  return await knex("usuarios")
    .where({ loja_id: lojaId })
    .select("id", "nome", "username", "cargo", "ativo", "created_at")
    .orderBy("nome", "asc");
}

async function listStoreDevices(knex, lojaId) {
  return await knex("dispositivos")
    .where({ loja_id: lojaId })
    .select("id", "nome_maquina", "device_id", "autorizado", "ultimo_acesso_em", "created_at")
    .orderBy("ultimo_acesso_em", "desc");
}

async function setDeviceAuthorization(knex, lojaId, deviceId, autorizado) {
  const [device] = await knex("dispositivos")
    .where({ id: deviceId, loja_id: lojaId })
    .update({ autorizado: !!autorizado, updated_at: knex.fn.now() })
    .returning(["id", "device_id", "autorizado"]);
  if (!device) return { success: false, error: "Dispositivo nao encontrado." };
  return { success: true, device };
}

async function deleteStoreDevice(knex, lojaId, deviceId) {
  const removed = await knex("dispositivos").where({ id: deviceId, loja_id: lojaId }).del();
  if (!removed) return { success: false, error: "Dispositivo nao encontrado." };
  return { success: true };
}

module.exports = {
  createStore,
  listStores,
  setStoreStatus,
  getPlatformDashboard,
  listStoreUsersForPlatform,
  listStoreDevices,
  setDeviceAuthorization,
  deleteStoreDevice,
};
