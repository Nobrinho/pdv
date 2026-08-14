/**
 * Handlers de Serviços Avulsos
 */
function register(safeHandle, knex) {
  const { logEvent } = require("../lib/eventLogger");
  safeHandle("get-services", async (event, filters = {}) => {
    const page = filters.page ? parseInt(filters.page, 10) : null;
    const limit = filters.limit ? parseInt(filters.limit, 10) : null;
    const hasPagination = Number.isInteger(page) && Number.isInteger(limit) && page > 0 && limit > 0;
    const offset = hasPagination ? (page - 1) * limit : 0;

    const query = knex("servicos_avulsos")
      .leftJoin("pessoas", "servicos_avulsos.trocador_id", "pessoas.id")
      .select("servicos_avulsos.*", "pessoas.nome as trocador_nome")
      .orderBy("data_servico", "desc");

    if (filters.startDate) {
      query.where("servicos_avulsos.data_servico", ">=", filters.startDate);
    }
    if (filters.endDate) {
      query.where("servicos_avulsos.data_servico", "<=", filters.endDate);
    }
    if (filters.trocadorId) {
      query.where("servicos_avulsos.trocador_id", filters.trocadorId);
    }
    const countQuery = knex("servicos_avulsos");
    if (filters.startDate) {
      countQuery.where("servicos_avulsos.data_servico", ">=", filters.startDate);
    }
    if (filters.endDate) {
      countQuery.where("servicos_avulsos.data_servico", "<=", filters.endDate);
    }
    if (filters.trocadorId) {
      countQuery.where("servicos_avulsos.trocador_id", filters.trocadorId);
    }

    if (hasPagination) {
      query.limit(limit).offset(offset);
    } else if (filters.limit) {
      query.limit(filters.limit);
    }

    const data = await query;

    if (!hasPagination) {
      return data;
    }

    // Agrega count + soma do valor sobre TODO o filtro (não só a página),
    // para a tela de Serviços exibir o total real e não o parcial da página.
    const aggResult = await countQuery
      .count("id as total")
      .sum("valor as totalValor")
      .first();
    const total = Number(aggResult?.total || 0);
    const totalValor = Number(aggResult?.totalValor || 0);
    const totalPages = Math.ceil(total / limit);

    return {
      data,
      total,
      totalValor,
      page,
      totalPages,
    };
  });

  safeHandle("create-service", async (event, data) => {
    const valor = Number(data?.valor);
    if (!Number.isFinite(valor) || valor <= 0) {
      return { success: false, error: "Valor invalido. Informe um valor maior que zero." };
    }

    const trocadorId = Number(data?.trocador_id);
    if (!Number.isInteger(trocadorId) || trocadorId <= 0) {
      return { success: false, error: "Responsavel invalido." };
    }

    const trocador = await knex("pessoas")
      .where({ id: trocadorId, ativo: true })
      .first();
    if (!trocador) {
      return { success: false, error: "Responsavel nao encontrado ou inativo." };
    }

    const [id] = await knex("servicos_avulsos").insert({
      trocador_id: trocadorId,
      descricao: (data?.descricao || "").trim(),
      valor,
      forma_pagamento: data?.forma_pagamento || "Saida",
      data_servico: Date.now(),
    });
    await logEvent(knex, {
      event_category: "domain_action",
      event_type: "service.created",
      entity_type: "servico",
      entity_id: id,
      severity: "info",
      message: `Serviço #${id} registrado`,
      payload: { valor: data?.valor, trocador_id: data?.trocador_id || null },
      source: "handler",
    });
    return { success: true, id };
  });
}

module.exports = { register };
