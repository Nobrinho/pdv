const { logStoreEvent } = require("./eventLogService");

const PRODUCT_FIELDS = [
  "codigo",
  "descricao",
  "custo",
  "preco_venda",
  "estoque_atual",
  "tipo",
  "ativo",
];

function normalizeNumber(value, field, { integer = false } = {}) {
  const normalized = Number(value);
  if (!Number.isFinite(normalized) || normalized < 0) {
    return { error: `${field} invalido.` };
  }
  if (integer && !Number.isInteger(normalized)) {
    return { error: `${field} deve ser inteiro.` };
  }
  return { value: integer ? Math.trunc(normalized) : normalized };
}

function sanitizeProductPayload(product = {}, { forUpdate = false } = {}) {
  const payload = {};

  for (const field of PRODUCT_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(product, field)) {
      payload[field] = product[field];
    }
  }

  if (payload.codigo != null) payload.codigo = String(payload.codigo).trim();
  if (payload.descricao != null) payload.descricao = String(payload.descricao).trim();
  if (payload.tipo != null) payload.tipo = String(payload.tipo || "novo").trim() || "novo";

  if (!forUpdate && !Object.prototype.hasOwnProperty.call(payload, "ativo")) {
    payload.ativo = true;
  }

  return payload;
}

function validateProduct(product = {}) {
  if (!product.descricao || !String(product.descricao).trim()) {
    return { error: "Descricao obrigatoria." };
  }

  const custo = normalizeNumber(product.custo ?? 0, "Custo");
  if (custo.error) return custo;

  const precoVenda = normalizeNumber(product.preco_venda ?? 0, "Preco de venda");
  if (precoVenda.error) return precoVenda;

  const estoque = normalizeNumber(product.estoque_atual ?? 0, "Estoque", { integer: true });
  if (estoque.error) return estoque;

  return {
    value: {
      ...product,
      custo: custo.value,
      preco_venda: precoVenda.value,
      estoque_atual: estoque.value,
    },
  };
}

async function listProducts(knex, lojaId) {
  return await knex("produtos")
    .where({ loja_id: lojaId, ativo: true })
    .select("*")
    .orderBy("descricao", "asc");
}

async function searchProducts(knex, lojaId, params = {}) {
  const term = String(params.term || "").trim();
  const limit = Math.min(Number(params.limit || 20), 100);

  if (term.length < 2) return [];

  return await knex("produtos")
    .where({ loja_id: lojaId, ativo: true })
    .where((builder) => {
      builder.whereILike("descricao", `%${term}%`).orWhereILike("codigo", `%${term}%`);
    })
    .select("*")
    .limit(limit);
}

async function saveProduct(knex, lojaId, userId, product = {}) {
  const validation = validateProduct(product);
  if (validation.error) return { success: false, error: validation.error };

  return await knex.transaction(async (trx) => {
    if (product.id) {
      const current = await trx("produtos").where({ id: product.id, loja_id: lojaId }).first();
      if (!current) return { success: false, error: "Produto nao encontrado." };

      const payload = sanitizeProductPayload(validation.value, { forUpdate: true });
      payload.updated_at = trx.fn.now();

      await trx("produtos").where({ id: product.id, loja_id: lojaId }).update(payload);

      const nextPrice = Object.prototype.hasOwnProperty.call(payload, "preco_venda")
        ? Number(payload.preco_venda)
        : Number(current.preco_venda);
      const nextStock = Object.prototype.hasOwnProperty.call(payload, "estoque_atual")
        ? Number(payload.estoque_atual)
        : Number(current.estoque_atual);

      if (Number(current.preco_venda) !== nextPrice || Number(current.estoque_atual) !== nextStock) {
        await trx("historico_produtos").insert({
          loja_id: lojaId,
          produto_id: product.id,
          preco_antigo: current.preco_venda,
          preco_novo: nextPrice,
          estoque_antigo: current.estoque_atual,
          estoque_novo: nextStock,
          tipo_alteracao: "atualizacao",
          data_alteracao: Date.now(),
        });
      }

      await logStoreEvent(trx, lojaId, {
        event_type: "product.updated",
        entity_type: "produto",
        entity_id: product.id,
        user_id: userId,
        message: `Produto #${product.id} atualizado`,
      });

      return { success: true, id: product.id };
    }

    const payload = sanitizeProductPayload(validation.value);
    if (!payload.codigo) payload.codigo = `AUTO-${Date.now()}`;

    const [created] = await trx("produtos")
      .insert({
        loja_id: lojaId,
        ...payload,
      })
      .returning(["id"]);

    await trx("historico_produtos").insert({
      loja_id: lojaId,
      produto_id: created.id,
      preco_novo: payload.preco_venda,
      estoque_novo: payload.estoque_atual,
      tipo_alteracao: "cadastro_inicial",
      data_alteracao: Date.now(),
    });

    await logStoreEvent(trx, lojaId, {
      event_type: "product.created",
      entity_type: "produto",
      entity_id: created.id,
      user_id: userId,
      message: `Produto #${created.id} criado`,
    });

    return { success: true, id: created.id };
  });
}

