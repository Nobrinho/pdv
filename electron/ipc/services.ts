import { ipcMain } from "electron";
import { ServicesRepository } from "../database/repositories/ServicesRepository";

const servicesRepo = new ServicesRepository();

export function registerServiceHandlers() {
  ipcMain.handle("get-services", async () => {
    try {
      return await servicesRepo.getAllDetailed();
    } catch (error) {
      console.error("Erro get-services:", error);
      return [];
    }
  });

  ipcMain.handle("create-service", async (_e, data: any) => {
    try {
      const id = await servicesRepo.create(data);
      return { success: true, id };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });
}
