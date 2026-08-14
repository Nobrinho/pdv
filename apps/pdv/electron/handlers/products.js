/**
 * Handlers de Produtos (CRUD + Histórico)
 */
const { requireAdmin } = require("../lib/authSession");

function register(safeHandle, knex, authSession) {
  const { logEvent } = require("../lib/eventLogger");
  const sanitizeProductPayload = (product = {}, { forUpdate = false } = {}) => {
    const payload = {};
    const allowedFields = [
      "codigo",
      "descricao",
      "custo",
      "preco_venda",
      "estoque_atual",
      "tipo",
      "ativo",
    ];

    for (const field of allowedFields) {
      if (Object.prototype.hasOwnProperty.call(product, field)) {
        payload[field] = product[field];
      }
    }

    if (!forUpdate && !Object.prototype.hasOwnProperty.call(payload, "ativo")) {
      payload.ativo = true;
    }

    return payload;
  };
  const normalizeBatchNumber = (value, fallback, { integer = false } = {}) => {
    const hasValue = value !== null && value !== undefined && value !== "";
    const normalized = Number(hasValue ? value : fallback);

    if (!Number.isFinite(normalized) || normalized < 0) {
      return null;
    }
    if (integer && !Number.isInteger(normalized)) {
      return null;
    }

    return integer ? Math.trunc(normalized) : normalized;
  };

  safeHandle("get-products", async () => {
    return await knex("produtos").where("ativo", true).select("*");
  });

  safeHandle("search-products", async (event, { term, limit = 20 }) => {
    if (!term || term.length < 2) return [];
    return await knex("produtos")
      .where("ativo", true)
      .where(function () {
        this.where("descricao", "like", `%${term}%`)
          .orWhere("codigo", "like", `%${term}%`);
      })
      .select("*")
      .limit(limit);
  });

  safeHandle("save-product", async (event, product) => {
    const authError = await requireAdmin(event, knex, authSession);
    if (authError) return authError;

    const precoVenda = Number(product?.preco_venda ?? 0);
    const custo = Number(product?.custo ?? 0);
    const estoque = Number(product?.estoque_atual ?? 0);

    if (!product?.descricao || !String(product.descricao).trim()) {
      return { success: false, error: "Descricao obrigatoria." };
    }
    if (!Number.isFinite(precoVenda) || precoVenda < 0) {
      return { success: false, error: "Preco de venda invalido." };
    }
    if (!Number.isFinite(custo) || custo < 0) {
      return { success: false, error: "Custo invalido." };
    }
    if (!Number.isFinite(estoque) || estoque < 0) {
      return { success: false, error: "Estoque invalido." };
    }

    if (product.id) {
      const atual = await knex("produtos").where("id", product.id).first();
      if (!atual) {
        return { success: false, error: "Produto nao encontrado." };
      }
      const payload = sanitizeProductPayload(product, { forUpdate: true });
      await knex("produtos").where("id", product.id).update(payload);
      const nextPrice = Object.prototype.hasOwnProperty.call(payload, "preco_venda")
        ? parseFloat(payload.preco_venda)
        : parseFloat(atual.preco_venda);
      const nextStock = Object.prototype.hasOwnProperty.call(payload, "estoque_atual")
        ? parseInt(payload.estoque_atual)
        : parseInt(atual.estoque_atual);

      if (
        parseFloat(atual.preco_venda) !== nextPrice ||
        parseInt(atual.estoque_atual) !== nextStock
      ) {
        await knex("historico_produtos").insert({
          produto_id: product.id,
          preco_antigo: atual.preco_venda,
          preco_novo: nextPrice,
          estoque_antigo: atual.estoque_atual,
          estoque_novo: nextStock,
          tipo_alteracao: "atualizacao",
          data_alteracao: Date.now(),
        });
      }
      await logEvent(knex, {
        event_category: "domain_action",
        event_type: "product.updated",
        entity_type: "produto",
        entity_id: product.id,
        severity: "info",
        message: `Produto #${product.id} atualizado`,
        source: "handler",
      });
      return { id: product.id, success: true };
    } else {
      if (!product.codigo) product.codigo = "AUTO-" + Date.now();
      const payload = sanitizeProductPayload(product, { forUpdate: false });
      const [id] = await knex("produtos").insert(payload);

      await knex("historico_produtos").insert({
        produto_id: id,
        preco_novo: payload.preco_venda,
        estoque_novo: payload.estoque_atual,
        tipo_alteracao: "cadastro_inicial",
        data_alteracao: Date.now(),
      });
      await logEvent(knex, {
        event_category: "domain_action",
        event_type: "product.created",
        entity_type: "produto",
        entity_id: id,
        severity: "info",
        message: `Produto #${id} criado`,
        source: "handler",
      });
      return { id, success: true };
    }
  });

  safeHandle("delete-product", async (event, id) => {
    const authError = await requireAdmin(event, knex, authSession);
    if (authError) return authError;

    await knex("produtos").where("id", id).update({ ativo: false });
    await logEvent(knex, {
      event_category: "domain_action",
      event_type: "product.deleted",
      entity_type: "produto",
      entity_id: id,
      severity: "warning",
      message: `Produto #${id} excluído (inativado)`,
      source: "handler",
    });
    return { success: true };
  });

  safeHandle("get-product-history", async (event, filters = {}) => {
    const page = filters.page || 1;
    const limit = filters.limit || 200;
    const offset = (page - 1) * limit;
    const startDate = filters.startDate;
    const endDate = filters.endDate;

    const query = knex("historico_produtos")
      .join("produtos", "historico_produtos.produto_id", "produtos.id")
      .select("historico_produtos.*", "produtos.descricao", "produtos.codigo")
      .orderBy("historico_produtos.data_alteracao", "desc");

    if (startDate) {
      const startTs = new Date(`${startDate}T00:00:00`).getTime();
      query.where("historico_produtos.data_alteracao", ">=", startTs);
    }
    if (endDate) {
      const endTs = new Date(`${endDate}T23:59:59.999`).getTime();
      query.where("historico_produtos.data_alteracao", "<=", endTs);
    }

    const countQuery = knex("historico_produtos");
    if (startDate) {
      const startTs = new Date(`${startDate}T00:00:00`).getTime();
      countQuery.where("historico_produtos.data_alteracao", ">=", startTs);
    }
    if (endDate) {
      const endTs = new Date(`${endDate}T23:59:59.999`).getTime();
      countQuery.where("historico_produtos.data_alteracao", "<=", endTs);
    }

    const countResult = await countQuery.count("id as total").first();
    const total = countResult.total;

    const data = await query.limit(limit).offset(offset);

    return { data, total, page, totalPages: Math.ceil(total / limit) };
  });

  // === IMPORTAÇÃO EM LOTE ===
  safeHandle("import-products-batch", async (event, { products, conflictMode }) => {
    const authError = await requireAdmin(event, knex, authSession);
    if (authError) return authError;

    // conflictMode: "skip" | "update"
    const trx = await knex.transaction();
    const results = { created: 0, updated: 0, skipped: 0, errors: [] };

    try {
      for (const [index, product] of products.entries()) {
        try {
          // Validação mínima
          if (!product.descricao || !String(product.descricao).trim()) {
            results.errors.push({ row: index + 1, error: "Descrição obrigatória" });
            continue;
          }

          // Converter para String com segurança para evitar erro de .trim() em números
          const safeDesc = String(product.descricao).trim();
          const safeCod = product.codigo ? String(product.codigo).trim() : null;

          // Buscar duplicata por código (mesmo que esteja inativo para evitar conflito UNIQUE)
          const existing = safeCod
            ? await trx("produtos").where("codigo", safeCod).first()
            : null;

          if (existing && conflictMode === "skip") {
            results.skipped++;
            continue;
          }

          if (existing) {
            const custo = normalizeBatchNumber(product.custo, existing.custo);
            const precoVenda = normalizeBatchNumber(
              product.preco_venda,
              existing.preco_venda,
            );
            const estoqueAtual = normalizeBatchNumber(
              product.estoque_atual,
              existing.estoque_atual,
              { integer: true },
            );

            if (custo === null || precoVenda === null || estoqueAtual === null) {
              results.errors.push({ row: index + 1, error: "Valores numericos invalidos" });
              continue;
            }

            // Atualizar produto existente
            const updates = {
              descricao: safeDesc,
              custo,
              preco_venda: precoVenda,
              estoque_atual: estoqueAtual,
              tipo: product.tipo || existing.tipo,
              ativo: true,
            };
            await trx("produtos").where("id", existing.id).update(updates);

            // Registrar histórico se preço ou estoque mudou
            if (
              parseFloat(existing.preco_venda) !== updates.preco_venda ||
              parseInt(existing.estoque_atual) !== updates.estoque_atual
            ) {
              await trx("historico_produtos").insert({
                produto_id: existing.id,
                preco_antigo: existing.preco_venda,
                preco_novo: updates.preco_venda,
                estoque_antigo: existing.estoque_atual,
                estoque_novo: updates.estoque_atual,
                tipo_alteracao: "atualizacao_lote",
                data_alteracao: Date.now(),
              });
            }
            results.updated++;
          } else {
            const custo = normalizeBatchNumber(product.custo, 0);
            const precoVenda = normalizeBatchNumber(product.preco_venda, 0);
            const estoqueAtual = normalizeBatchNumber(product.estoque_atual, 0, {
              integer: true,
            });

            if (custo === null || precoVenda === null || estoqueAtual === null) {
              results.errors.push({ row: index + 1, error: "Valores numericos invalidos" });
              continue;
            }

            // Criar novo produto
            const codigo = safeCod || ("AUTO-" + Date.now() + "-" + index);
            const [id] = await trx("produtos").insert({
              codigo,
              descricao: safeDesc,
              custo,
              preco_venda: precoVenda,
              estoque_atual: estoqueAtual,
              tipo: product.tipo || "novo",
              ativo: true,
            });

            await trx("historico_produtos").insert({
              produto_id: id,
              preco_novo: precoVenda,
              estoque_novo: estoqueAtual,
              tipo_alteracao: "cadastro_lote",
              data_alteracao: Date.now(),
            });
            results.created++;
          }
        } catch (rowError) {
          results.errors.push({ row: index + 1, error: rowError.message });
        }
      }

      await trx.commit();
      await logEvent(knex, {
        event_category: "domain_action",
        event_type: "product.import_batch",
        entity_type: "produto",
        severity: "info",
        message: "Importação de produtos concluída",
        payload: results,
        source: "handler",
      });

      return { success: true, ...results };
    } catch (error) {
      await trx.rollback();
      await logEvent(knex, {
        event_category: "error",
        event_type: "product.import_batch_failed",
        entity_type: "produto",
        severity: "error",
        message: error.message,
        source: "handler",
      });
      return { success: false, error: error.message };
    }
  });

  // === DIALOG DE ARQUIVO ===
  safeHandle("open-file-dialog", async () => {
    const { dialog } = require("electron");
    const path = require("path");
    const fs = require("fs");

    const result = await dialog.showOpenDialog({
      title: "Selecionar Planilha de Produtos",
      filters: [{ name: "Planilhas", extensions: ["xlsx", "xls", "csv"] }],
      properties: ["openFile"],
    });

    if (result.canceled || !result.filePaths.length) return { canceled: true };

    const filePath = result.filePaths[0];
    const buffer = fs.readFileSync(filePath);
    return {
      canceled: false,
      buffer: buffer.toString("base64"),
      fileName: path.basename(filePath),
    };
  });
}

module.exports = { register };
