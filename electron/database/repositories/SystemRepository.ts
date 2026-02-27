import { BaseRepository } from "./BaseRepository";
import nodeCrypto from "crypto";

export class SystemRepository extends BaseRepository {
  constructor() {
    super("usuarios");
  }

  // --- USUÁRIOS ---
  async getUsers() {
    return await this.db("usuarios")
      .where("empresa_id", this.companyId)
      .whereNull("deleted_at")
      .select("id", "nome", "username", "cargo");
  }

  async checkUsersExist() {
    const res = await this.db("usuarios")
      .where("empresa_id", this.companyId)
      .whereNull("deleted_at")
      .count("id as total")
      .first();
    return (res as any).total > 0;
  }

  async registerUser(userData: any) {
    const { salt, hash } = this.hashPassword(userData.password);
    return await this.insert({
      nome: userData.nome,
      username: userData.username,
      password_hash: hash,
      salt: salt,
      cargo: userData.cargo || "admin",
      ativo: true,
    });
  }

  async findByUsername(username: string) {
    return await this.db("usuarios")
      .where("username", username)
      .where("empresa_id", this.companyId)
      .whereNull("deleted_at")
      .first();
  }

  // --- CONFIGURAÇÕES ---
  async getConfig(key: string) {
    const config = await this.db("configuracoes")
      .where("chave", key)
      .where("empresa_id", this.companyId)
      .whereNull("deleted_at")
      .first();
    return config ? config.valor : null;
  }

  async saveConfig(key: string, value: any) {
    const now = Date.now();
    await this.db.transaction(async (trx) => {
      const existing = await trx("configuracoes")
        .where("chave", key)
        .where("empresa_id", this.companyId)
        .first();

      if (existing) {
        await trx("configuracoes")
          .where("chave", key)
          .where("empresa_id", this.companyId)
          .update({
            valor: value,
            updated_at: now,
            synced: false,
            deleted_at: null,
          });
      } else {
        await trx("configuracoes").insert({
          chave: key,
          valor: value,
          empresa_id: this.companyId,
          updated_at: now,
          synced: false,
        });
      }

      // sync queue para configurações
      await this.addToSyncQueueTrx(
        trx,
        key,
        existing ? "UPDATE" : "INSERT",
        { valor: value },
        "configuracoes"
      );
    });
  }

  // --- HELPERS ---
  private hashPassword(password: string) {
    const salt = nodeCrypto.randomBytes(16).toString("hex");
    const hash = nodeCrypto
      .pbkdf2Sync(password, salt, 1000, 64, "sha512")
      .toString("hex");
    return { salt, hash };
  }

  verifyPassword(password: string, salt: string, storedHash: string) {
    const hash = nodeCrypto
      .pbkdf2Sync(password, salt, 1000, 64, "sha512")
      .toString("hex");
    return hash === storedHash;
  }
}
