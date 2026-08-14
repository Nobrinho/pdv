/**
 * Tiers de planos + limites de dispositivos.
 *
 * Regra de negócio (definida pelo produto):
 *   - Basico:        2 dispositivos  (antes 1)
 *   - Intermediario: 5 dispositivos
 *   - Pro:           10 dispositivos
 *   - Vitalicio:     10 dispositivos, sem cobrança (preco_mensal = 0)
 *
 * O limite é aplicado em authService.autorizarDispositivo (lê
 * planos.limite_dispositivos; limite=0 = ilimitado).
 *
 * OBS: preco_mensal de Intermediario/Pro fica 0 como PLACEHOLDER — os valores
 * reais de cobrança ainda serão definidos pelo produto. limite_usuarios abaixo
 * é uma estimativa inicial e pode ser ajustada.
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = async function (knex) {
  // Basico: passa a permitir 2 dispositivos.
  await knex("planos")
    .where("nome", "Basico")
    .update({ limite_dispositivos: 2, updated_at: knex.fn.now() });

  const tiers = [
    { nome: "Intermediario", preco_mensal: 0, limite_usuarios: 5, limite_dispositivos: 5, ativo: true },
    { nome: "Pro", preco_mensal: 0, limite_usuarios: 10, limite_dispositivos: 10, ativo: true },
    { nome: "Vitalicio", preco_mensal: 0, limite_usuarios: 10, limite_dispositivos: 10, ativo: true },
  ];

  // Upsert por nome (idempotente): cria se não existe, senão corrige os limites.
  for (const tier of tiers) {
    const existing = await knex("planos").where("nome", tier.nome).first();
    if (existing) {
      await knex("planos").where("id", existing.id).update({
        limite_usuarios: tier.limite_usuarios,
        limite_dispositivos: tier.limite_dispositivos,
        ativo: tier.ativo,
        updated_at: knex.fn.now(),
      });
    } else {
      await knex("planos").insert(tier);
    }
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  // Volta o Basico para 1 dispositivo e remove os novos tiers.
  // (lojas.plano_id tem onDelete SET NULL, então nenhuma loja quebra.)
  await knex("planos").where("nome", "Basico").update({ limite_dispositivos: 1 });
  await knex("planos").whereIn("nome", ["Intermediario", "Pro", "Vitalicio"]).del();
};
