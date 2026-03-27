/**
 * Handlers de Autenticação e Usuários
 */
const { hashPassword, verifyPassword } = require("../services/auth");

function register(safeHandle, knex) {
  safeHandle("check-users-exist", async () => {
    return (await knex("usuarios").count("id as total").first()).total > 0;
  });

  safeHandle("register-user", async (event, userData) => {
    const { salt, hash } = hashPassword(userData.password);
    await knex("usuarios").insert({
      nome: userData.nome,
      username: userData.username,
      password_hash: hash,
      salt: salt,
      cargo: userData.cargo || "admin",
      ativo: true,
    });
    return { success: true };
  });

  safeHandle("login-attempt", async (event, { username, password }) => {
    const user = await knex("usuarios").where("username", username).first();
    if (!user || !user.ativo)
      return { success: false, error: "Usuário inválido" };

    const result = verifyPassword(password, user.salt, user.password_hash);

    if (result.valid) {
      // Migração progressiva: re-hashear se necessário
      if (result.needsRehash) {
        const { salt, hash } = hashPassword(password);
        await knex("usuarios").where("id", user.id).update({
          password_hash: hash,
          salt: salt,
        });
        console.log(`🔑 Senha re-hasheada para usuário: ${user.username}`);
      }

      return {
        success: true,
        user: {
          id: user.id,
          nome: user.nome,
          username: user.username,
          cargo: user.cargo,
        },
      };
    }

    return { success: false, error: "Senha incorreta" };
  });

  safeHandle("get-users", async () => {
    return await knex("usuarios").select("id", "nome", "username", "cargo");
  });

  // MELHORIA: Soft delete em vez de hard delete
  safeHandle("delete-user", async (event, id) => {
    await knex("usuarios").where("id", id).update({ ativo: false });
    return { success: true };
  });
}

module.exports = { register };
