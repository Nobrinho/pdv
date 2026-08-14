// =============================================================
// billingService.js - Planos e assinaturas da plataforma (SaaS).
// Cuida de planos, troca de plano, cancelamento, registro de
// pagamento e da visao geral de faturamento (MRR).
// =============================================================

const ACTIVE_STATUSES = ["active", "trial"];

async function listPlans(knex) {
  const plans = await knex("planos").select("*").orderBy("preco_mensal", "asc");
  return { success: true, plans };
}

async function savePlan(knex, payload = {}) {
  const nome = String(payload.nome || "").trim();
  if (!nome) return { success: false, error: "Nome do plano e obrigatorio." };

  const data = {
    nome,
    preco_mensal: Number(payload.preco_mensal) || 0,
    limite_usuarios: payload.limite_usuarios != null ? Number(payload.limite_usuarios) : 3,
    limite_dispositivos: payload.limite_dispositivos != null ? Number(payload.limite_dispositivos) : 1,
    limite_vendas_mes: payload.limite_vendas_mes != null ? Number(payload.limite_vendas_mes) : null,
    ativo: payload.ativo != null ? !!payload.ativo : true,
  };
  if (payload.recursos_json !== undefined) {
    data.recursos_json =
      typeof payload.recursos_json === "string" ? payload.recursos_json : JSON.stringify(payload.recursos_json);
  }

  if (payload.id) {
    const updated = await knex("planos").where({ id: payload.id }).update({ ...data, updated_at: knex.fn.now() });
    if (!updated) return { success: false, error: "Plano nao encontrado." };
    return { success: true, id: payload.id };
  }

  const [created] = await knex("planos").insert(data).returning(["id"]);
  return { success: true, id: created.id };
}

async function getStoreSubscription(knex, lojaId) {
  return await knex("assinaturas").where({ loja_id: lojaId }).orderBy("id", "desc").first();
}

async function changeStorePlan(knex, lojaId, planoId) {
  return await knex.transaction(async (trx) => {
    const loja = await trx("lojas").where({ id: lojaId }).first();
    if (!loja) return { success: false, error: "Loja nao encontrada." };

    const plano = await trx("planos").where({ id: planoId }).first();
    if (!plano) return { success: false, error: "Plano nao encontrado." };

    // Plano sem cobranca recorrente (Basico gratis, Vitalicio, cortesia): preco 0.
    // Como o dunning so age sobre assinaturas com vencimento != null, zeramos o
    // vencimento e reativamos — assim uma loja nesses planos nunca e bloqueada
    // por cobranca. (Vitalicio: o pagamento unico e registrado a parte.)
    const isFree = Number(plano.preco_mensal) <= 0;

    const lojaUpdate = { plano_id: plano.id, updated_at: trx.fn.now() };
    if (isFree) {
      lojaUpdate.status = "active";
      lojaUpdate.bloqueada_em = null;
      lojaUpdate.bloqueio_motivo = null;
    }
    await trx("lojas").where({ id: lojaId }).update(lojaUpdate);

    const assinatura = await trx("assinaturas").where({ loja_id: lojaId }).orderBy("id", "desc").first();
    if (assinatura) {
      const assinaturaUpdate = {
        plano_id: plano.id,
        valor: plano.preco_mensal,
        updated_at: trx.fn.now(),
      };
      if (isFree) {
        assinaturaUpdate.status = "active";
        assinaturaUpdate.vencimento = null;
        assinaturaUpdate.cancelada_em = null;
      }
      await trx("assinaturas").where({ id: assinatura.id }).update(assinaturaUpdate);
    } else {
      await trx("assinaturas").insert({
        loja_id: lojaId,
        plano_id: plano.id,
        status: isFree ? "active" : loja.status,
        valor: plano.preco_mensal,
        vencimento: isFree ? null : undefined,
      });
    }

    return { success: true, plano: { id: plano.id, nome: plano.nome, preco_mensal: plano.preco_mensal } };
  });
}

async function cancelStoreSubscription(knex, lojaId, motivo) {
  return await knex.transaction(async (trx) => {
    const loja = await trx("lojas").where({ id: lojaId }).first();
    if (!loja) return { success: false, error: "Loja nao encontrada." };

    await trx("lojas").where({ id: lojaId }).update({
      status: "cancelled",
      bloqueio_motivo: motivo || "Assinatura cancelada",
      updated_at: trx.fn.now(),
    });

    await trx("assinaturas").where({ loja_id: lojaId }).update({
      status: "cancelled",
      cancelada_em: trx.fn.now(),
      updated_at: trx.fn.now(),
    });

    return { success: true };
  });
}

