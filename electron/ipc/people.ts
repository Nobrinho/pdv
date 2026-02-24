import { ipcMain } from "electron";
import { knex } from "../database/knex";

export function registerPeopleHandlers() {
  ipcMain.handle("get-people", async () => {
    try {
      return await knex("pessoas")
        .leftJoin("cargos", "pessoas.cargo_id", "cargos.id")
        .where("pessoas.ativo", true)
        .select("pessoas.*", "cargos.nome as cargo_nome");
    } catch (error) {
      return [];
    }
  });

  ipcMain.handle("save-person", async (_event, person: any) => {
    try {
      if (person.id) {
        await knex("pessoas").where("id", person.id).update(person);
        return { id: person.id, success: true };
      } else {
        const [id] = await knex("pessoas").insert({ ...person, ativo: true });
        return { id, success: true };
      }
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("delete-person", async (_event, id: number) => {
    try {
      await knex("pessoas").where("id", id).update({ ativo: false });
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("get-roles", async () => await knex("cargos").select("*"));
  
  ipcMain.handle("save-role", async (_e, nome: string) => {
    const [id] = await knex("cargos").insert({ nome });
    return { success: true, id };
  });
  
  ipcMain.handle("delete-role", async (_e, id: number) => {
    await knex("cargos").where("id", id).del();
    return { success: true };
  });
}
