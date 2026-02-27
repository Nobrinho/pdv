import { ipcMain } from "electron";
import { PessoasRepository } from "../database/repositories/PessoasRepository";

const pessoasRepo = new PessoasRepository();

export function registerPeopleHandlers() {
  ipcMain.handle("get-people", async () => {
    try {
      return await pessoasRepo.getActive();
    } catch (error) {
      return [];
    }
  });

  ipcMain.handle("save-person", async (_event, person: any) => {
    try {
      await pessoasRepo.save(person);
      return { id: person.id, success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("delete-person", async (_event, id: number) => {
    try {
      await pessoasRepo.delete(id);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("get-roles", async () => {
    return await pessoasRepo.getRoles();
  });
  
  ipcMain.handle("save-role", async (_e, nome: string) => {
    try {
      const [id] = await pessoasRepo.saveRole(nome);
      return { success: true, id };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });
  
  ipcMain.handle("delete-role", async (_e, id: number) => {
    try {
      await pessoasRepo.deleteRole(id);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });
}