async function deleteProduct(knex, lojaId, userId, id) {
  const updated = await knex("produtos")
    .where({ id, loja_id: lojaId })
    .update({ ativo: false, updated_at: knex.fn.now() });

  if (!updated) return { success: false, error: "Produto nao encontrado." };

  await logStoreEvent(knex, lojaId, {
    event_type: "product.deleted",
    entity_type: "produto",
    entity_id: id,
    user_id: userId,
    severity: "warning",
    message: `Produto #${id} inativado`,
  });

  return { success: true };
}

async function importProductsBatch(knex, lojaId, userId, products = []) {
  if (!Array.isArray(products) || products.length === 0) {
    return { success: false, error: "Nenhum produto informado para importacao." };
  }

  const summary = { success: true, created: 0, updated: 0, failed: 0, errors: [] };

  for (const [index, product] of products.entries()) {
    try {
      const code = String(product.codigo || "").trim();
      const existing = code
        ? await knex("produtos").where({ loja_id: lojaId, codigo: code }).first()
        : null;
      const result = await saveProduct(knex, lojaId, userId, {
        ...product,
        id: existing?.id,
        ativo: product.ativo ?? true,
      });

      if (!result.success) {
        summary.failed += 1;
        summary.errors.push({ row: index + 1, error: result.error });
      } else if (existing) {
        summary.updated += 1;
      } else {
        summary.created += 1;
      }
    } catch (error) {
      summary.failed += 1;
      summary.errors.push({ row: index + 1, error: error.message });
    }
  }

  summary.success = summary.failed === 0;
  return summary;
}

async function getProductHistory(knex, lojaId, filters = {}) {
  const page = Math.max(Number(filters.page || 1), 1);
  const limit = Math.min(Math.max(Number(filters.limit || 200), 1), 500);
  const offset = (page - 1) * limit;

  const query = knex("historico_produtos")
    .join("produtos", function () {
      this.on("historico_produtos.produto_id", "=", "produtos.id").andOn(
        "historico_produtos.loja_id",
        "=",
        "produtos.loja_id",
      );
    })
    .where("historico_produtos.loja_id", lojaId)
    .select("historico_produtos.*", "produtos.descricao", "produtos.codigo")
    .orderBy("historico_produtos.data_alteracao", "desc");

  const countQuery = knex("historico_produtos").where("loja_id", lojaId);

  if (filters.startDate) {
    const startTs = new Date(`${filters.startDate}T00:00:00`).getTime();
    query.where("historico_produtos.data_alteracao", ">=", startTs);
    countQuery.where("data_alteracao", ">=", startTs);
  }

  if (filters.endDate) {
    const endTs = new Date(`${filters.endDate}T23:59:59.999`).getTime();
    query.where("historico_produtos.data_alteracao", "<=", endTs);
    countQuery.where("data_alteracao", "<=", endTs);
  }

  const countResult = await countQuery.count("id as total").first();
  const total = Number(countResult?.total || 0);
  const data = await query.limit(limit).offset(offset);

  return {
    data,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
}

module.exports = {
  listProducts,
  searchProducts,
  saveProduct,
  deleteProduct,
  getProductHistory,
  importProductsBatch,
};
