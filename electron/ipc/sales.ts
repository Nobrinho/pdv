import { ipcMain } from "electron";
import { VendasRepository } from "../database/repositories/VendasRepository";
import { Sale, SaleItem } from "../../src/types";

const vendasRepo = new VendasRepository();

export function registerSalesHandlers() {
  ipcMain.handle("create-sale", async (_event, saleData: any) => {
    try {
      return await vendasRepo.createFullSale(saleData);
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("get-sales", async (): Promise<Sale[]> => {
    try {
      return await vendasRepo.getAllDetailed();
    } catch (error) {
      console.error("Erro get-sales:", error);
      return [];
    }
  });

  ipcMain.handle("get-sale-items", async (_e, id: number): Promise<SaleItem[]> => {
    try {
      return await vendasRepo.getSaleItems(id);
    } catch (error) {
      console.error("Erro get-sale-items:", error);
      return [];
    }
  });

  ipcMain.handle("cancel-sale", async (_event, { vendaId, motivo }: { vendaId: number, motivo: string }) => {
    try {
      return await vendasRepo.cancelSale(vendaId, motivo);
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });
}
