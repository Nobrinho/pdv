function sanitizePersonPayload(person = {}, { forUpdate = false } = {}) {
  const payload = {};
  for (const field of ["nome", "cargo_id", "comissao_fixa", "ativo"]) {
    if (Object.prototype.hasOwnProperty.call(person, field)) payload[field] = person[field];
  }
  if (payload.nome != null) payload.nome = String(payload.nome).trim();
  if (payload.comissao_fixa === "") payload.comissao_fixa = null;
  if (!forUpdate && !Object.prototype.hasOwnProperty.call(payload, "ativo")) payload.ativo = true;
  return payload;
}

async function ensureDefaultRoles(knex, lojaId) {
  const existing = await knex("cargos").where("loja_id", lojaId).first();
  if (existing) return;
  await knex("cargos").insert([
    { loja_id: lojaId, nome: "Vendedor" },
    { loja_id: lojaId, nome: "Trocador" },
  ]);
}

async function listPeople(knex, lojaId) {
  await ensureDefaultRoles(knex, lojaId);
  return await knex("pessoas")
    .leftJoin("cargos", function () {
      this.on("pessoas.cargo_id", "=", "cargos.id").andOn("pessoas.loja_id", "=", "cargos.loja_id");
    })
    .where("pessoas.loja_id", lojaId)
    .where("pessoas.ativo", true)
    .select("pessoas.*", "cargos.nome as cargo_nome")
    .orderBy("pessoas.nome", "asc");
}

async function savePerson(knex, lojaId, person = {}) {
  if (!person?.nome || !String(person.nome).trim()) return { success: false, error: "Nome obrigatorio." };

  const cargoId = Number(person.cargo_id);
  if (!Number.isInteger(cargoId) || cargoId <= 0) return { success: false, error: "Cargo invalido." };

  const cargo = await knex("cargos").where({ id: cargoId, loja_id: lojaId }).first();
  if (!cargo) return { success: false, error: "Cargo nao encontrado." };

  if (
    person.comissao_fixa !== null &&
    person.comissao_fixa !== undefined &&
    person.comissao_fixa !== "" &&
    (!Number.isFinite(Number(person.comissao_fixa)) ||
      Number(person.comissao_fixa) < 0 ||
      Number(person.comissao_fixa) > 100)
  ) {
    return { success: false, error: "Comissao invalida." };
  }

  if (person.id) {
    const current = await knex("pessoas").where({ id: person.id, loja_id: lojaId }).first();
    if (!current) return { success: false, error: "Colaborador nao encontrado." };
    const payload = sanitizePersonPayload(person, { forUpdate: true });
    payload.cargo_id = cargoId;
    payload.updated_at = knex.fn.now();
    await knex("pessoas").where({ id: person.id, loja_id: lojaId }).update(payload);
    return { success: true, id: person.id };
  }

  const payload = sanitizePersonPayload(person);
  payload.cargo_id = cargoId;
  const [created] = await knex("pessoas").insert({ loja_id: lojaId, ...payload }).returning(["id"]);
  return { success: true, id: created.id };
}

async function deletePerson(knex, lojaId, id) {
  const updated = await knex("pessoas")
    .where({ id, loja_id: lojaId })
    .update({ ativo: false, updated_at: knex.fn.now() });
  if (!updated) return { success: false, error: "Colaborador nao encontrado." };
  return { success: true };
}

async function listRoles(knex, lojaId) {
  await ensureDefaultRoles(knex, lojaId);
  return await knex("cargos").where("loja_id", lojaId).orderBy("nome", "asc");
}

async function saveRole(knex, lojaId, nome) {
  const cleanName = String(nome || "").trim();
  if (!cleanName) return { success: false, error: "Nome do cargo obrigatorio." };

  const existing = await knex("cargos")
    .where("loja_id", lojaId)
    .whereRaw("LOWER(nome) = LOWER(?)", [cleanName])
    .first();
  if (existing) return { success: false, error: "Cargo ja cadastrado." };

  const [created] = await knex("cargos").insert({ loja_id: lojaId, nome: cleanName }).returning(["id"]);
  return { success: true, id: created.id };
}

async function deleteRole(knex, lojaId, id) {
  const peopleUsingRole = await knex("pessoas").where({ loja_id: lojaId, cargo_id: id }).first();
  if (peopleUsingRole) return { success: false, error: "Cargo em uso por colaboradores." };

  const deleted = await knex("cargos").where({ id, loja_id: lojaId }).del();
  if (!deleted) return { success: false, error: "Cargo nao encontrado." };
  return { success: true };
}

module.exports = { listPeople, savePerson, deletePerson, listRoles, saveRole, deleteRole };