// Registra um pagamento: avanca o vencimento, marca ultimo pagamento e
// reativa a loja/assinatura (util para sair de past_due/blocked por cobranca).
async function registerPayment(knex, lojaId, payload = {}) {
  const meses = Number(payload.meses) > 0 ? Number(payload.meses) : 1;

  return await knex.transaction(async (trx) => {
    const assinatura = await trx("assinaturas").where({ loja_id: lojaId }).orderBy("id", "desc").first();
    if (!assinatura) return { success: false, error: "Assinatura nao encontrada." };

    const base = assinatura.vencimento && new Date(assinatura.vencimento) > new Date()
      ? new Date(assinatura.vencimento)
      : new Date();
    base.setMonth(base.getMonth() + meses);
    const novoVencimento = base.toISOString().slice(0, 10);

    const valor = payload.valor != null ? Number(payload.valor) : assinatura.valor;

    await trx("assinaturas").where({ id: assinatura.id }).update({
      status: "active",
      valor,
      vencimento: novoVencimento,
      ultimo_pagamento_em: trx.fn.now(),
      cancelada_em: null,
      updated_at: trx.fn.now(),
    });

    // Um pagamento ativa a loja (sai de trial/past_due/blocked).
    await trx("lojas").where({ id: lojaId }).update({
      status: "active",
      bloqueada_em: null,
      bloqueio_motivo: null,
      updated_at: trx.fn.now(),
    });

    return { success: true, vencimento: novoVencimento, valor };
  });
}

// Rotina de cobranca (dunning): marca assinaturas vencidas como past_due e,
// apos o periodo de carencia, bloqueia a loja. Idempotente: pode rodar todo dia.
async function runDunning(knex, options = {}) {
  const graceDays = Number(options.graceDays ?? process.env.BILLING_GRACE_DAYS ?? 5);
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const cutoff = new Date(today);
  cutoff.setDate(cutoff.getDate() - graceDays);
  const cutoffStr = cutoff.toISOString().slice(0, 10);

  return await knex.transaction(async (trx) => {
    // Passo 1: assinatura ativa cujo vencimento passou -> past_due (loja continua funcionando).
    const vencidas = await trx("assinaturas")
      .where("status", "active")
      .whereNotNull("vencimento")
      .where("vencimento", "<", todayStr)
      .select("id", "loja_id");

    if (vencidas.length) {
      await trx("assinaturas")
        .whereIn("id", vencidas.map((a) => a.id))
        .update({ status: "past_due", updated_at: trx.fn.now() });
      await trx("lojas")
        .whereIn("id", vencidas.map((a) => a.loja_id))
        .whereIn("status", ["active", "trial"])
        .update({ status: "past_due", updated_at: trx.fn.now() });
    }

    // Passo 2: past_due alem da carencia -> bloqueia a loja (perde acesso).
    const paraBloquear = await trx("assinaturas")
      .where("status", "past_due")
      .whereNotNull("vencimento")
      .where("vencimento", "<", cutoffStr)
      .select("loja_id");

    if (paraBloquear.length) {
      await trx("lojas")
        .whereIn("id", paraBloquear.map((a) => a.loja_id))
        .whereNot("status", "cancelled")
        .update({
          status: "blocked",
          bloqueada_em: trx.fn.now(),
          bloqueio_motivo: "Assinatura vencida",
          updated_at: trx.fn.now(),
        });
    }

    return {
      success: true,
      graceDays,
      marcadas_vencidas: vencidas.length,
      bloqueadas: paraBloquear.length,
      executado_em: new Date().toISOString(),
    };
  });
}

async function getBillingOverview(knex) {
  const rows = await knex("lojas")
    .leftJoin("planos", "lojas.plano_id", "planos.id")
    .leftJoin(
      knex("assinaturas")
        .select("loja_id")
        .max("id as assinatura_id")
        .groupBy("loja_id")
        .as("ult"),
      "ult.loja_id",
      "lojas.id",
    )
    .leftJoin("assinaturas", "assinaturas.id", "ult.assinatura_id")
    .select(
      "lojas.id as loja_id",
      "lojas.nome as loja_nome",
      "lojas.status as loja_status",
      "planos.nome as plano_nome",
      "planos.preco_mensal",
      "assinaturas.status as assinatura_status",
      "assinaturas.valor",
      "assinaturas.vencimento",
      "assinaturas.ultimo_pagamento_em",
    )
    .orderBy("lojas.id", "asc");

  const hoje = new Date();
  const isPaying = (r) => r.assinatura_status === "active";
  const mrr = rows
    .filter(isPaying)
    .reduce((sum, r) => sum + Number(r.preco_mensal || r.valor || 0), 0);

  const porPlano = {};
  const porStatus = {};
  let vencidas = 0;
  for (const r of rows) {
    const plano = r.plano_nome || "Sem plano";
    if (!porPlano[plano]) porPlano[plano] = { plano, lojas: 0, receita: 0 };
    porPlano[plano].lojas += 1;
    if (isPaying(r)) porPlano[plano].receita += Number(r.preco_mensal || r.valor || 0);

    const st = r.assinatura_status || r.loja_status || "indefinido";
    porStatus[st] = (porStatus[st] || 0) + 1;

    if (r.vencimento && new Date(r.vencimento) < hoje && r.assinatura_status !== "cancelled") {
      vencidas += 1;
    }
  }

  return {
    success: true,
    billing: {
      mrr: Number(mrr.toFixed(2)),
      arr: Number((mrr * 12).toFixed(2)),
      total_lojas: rows.length,
      assinaturas_vencidas: vencidas,
      por_plano: Object.values(porPlano),
      por_status: porStatus,
      assinaturas: rows,
    },
  };
}

module.exports = {
  listPlans,
  savePlan,
  getStoreSubscription,
  changeStorePlan,
  cancelStoreSubscription,
  registerPayment,
  runDunning,
  getBillingOverview,
};
