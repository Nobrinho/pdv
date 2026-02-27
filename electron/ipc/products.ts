import { ipcMain } from "electron";
import { ProdutosRepository } from "../database/repositories/ProdutosRepository";
import { Product, ProductHistory } from "../../src/types";

const produtosRepo = new ProdutosRepository();

export function registerProductHandlers() {
  ipcMain.handle("get-products", async (): Promise<Product[]> => {
    try {
      return await produtosRepo.getActive();
    } catch (error) {
      console.error(error);
      return [];
    }
  });

  ipcMain.handle("save-product", async (_event, product: Product) => {
    try {
      return await produtosRepo.saveWithHistory(product);
    } catch (error: any) {
      if (error.code === "SQLITE_CONSTRAINT_UNIQUE")
        return { success: false, error: "Código já existe." };
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("delete-product", async (_event, id: number) => {
    try {
      await produtosRepo.delete(id);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("get-product-history", async (): Promise<ProductHistory[]> => {
    try {
      return await produtosRepo.getHistory() as any;
    } catch (error) {
      return [];
    }
  });
}
