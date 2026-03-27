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
      return { id, success: true };
    }
  });

  safeHandle("delete-product", async (event, id) => {
    await knex("produtos").where("id", id).update({ ativo: false });
    return { success: true };
  });

  safeHandle("get-product-history", async (event, filters = {}) => {
    const page = filters.page || 1;
    const limit = filters.limit || 200;
    const offset = (page - 1) * limit;

    const query = knex("historico_produtos")
      .join("produtos", "historico_produtos.produto_id", "produtos.id")
      .select("historico_produtos.*", "produtos.descricao", "produtos.codigo")
      .orderBy("historico_produtos.data_alteracao", "desc");

    const countResult = await knex("historico_produtos").count("id as total").first();
    const total = countResult.total;

    const data = await query.limit(limit).offset(offset);

    return { data, total, page, totalPages: Math.ceil(total / limit) };
  });
}

module.exports = { register };
