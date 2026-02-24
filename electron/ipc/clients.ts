import { ipcMain } from "electron";
import { knex } from "../database/knex";
import { Client, Debt } from "../../src/types";

export function registerClientHandlers() {
  ipcMain.handle("get-clients", async (): Promise<Client[]> => {
    try {
      const clientes = await knex("clientes").where("ativo", true);

      for (let cli of clientes) {
        const dividas = await knex("contas_receber")
          .where("cliente_id", cli.id)
          .whereNot("status", "PAGO");

        const totalDivida = dividas.reduce(
          (acc, d) => acc + (d.valor_total - d.valor_pago),
          0,
        );
        cli.saldo_devedor = totalDivida;
      }

      return clientes;
    } catch (error) {
      console.error("Erro get-clients:", error);
      return [];
    }
  });

  ipcMain.handle("save-client", async (_event, client: Client) => {
    try {
      if (client.id) {
        await knex("clientes").where("id", client.id).update(client);
        return { success: true };
      } else {
        await knex("clientes").insert({ ...client, ativo: true });
        return { success: true };
      }
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("delete-client", async (_event, id: number) => {
    try {
      const dividas = await knex("contas_receber")
        .where("cliente_id", id)
        .whereNot("status", "PAGO")
        .first();

      if (dividas)
        return { success: false, error: "Cliente possui débitos pendentes." };

      await knex("clientes").where("id", id).update({ ativo: false });
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("get-client-debts", async (_event, clienteId: number): Promise<Debt[]> => {
    return await knex("contas_receber")
      .where("cliente_id", clienteId)
      .orderBy("data_lancamento", "desc");
  });

  ipcMain.handle("pay-debt", async (_event, { contaId, valorPago }: { contaId: number, valorPago: number }) => {
    try {
      const conta = await knex("contas_receber").where("id", contaId).first();
      if (!conta) throw new Error("Conta não encontrada");

      const novoValorPago = conta.valor_pago + valorPago;
      let novoStatus = conta.status;

      if (novoValorPago >= conta.valor_total) {
        novoStatus = "PAGO";
      } else if (novoValorPago > 0) {
        novoStatus = "PARCIAL";
      }

      await knex("contas_receber").where("id", contaId).update({
        valor_pago: novoValorPago,
        status: novoStatus,
      });

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });
}
