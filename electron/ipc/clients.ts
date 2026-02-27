import { ipcMain } from "electron";
import { ClientesRepository } from "../database/repositories/ClientesRepository";
import { Client, Debt } from "../../src/types";

const clientesRepo = new ClientesRepository();

export function registerClientHandlers() {
  ipcMain.handle("get-clients", async (): Promise<Client[]> => {
    try {
      return await clientesRepo.getWithSaldoDevedor();
    } catch (error) {
      console.error("Erro get-clients:", error);
      return [];
    }
  });

  ipcMain.handle("save-client", async (_event, client: Client) => {
    try {
      return await clientesRepo.save(client);
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("delete-client", async (_event, id: number) => {
    try {
      return await clientesRepo.deleteIfNoDebt(id);
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("get-client-debts", async (_event, clienteId: number): Promise<Debt[]> => {
    try {
      return await clientesRepo.getDebts(clienteId);
    } catch (error) {
      return [];
    }
  });

  ipcMain.handle("pay-debt", async (_event, { contaId, valorPago }: { contaId: number, valorPago: number }) => {
    try {
      return await clientesRepo.payDebt(contaId, valorPago);
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });
}
