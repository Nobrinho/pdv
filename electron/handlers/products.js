/**
 * Handlers de Produtos (CRUD + Histórico)
 */
function register(safeHandle, knex) {
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
    if (product.id) {
      const atual = await knex("produtos").where("id", product.id).first();
      await knex("produtos").where("id", product.id).update(product);

      if (
        parseFloat(atual.preco_venda) !== parseFloat(product.preco_venda) ||
        parseInt(atual.estoque_atual) !== parseInt(product.estoque_atual)
      ) {
        await knex("historico_produtos").insert({
          produto_id: product.id,
          preco_antigo: atual.preco_venda,
          preco_novo: product.preco_venda,
          estoque_antigo: atual.estoque_atual,
          estoque_novo: product.estoque_atual,
          tipo_alteracao: "atualizacao",
          data_alteracao: Date.now(),
        });
      }
      const { syncData } = require("../lib/turso");
      syncData();
      return { id: product.id, success: true };
    } else {
      if (!product.codigo) product.codigo = "AUTO-" + Date.now();
      const [id] = await knex("produtos").insert({ ...product, ativo: true });

      await knex("historico_produtos").insert({
        produto_id: id,
        preco_novo: product.preco_venda,
        estoque_novo: product.estoque_atual,
        tipo_alteracao: "cadastro_inicial",
        data_alteracao: Date.now(),
      });
      const { syncData } = require("../lib/turso");
      syncData();
      return { id, success: true };
    }
  });

  safeHandle("delete-product", async (event, id) => {
    await knex("produtos").where("id", id).update({ ativo: false });
    const { syncData } = require("../lib/turso");
    syncData();
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
            // Atualizar produto existente
            const updates = {
              descricao: safeDesc,
              custo: parseFloat(product.custo || existing.custo),
              preco_venda: parseFloat(product.preco_venda || existing.preco_venda),
              estoque_atual: parseInt(product.estoque_atual ?? existing.estoque_atual),
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
            // Criar novo produto
            const codigo = safeCod || ("AUTO-" + Date.now() + "-" + index);
            const [id] = await trx("produtos").insert({
              codigo,
              descricao: safeDesc,
              custo: parseFloat(product.custo || 0),
              preco_venda: parseFloat(product.preco_venda || 0),
              estoque_atual: parseInt(product.estoque_atual || 0),
              tipo: product.tipo || "novo",
              ativo: true,
            });

            await trx("historico_produtos").insert({
              produto_id: id,
              preco_novo: parseFloat(product.preco_venda || 0),
              estoque_novo: parseInt(product.estoque_atual || 0),
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
      const { syncData } = require("../lib/turso");
      syncData();

      return { success: true, ...results };
    } catch (error) {
      await trx.rollback();
      return { success: false, error: error.message };
    }
  });

  // E também no save-product manual
  // Vou precisar localizar o save-product no arquivo para garantir que sincronize lá também.


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
