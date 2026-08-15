const { normalizeDateFilter } = require("./dateFilters");
const { logStoreEvent } = require("./eventLogService");

// Mescla os serviços avulsos com a mão de obra registrada nas vendas (leitura).
// Usada só pela tela de Serviços (includeSales); o relatório NÃO usa este caminho
// para não contar a mão de obra em dobro (o relatório já soma vendas.mao_de_obra).
async function listServicesWithSales(knex, lojaId, { startDate, endDate, trocadorId, page, limit, hasPagination }) {
  const avulsosQ = knex("servicos_avulsos")
    .leftJoin("pessoas", function () {
      this.on("servicos_avulsos.trocador_id", "=", "pessoas.id").andOn(
        "servicos_avulsos.loja_id",
        "=",
        "pessoas.loja_id",
      );
    })
    .where("servicos_avulsos.loja_id", lojaId)
    .select("servicos_avulsos.*", "pessoas.nome as trocador_nome");
  if (startDate) avulsosQ.where("servicos_avulsos.data_servico", ">=", startDate);
  if (endDate) avulsosQ.where("servicos_avulsos.data_servico", "<=", endDate);
  if (trocadorId) avulsosQ.where("servicos_avulsos.trocador_id", Number(trocadorId));

  const vendasQ = knex("vendas")
    .leftJoin("pessoas", function () {
      this.on("vendas.trocador_id", "=", "pessoas.id").andOn("vendas.loja_id", "=", "pessoas.loja_id");
    })
    .where("vendas.loja_id", lojaId)
    .where("vendas.cancelada", false)
    .where("vendas.mao_de_obra", ">", 0)
    .select(
      "vendas.id",
      "vendas.data_venda",
      "vendas.mao_de_obra",
      "vendas.trocador_id",
      "pessoas.nome as trocador_nome",
    );
  if (startDate) vendasQ.where("vendas.data_venda", ">=", startDate);
  if (endDate) vendasQ.where("vendas.data_venda", "<=", endDate);
  if (trocadorId) vendasQ.where("vendas.trocador_id", Number(trocadorId));

  const [avulsos, vendas] = await Promise.all([avulsosQ, vendasQ]);

  const rows = [
    ...avulsos.map((s) => ({ ...s, origem: "avulso" })),
    ...vendas.map((v) => ({
      id: `venda-${v.id}`,
      venda_id: v.id,
      data_servico: v.data_venda,
      trocador_id: v.trocador_id,
      trocador_nome: v.trocador_nome,
      descricao: `Mão de obra — Venda #${v.id}`,
      valor: Number(v.mao_de_obra) || 0,
      forma_pagamento: "Saida",
      origem: "venda",
    })),
  ].sort((a, b) => new Date(b.data_servico).getTime() - new Date(a.data_servico).getTime());

  const total = rows.length;
  const totalValor = rows.reduce((acc, r) => acc + (Number(r.valor) || 0), 0);

  if (!hasPagination) return rows;
  const start = (page - 1) * limit;
  return { data: rows.slice(start, start + limit), total, totalValor, page, totalPages: Math.ceil(total / limit) };
}

async function listServices(knex, lojaId, filters = {}) {
  const page = filters.page ? parseInt(filters.page, 10) : null;
  const limit = filters.limit ? Math.min(parseInt(filters.limit, 10), 500) : null;
  const hasPagination = Number.isInteger(page) && Number.isInteger(limit) && page > 0 && limit > 0;
  const startDate = normalizeDateFilter(filters.startDate, "start");
  const endDate = normalizeDateFilter(filters.endDate, "end");
  const includeSales = filters.includeSales === true || filters.includeSales === "true";

  if (includeSales) {
    return await listServicesWithSales(knex, lojaId, {
      startDate,
      endDate,
      trocadorId: filters.trocadorId,
      page,
      limit,
      hasPagination,
    });
  }

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
