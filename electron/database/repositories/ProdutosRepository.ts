import { BaseRepository } from "./BaseRepository";
import { Product } from "../../../src/types";

export class ProdutosRepository extends BaseRepository {
  constructor() {
    super("produtos");
  }

  async getActive() {
    return await this.query.where("ativo", true);
  }

  async saveWithHistory(product: Product) {
    const now = Date.now();
    
    if (product.id) {
      const atual = await this.query.where("id", product.id).first();
      await this.update(product.id, product);

      if (
        parseFloat(atual.preco_venda) !== Number(product.preco_venda) ||
        Number(atual.estoque_atual) !== Number(product.estoque_atual)
      ) {
        await this.db("historico_produtos").insert({
          produto_id: product.id,
          preco_antigo: atual.preco_venda,
          preco_novo: product.preco_venda,
          estoque_antigo: atual.estoque_atual,
          estoque_novo: product.estoque_atual,
          tipo_alteracao: "atualizacao",
          data_alteracao: now,
          empresa_id: this.companyId,
          updated_at: now,
          synced: false
        });
      }
      return { id: product.id, success: true };
    } else {
      const codigo = product.codigo || "AUTO-" + Date.now();
      const id = await this.insert({ ...product, codigo, ativo: true });

      await this.db("historico_produtos").insert({
        produto_id: id,
        preco_novo: product.preco_venda,
        estoque_novo: product.estoque_atual,
        tipo_alteracao: "cadastro_inicial",
        data_alteracao: now,
        empresa_id: this.companyId,
        updated_at: now,
        synced: false
      });
      return { id, success: true };
    }
  }

  async getHistory() {
    return await this.db("historico_produtos")
      .join("produtos", "historico_produtos.produto_id", "produtos.id")
      .where("historico_produtos.empresa_id", this.companyId)
      .whereNull("produtos.deleted_at")
      .select("historico_produtos.*", "produtos.descricao", "produtos.codigo")
      .orderBy("historico_produtos.data_alteracao", "desc");
  }
}
