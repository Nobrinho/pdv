/**
 * Handlers de Serviços Avulsos
 */
function register(safeHandle, knex) {
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

    const countResult = await countQuery.count("id as total").first();
    const total = Number(countResult?.total || 0);
    const totalPages = Math.ceil(total / limit);

    return {
      data,
      total,
      page,
      totalPages,
    };
  });

  safeHandle("create-service", async (event, data) => {
    const [id] = await knex("servicos_avulsos").insert({
      ...data,
      data_servico: Date.now(),
    });
    return { success: true, id };
  });
}

module.exports = { register };
