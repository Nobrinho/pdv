import { BaseRepository } from "./BaseRepository";

export class CompanyRepository extends BaseRepository {
  constructor() {
    super("empresas");
  }

  async getCurrentCompany() {
    return await this.db("empresas").where("id", this.companyId).first();
  }

  async updateInfo(data: any) {
    const now = Date.now();
    await this.db("empresas")
      .where("id", this.companyId)
      .update({
        ...data,
        updated_at: now,
        synced: false
      });
    
    // Sync queue
    await this.addToSyncQueue(this.companyId, "UPDATE", data);
  }

  async getSaaSConfig() {
    return await this.db("saas_config").first();
  }

  async updateSaaSConfig(data: any) {
    const now = Date.now();
    const config = await this.getSaaSConfig();
    if (config) {
      await this.db("saas_config").where("id", config.id).update({
        ...data,
        updated_at: now
      });
    }
  }
}
