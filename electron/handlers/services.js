/**
 * Handlers de Serviços Avulsos
 */
function register(safeHandle, knex) {
  safeHandle("get-services", async (event, filters = {}) => {
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
    if (filters.limit) {
      query.limit(filters.limit);
    }

    return await query;
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
