/**
 * Preços e limites finais dos planos (definidos pelo produto).
 *
 *   Plano          | Dispositivos | Cobrança
 *   ---------------|--------------|--------------------------------
 *   Basico         | 2            | grátis (preco_mensal = 0)
 *   Intermediario  | 5            | R$ 69,00/mês
 *   Pro            | 10           | R$ 139,00/mês
 *   Vitalicio      | 10           | licença única (preco_mensal = 0;
 *                  |              | o pagamento à vista é registrado à parte)
 *
 * Roda depois de 0009_plan_tiers (que criou os tiers com preço 0 placeholder).
 * Idempotente: faz upsert por nome, então pode rodar em banco novo ou já migrado.
 *
 * Isenção de cobrança: planos com preco_mensal = 0 (Basico e Vitalicio) ficam
 * fora do dunning — ver billingService.changeStorePlan (zera vencimento).
 *
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
const TIERS = [
  { nome: "Basico", preco_mensal: 0, limite_usuarios: 2, limite_dispositivos: 2 },
  { nome: "Intermediario", preco_mensal: 69, limite_usuarios: 5, limite_dispositivos: 5 },
  { nome: "Pro", preco_mensal: 139, limite_usuarios: 10, limite_dispositivos: 10 },
  { nome: "Vitalicio", preco_mensal: 0, limite_usuarios: 10, limite_dispositivos: 10 },
];

exports.up = async function (knex) {
  for (const tier of TIERS) {
    const existing = await knex("planos").where("nome", tier.nome).first();
    if (existing) {
      await knex("planos").where("id", existing.id).update({
        preco_mensal: tier.preco_mensal,
        limite_usuarios: tier.limite_usuarios,
        limite_dispositivos: tier.limite_dispositivos,
        ativo: true,
        updated_at: knex.fn.now(),
      });
    } else {
      await knex("planos").insert({ ...tier, ativo: true });
    }
  }
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = async function (knex) {
  // Volta Intermediario/Pro para preço 0 (placeholder). Não remove tiers nem
  // altera Basico/Vitalicio (que já eram 0).
  await knex("planos").whereIn("nome", ["Intermediario", "Pro"]).update({ preco_mensal: 0 });
};
