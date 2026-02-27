import { BaseRepository } from "./BaseRepository";

export class PessoasRepository extends BaseRepository {
  constructor() {
    super("pessoas");
  }

  async getActive() {
    return await this.query
      .leftJoin("cargos", "pessoas.cargo_id", "cargos.id")
      .select("pessoas.*", "cargos.nome as cargo_nome")
      .where("pessoas.ativo", true);
  }

  async getBrief() {
    return await this.query.select("id", "nome", "comissao_fixa");
  }

  async save(person: any) {
    if (person.id) {
      await this.update(person.id, person);
    } else {
      await this.insert({ ...person, ativo: true });
    }
  }

  // --- CARGOS ---
  async getRoles() {
    return await this.db("cargos"); // Cargos são globais ou por empresa? 
    // Por enquanto, vamos manter globais ou adicionar empresa_id na migration se necessário.
    // A migration adicionou empresa_id em 'pessoas', mas 'cargos' não estava na lista inicial de multi-tenant.
    // Vamos tratar cargos como globais por enquanto ou filtrar se existirem.
  }

  async saveRole(nome: string) {
    return await this.db("cargos").insert({ nome });
  }

  async deleteRole(id: number) {
    return await this.db("cargos").where("id", id).del();
  }
}
