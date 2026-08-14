const { normalizeDateFilter } = require("./dateFilters");
const { logStoreEvent } = require("./eventLogService");

async function listServices(knex, lojaId, filters = {}) {
  const page = filters.page ? parseInt(filters.page, 10) : null;
  const limit = filters.limit ? Math.min(parseInt(filters.limit, 10), 500) : null;
  const hasPagination = Number.isInteger(page) && Number.isInteger(limit) && page > 0 && limit > 0;
  const startDate = normalizeDateFilter(filters.startDate, "start");
  const endDate = normalizeDateFilter(filters.endDate, "end");

  const query = knex("servicos_avulsos")
    .leftJoin("pessoas", function () {
      this.on("servicos_avulsos.trocador_id", "=", "pessoas.id").andOn(
        "servicos_avulsos.loja_id",
        "=",
        "pessoas.loja_id",
      );
    })
    .where("servicos_avulsos.loja_id", lojaId)
    .select("servicos_avulsos.*", "pessoas.nome as trocador_nome")
    .orderBy("servicos_avulsos.data_servico", "desc");

  const countQuery = knex("servicos_avulsos").where("loja_id", lojaId);

  if (startDate) {
    query.where("servicos_avulsos.data_servico", ">=", startDate);
    countQuery.where("data_servico", ">=", startDate);
  }
  if (endDate) {
    query.where("servicos_avulsos.data_servico", "<=", endDate);
    countQuery.where("data_servico", "<=", endDate);
  }
  if (filters.trocadorId) {
    query.where("servicos_avulsos.trocador_id", Number(filters.trocadorId));
    countQuery.where("trocador_id", Number(filters.trocadorId));
  }

  if (hasPagination) query.limit(limit).offset((page - 1) * limit);
  const data = await query;
  if (!hasPagination) return data;

  // Agrega count + soma do valor sobre TODO o filtro (não só a página),
  // para a tela de Serviços exibir o total real e não o parcial da página.
  const aggResult = await countQuery
    .count("id as total")
    .sum("valor as totalValor")
    .first();
  const total = Number(aggResult?.total || 0);
  const totalValor = Number(aggResult?.totalValor || 0);
  return { data, total, totalValor, page, totalPages: Math.ceil(total / limit) };
}

async function createService(knex, lojaId, userId, data = {}) {
  const valor = Number(data.valor);
  if (!Number.isFinite(valor) || valor <= 0) {
    return { success: false, error: "Valor invalido. Informe um valor maior que zero." };
  }

  const trocadorId = Number(data.trocador_id || data.trocadorId);
  if (!Number.isInteger(trocadorId) || trocadorId <= 0) {
    return { success: false, error: "Responsavel invalido." };
  }

  const trocador = await knex("pessoas").where({ id: trocadorId, loja_id: lojaId, ativo: true }).first();
  if (!trocador) {
    return { success: false, error: "Responsavel nao encontrado ou inativo." };
  }

  const [created] = await knex("servicos_avulsos")
    .insert({
      loja_id: lojaId,
      trocador_id: trocadorId,
      descricao: String(data.descricao || "").trim(),
      valor,
      forma_pagamento: data.forma_pagamento || "Saida",
    })
    .returning(["id"]);

  await logStoreEvent(knex, lojaId, {
    event_type: "service.created",
    entity_type: "servico",
    entity_id: created.id,
    user_id: userId,
    message: `Servico #${created.id} registrado`,
    payload: { valor, trocador_id: trocadorId },
  });

  return { success: true, id: created.id };
}

module.exports = { listServices, createService };
