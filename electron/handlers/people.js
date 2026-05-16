/**
 * Handlers de Pessoas e Cargos
 */
function register(safeHandle, knex) {
  const sanitizePersonPayload = (person = {}, { forUpdate = false } = {}) => {
    const payload = {};
    const allowedFields = ["nome", "cargo_id", "comissao_fixa", "ativo"];

    for (const field of allowedFields) {
      if (Object.prototype.hasOwnProperty.call(person, field)) {
        payload[field] = person[field];
      }
    }

    if (!forUpdate && !Object.prototype.hasOwnProperty.call(payload, "ativo")) {
      payload.ativo = true;
    }

    return payload;
  };

  safeHandle("get-people", async () => {
    return await knex("pessoas")
      .leftJoin("cargos", "pessoas.cargo_id", "cargos.id")
      .where("pessoas.ativo", true)
      .select("pessoas.*", "cargos.nome as cargo_nome");
  });

  safeHandle("save-person", async (event, person) => {
    if (!person?.nome || !String(person.nome).trim()) {
      return { success: false, error: "Nome obrigatorio." };
    }
    const cargoId = Number(person?.cargo_id);
    if (!Number.isInteger(cargoId) || cargoId <= 0) {
      return { success: false, error: "Cargo invalido." };
    }
    if (
      person?.comissao_fixa !== null &&
      person?.comissao_fixa !== undefined &&
      person?.comissao_fixa !== "" &&
      (!Number.isFinite(Number(person.comissao_fixa)) || Number(person.comissao_fixa) < 0)
    ) {
      return { success: false, error: "Comissao invalida." };
    }

    if (person.id) {
      const payload = sanitizePersonPayload(person, { forUpdate: true });
      payload.cargo_id = cargoId;
      await knex("pessoas").where("id", person.id).update(payload);
      return { id: person.id, success: true };
    } else {
      const payload = sanitizePersonPayload(person, { forUpdate: false });
      payload.cargo_id = cargoId;
      const [id] = await knex("pessoas").insert(payload);
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
