/**
 * Handlers de Pessoas e Cargos
 */
const { requirePerm } = require("../lib/authSession");

function register(safeHandle, knex, authSession) {
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
    const authError = await requirePerm(event, knex, authSession, "config.users");
    if (authError) return authError;

    if (!person?.nome || !String(person.nome).trim()) {
      return { success: false, error: "Nome obrigatorio." };
    }
    const cargoId = Number(person?.cargo_id);
    if (!Number.isInteger(cargoId) || cargoId <= 0) {
      return { success: false, error: "Cargo invalido." };
    }
    const cargo = await knex("cargos").where("id", cargoId).first();
    if (!cargo) {
      return { success: false, error: "Cargo nao encontrado." };
    }
    if (
      person?.comissao_fixa !== null &&
      person?.comissao_fixa !== undefined &&
      person?.comissao_fixa !== "" &&
      (
        !Number.isFinite(Number(person.comissao_fixa)) ||
        Number(person.comissao_fixa) < 0 ||
        Number(person.comissao_fixa) > 100
      )
    ) {
      return { success: false, error: "Comissao invalida." };
    }

    if (person.id) {
      const current = await knex("pessoas").where("id", person.id).first();
      if (!current) {
        return { success: false, error: "Colaborador nao encontrado." };
      }
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
    const authError = await requirePerm(event, knex, authSession, "config.users");
    if (authError) return authError;

    const updated = await knex("pessoas").where("id", id).update({ ativo: false });
    if (!updated) {
      return { success: false, error: "Colaborador nao encontrado." };
    }
    return { success: true };
  });

  safeHandle("get-roles", async () => {
    return await knex("cargos").select("*");
  });

  safeHandle("save-role", async (event, nome) => {
    const authError = await requirePerm(event, knex, authSession, "config.users");
    if (authError) return authError;

    const cleanName = String(nome || "").trim();
    if (!cleanName) {
      return { success: false, error: "Nome do cargo obrigatorio." };
    }

    const existing = await knex("cargos").whereRaw("LOWER(nome) = LOWER(?)", [cleanName]).first();
    if (existing) {
      return { success: false, error: "Cargo ja cadastrado." };
    }

    const [id] = await knex("cargos").insert({ nome: cleanName });
    return { success: true, id };
  });

  safeHandle("delete-role", async (event, id) => {
    const authError = await requirePerm(event, knex, authSession, "config.users");
    if (authError) return authError;

    const peopleUsingRole = await knex("pessoas").where("cargo_id", id).first();
    if (peopleUsingRole) {
      return { success: false, error: "Cargo em uso por colaboradores." };
    }

    const deleted = await knex("cargos").where("id", id).del();
    if (!deleted) {
      return { success: false, error: "Cargo nao encontrado." };
    }
    return { success: true };
  });
}

module.exports = { register };
