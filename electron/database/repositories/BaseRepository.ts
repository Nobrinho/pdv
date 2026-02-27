import { Knex } from "knex";
import { knex } from "../knex";
import CompanyContext from "../context/CompanyContext";

export class BaseRepository {
  protected db: Knex = knex;
  protected tableName: string;

  protected get companyId(): string {
    const contextCompany = CompanyContext.getCompany();

    if (!contextCompany) {
      console.warn(
        `[CompanyContext] Empresa não definida para ${this.tableName}. Usando fallback EMPRESA_LOCAL_001`
      );
      return "EMPRESA_LOCAL_001";
    }

    return contextCompany;
  }

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  protected get query() {
    return this.db(this.tableName)
      .where(`${this.tableName}.empresa_id`, this.companyId)
      .whereNull(`${this.tableName}.deleted_at`);
  }

  async getAll() {
    return await this.query;
  }

  async getById(id: number | string) {
    return await this.query.where("id", id).first();
  }

  async insert(data: any) {
    const now = Date.now();
    return await this.db.transaction(async (trx) => {
      const [id] = await trx(this.tableName).insert({
        ...data,
        empresa_id: this.companyId,
        updated_at: now,
        synced: false,
      });

      // Registrar na fila de sincronização
      await this.addToSyncQueueTrx(trx, id, "INSERT", data);

      return id;
    });
  }

  async update(id: number | string, data: any) {
    const now = Date.now();
    await this.db.transaction(async (trx) => {
      await trx(this.tableName)
        .where("id", id)
        .where("empresa_id", this.companyId)
        .update({
          ...data,
          updated_at: now,
          synced: false,
        });

      // Registrar na fila de sincronização
      await this.addToSyncQueueTrx(trx, id, "UPDATE", data);
    });
  }

  async delete(id: number | string) {
    const now = Date.now();
    await this.db.transaction(async (trx) => {
      await trx(this.tableName)
        .where("id", id)
        .where("empresa_id", this.companyId)
        .update({
          deleted_at: now,
          synced: false,
        });

      // Registrar na fila de sincronização
      await this.addToSyncQueueTrx(trx, id, "DELETE", null);
    });
  }

  protected async addToSyncQueue(
    recordId: number | string,
    action: string,
    payload: any
  ) {
    await this.addToSyncQueueTrx(this.db, recordId, action, payload);
  }

  protected async addToSyncQueueTrx(
    trx: Knex | Knex.Transaction,
    recordId: number | string,
    action: string,
    payload: any,
    tableName?: string
  ) {
    const syncId = `sync_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;
    await trx("sync_queue").insert({
      id: syncId,
      table_name: tableName || this.tableName,
      record_id: recordId.toString(),
      action,
      payload: payload ? JSON.stringify(payload) : null,
      empresa_id: this.companyId,
      created_at: Date.now(),
      processed: false,
    });
  }
}
