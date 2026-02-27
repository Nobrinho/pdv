import { BaseRepository } from "./BaseRepository";
import { Client, Debt } from "../../../src/types";


export class ClientesRepository extends BaseRepository {
  constructor() {
    super("clientes");
  }

  async getWithSaldoDevedor(): Promise<Client[]> {
    const clientes = await this.query.where("ativo", true);

    for (let cli of clientes) {
      const dividas = await this.db("contas_receber")
        .where("cliente_id", cli.id)
        .where("empresa_id", this.companyId)
        .whereNot("status", "PAGO")
        .whereNull("deleted_at");

      const totalDivida = dividas.reduce(
        (acc, d) => acc + (d.valor_total - d.valor_pago),
        0
      );
      (cli as any).saldo_devedor = totalDivida;
    }

    return clientes as Client[];
  }

  async save(client: Client) {
    if (client.id) {
      await this.update(client.id, client);
    } else {
      await this.insert({ ...client, ativo: true });
    }
    return { success: true };
  }

  async deleteIfNoDebt(id: number) {
    const dividas = await this.db("contas_receber")
      .where("cliente_id", id)
      .where("empresa_id", this.companyId)
      .whereNot("status", "PAGO")
      .whereNull("deleted_at")
      .first();

    if (dividas) {
      return { success: false, error: "Cliente possui débitos pendentes." };
    }

    await this.delete(id);
    return { success: true };
  }

  async getDebts(clienteId: number): Promise<Debt[]> {
    return await this.db("contas_receber")
      .where("cliente_id", clienteId)
      .where("empresa_id", this.companyId)
      .whereNull("deleted_at")
      .orderBy("data_lancamento", "desc");
  }

  async payDebt(contaId: number, valorPago: number) {
    const now = Date.now();
    const conta = await this.db("contas_receber")
      .where("id", contaId)
      .where("empresa_id", this.companyId)
      .first();
    
    if (!conta) throw new Error("Conta não encontrada");

    const novoValorPago = conta.valor_pago + valorPago;
    let novoStatus = conta.status;

    if (novoValorPago >= conta.valor_total) {
      novoStatus = "PAGO";
    } else if (novoValorPago > 0) {
      novoStatus = "PARCIAL";
    }

    await this.db("contas_receber")
      .where("id", contaId)
      .where("empresa_id", this.companyId)
      .update({
        valor_pago: novoValorPago,
        status: novoStatus,
        updated_at: now,
        synced: false
      });
    
    // Registrar na fila de sincronização para a tabela de contas_receber
    // Como o BaseRepository é baseado na tabela 'clientes', preciso fazer o registro manual aqui
    const syncId = `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await this.db("sync_queue").insert({
      id: syncId,
      table_name: "contas_receber",
      record_id: contaId.toString(),
      action: "UPDATE",
      payload: JSON.stringify({ valor_pago: novoValorPago, status: novoStatus }),
      empresa_id: this.companyId,
      created_at: now,
      processed: false,
    });

    return { success: true };
  }
}
