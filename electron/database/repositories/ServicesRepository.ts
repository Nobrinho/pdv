import { BaseRepository } from "./BaseRepository";

export class ServicesRepository extends BaseRepository {
  constructor() {
    super("servicos_avulsos");
  }

  async getAllDetailed() {
    return await this.query
      .leftJoin("pessoas", "servicos_avulsos.trocador_id", "pessoas.id")
      .select("servicos_avulsos.*", "pessoas.nome as trocador_nome")
      .whereNull("servicos_avulsos.deleted_at")
      .orderBy("data_servico", "desc");
  }

  async create(data: any) {
    const now = Date.now();
    return await this.insert({
      ...data,
      data_servico: now,
    });
  }
}
