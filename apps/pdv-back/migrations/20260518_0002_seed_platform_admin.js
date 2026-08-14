const { config } = require("../src/config");
const { hashPassword } = require("../src/security/password");

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  const basicPlan = await knex("planos").where("nome", "Basico").first();
  if (!basicPlan) {
    await knex("planos").insert({
      nome: "Basico",
      preco_mensal: 0,
      limite_usuarios: 3,
      limite_dispositivos: 1,
      recursos_json: { pdv: true },
      ativo: true,
    });
  }

  const existing = await knex("platform_users")
    .whereRaw("LOWER(email) = LOWER(?)", [config.platformAdmin.email])
    .first();

  if (!existing) {
    const { salt, hash } = hashPassword(config.platformAdmin.password);
    await knex("platform_users").insert({
      nome: config.platformAdmin.name,
      email: config.platformAdmin.email,
      password_hash: hash,
      salt,
      role: "platform_admin",
      ativo: true,
    });
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function () {};
