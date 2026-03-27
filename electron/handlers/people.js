/**
 * Handlers de Pessoas e Cargos
 */
function register(safeHandle, knex) {
  safeHandle("get-people", async () => {
    return await knex("pessoas")
      .leftJoin("cargos", "pessoas.cargo_id", "cargos.id")
      .where("pessoas.ativo", true)
      .select("pessoas.*", "cargos.nome as cargo_nome");
  });

  safeHandle("save-person", async (event, person) => {
    if (person.id) {
      await knex("pessoas").where("id", person.id).update(person);
      return { id: person.id, success: true };
    } else {
      const [id] = await knex("pessoas").insert({ ...person, ativo: true });
      return { id, success: true };
    }
  });

  safeHandle("delete-person", async (event, id) => {
    await knex("pessoas").where("id", id).update({ ativo: false });
    return { success: true };
  });

  safeHandle("get-roles", async () => {
    return await knex("cargos").select("*");
  });

  safeHandle("save-role", async (event, nome) => {
    const [id] = await knex("cargos").insert({ nome });
    return { success: true, id };
  });

  safeHandle("delete-role", async (event, id) => {
    await knex("cargos").where("id", id).del();
    return { success: true };
  });
}

module.exports = { register };
