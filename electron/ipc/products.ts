import { ipcMain } from "electron";
import { knex } from "../database/knex";
import { Product, ProductHistory } from "../../src/types";

export function registerProductHandlers() {
  ipcMain.handle("get-products", async (): Promise<Product[]> => {
    try {
      return await knex("produtos").where("ativo", true).select("*");
    } catch (error) {
      console.error(error);
      return [];
    }
  });

  ipcMain.handle("save-product", async (_event, product: Product) => {
    try {
      if (product.id) {
        // Histórico antes de atualizar
        const atual = await knex("produtos").where("id", product.id).first();
        await knex("produtos").where("id", product.id).update(product);

        // Log de histórico
        if (
          parseFloat(atual.preco_venda) !== Number(product.preco_venda) ||
          Number(atual.estoque_atual) !== Number(product.estoque_atual)
        ) {
          await knex("historico_produtos").insert({
            produto_id: product.id,
            preco_antigo: atual.preco_venda,
            preco_novo: product.preco_venda,
            estoque_antigo: atual.estoque_atual,
            estoque_novo: product.estoque_atual,
            tipo_alteracao: "atualizacao",
            data_alteracao: new Date(),
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
          data_alteracao: new Date(),
        });
        return { id, success: true };
      }
    } catch (error: any) {
      if (error.code === "SQLITE_CONSTRAINT_UNIQUE")
        return { success: false, error: "Código já existe." };
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("delete-product", async (_event, id: number) => {
    try {
      // Soft delete
      await knex("produtos").where("id", id).update({ ativo: false });
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("get-product-history", async (): Promise<ProductHistory[]> => {
    try {
      return await knex("historico_produtos")
        .join("produtos", "historico_produtos.produto_id", "produtos.id")
        .select("historico_produtos.*", "produtos.descricao", "produtos.codigo")
        .orderBy("historico_produtos.data_alteracao", "desc");
    } catch (error) {
      return [];
    }
  });
}
