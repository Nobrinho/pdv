import { ipcMain } from "electron";
import { knex } from "../database/knex";

export function registerServiceHandlers() {
  ipcMain.handle("get-services", async () => {
    return await knex("servicos_avulsos")
      .leftJoin("pessoas", "servicos_avulsos.trocador_id", "pessoas.id")
      .select("servicos_avulsos.*", "pessoas.nome as trocador_nome")
      .orderBy("data_servico", "desc");
  });

  ipcMain.handle("create-service", async (_e, data: any) => {
    const [id] = await knex("servicos_avulsos").insert({
      ...data,
      data_servico: new Date(),
    });
    return { success: true, id };
  });
}
