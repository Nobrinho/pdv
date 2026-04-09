/**
 * Handlers de Autenticação e Usuários
 */
const { hashPassword, verifyPassword } = require("../services/auth");

function register(safeHandle, knex) {
  safeHandle("check-users-exist", async () => {
    return (await knex("usuarios").count("id as total").first()).total > 0;
  });

  safeHandle("check-onboarding-status", async () => {
    const userCount = (await knex("usuarios").count("id as total").first()).total;
    const storeName = await knex("configuracoes").where("chave", "loja_nome").first();
    
    return {
      onboardingDone: userCount > 0 && !!storeName,
      hasUsers: userCount > 0,
      hasStoreConfig: !!storeName
    };
  });


  safeHandle("register-user", async (event, userData) => {
    const { salt, hash } = hashPassword(userData.password);
    const usernameTratado = userData.username.trim();

    // Verifica se o usuário já existe no banco
    const existing = await knex("usuarios").whereRaw("LOWER(username) = LOWER(?)", [usernameTratado]).first();

    if (existing) {
      if (existing.ativo === 0 || existing.ativo === false) {
        // Usuário existe mas foi excluído (soft-delete). Vamos reativá-lo com os novos dados.
        await knex("usuarios").where("id", existing.id).update({
          nome: userData.nome,
          password_hash: hash,
          salt: salt,
          cargo: userData.cargo || "admin",
          ativo: 1
        });
        return { success: true };
      } else {
        // Usuário existe e está ativo.
        return { success: false, error: "Este nome de usuário já está em uso. Escolha outro." };
      }
    }

    // Se não existe, cria um novo normalmente
    try {
      await knex("usuarios").insert({
        nome: userData.nome,
        username: usernameTratado,
        password_hash: hash,
        salt: salt,
        cargo: userData.cargo || "admin",
        ativo: 1,
      });
      return { success: true };
    } catch (error) {
       if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
         return { success: false, error: "Este nome de usuário já está em uso. Escolha outro." };
       }
       throw error;
    }
  });

  safeHandle("login-attempt", async (event, { username, password }) => {
    // Usando LOWER() para garantir que a comparação seja case-insensitive.
    const user = await knex("usuarios").whereRaw("LOWER(username) = LOWER(?)", [username.trim()]).first();
    
    if (!user || user.ativo === 0 || user.ativo === false) {
      return { success: false, error: "Usuário inválido ou inativo." };
    }

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
    // Retornar apenas usuários ativos
    return await knex("usuarios")
      .where("ativo", 1).orWhere("ativo", true)
      .select("id", "nome", "username", "cargo");
  });

  // MELHORIA: Soft delete em vez de hard delete
  safeHandle("delete-user", async (event, id) => {
    await knex("usuarios").where("id", id).update({ ativo: 0 }); // Usando 0 para garantir compatibilidade com SQLite
    return { success: true };
  });
}

module.exports = { register };
