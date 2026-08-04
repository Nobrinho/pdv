// =============================================================
// dunning.js - Rotina de cobranca. Marca assinaturas vencidas como
// past_due e bloqueia lojas apos o periodo de carencia.
// Rode diariamente via cron/agendador:  npm run server:dunning
// Carencia configuravel por BILLING_GRACE_DAYS (padrao 5).
// =============================================================
const { knex } = require("../src/db");
const { runDunning } = require("../src/services/billingService");

(async () => {
  try {
    const result = await runDunning(knex);
    console.log("[dunning]", JSON.stringify(result));
  } catch (error) {
    console.error("[dunning] falhou:", error);
    process.exitCode = 1;
  } finally {
    await knex.destroy();
  }
})();
