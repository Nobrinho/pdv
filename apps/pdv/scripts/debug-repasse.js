/**
 * debug-repasse.js — Amostragem do cálculo de mão de obra por colaborador.
 *
 * Compara, para um colaborador (trocador) e um período, os dois números que
 * hoje divergem nas telas:
 *   - "Total Pago (Saída)" na tela SERVIÇOS  → soma dos serviços avulsos,
 *     porém a tela soma só a PÁGINA atual (limit 100).
 *   - "Repasse Mão de Obra" na tela RELATÓRIOS → serviços avulsos (TODOS) +
 *     mão de obra lançada dentro de VENDAS (venda.mao_de_obra).
 *
 * Uso (a partir de apps/pdv):
 *   node scripts/debug-repasse.js "CRISTIAN" 2026-08-02 2026-08-08
 *   node scripts/debug-repasse.js                 # usa CRISTIAN e a semana atual
 *
 * Opcional: DB=/caminho/para/syscontrol.sqlite3 node scripts/debug-repasse.js ...
 */
const path = require("path");

const DB_FILE =
  process.env.DB || path.join(__dirname, "..", "syscontrol.sqlite3");

const knex = require("knex")({
  client: "better-sqlite3",
  connection: { filename: DB_FILE },
  useNullAsDefault: true,
});

// ---- Argumentos ----
const nome = (process.argv[2] || "CRISTIAN").trim();
const startArg = process.argv[3]; // YYYY-MM-DD
const endArg = process.argv[4]; // YYYY-MM-DD

// Reproduz buildDateRangeTimestamps (startOf('day')/endOf('day') no fuso local).
function startOfDay(ymd) {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d, 0, 0, 0, 0).getTime();
}
function endOfDay(ymd) {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d, 23, 59, 59, 999).getTime();
}
function weekDefault() {
  // Semana começando no domingo (padrão do dayjs sem locale), como as telas.
  const now = new Date();
  const dow = now.getDay(); // 0=domingo
  const start = new Date(now);
  start.setDate(now.getDate() - dow);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  const fmt = (dt) =>
    `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(
      dt.getDate(),
    ).padStart(2, "0")}`;
  return { s: fmt(start), e: fmt(end) };
}

const wd = weekDefault();
const startYmd = startArg || wd.s;
const endYmd = endArg || wd.e;
const startTs = startOfDay(startYmd);
const endTs = endOfDay(endYmd);

const brl = (n) =>
  `R$ ${Number(n || 0).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const isCancelled = (v) => v === true || v === 1;

(async () => {
  console.log("=".repeat(64));
  console.log("DEBUG REPASSE MÃO DE OBRA");
  console.log("Banco :", DB_FILE);
  console.log("Colab :", nome);
  console.log(
    `Período: ${startYmd} → ${endYmd}  (ts ${startTs} … ${endTs})`,
  );
  console.log("=".repeat(64));

  // 1) Resolver o(s) colaborador(es) pelo nome.
  const pessoas = await knex("pessoas")
    .whereRaw("UPPER(nome) LIKE ?", [`%${nome.toUpperCase()}%`])
    .select("id", "nome", "cargo_id");
  if (pessoas.length === 0) {
    console.log(`\n⚠ Nenhuma pessoa encontrada com nome ~ "${nome}".`);
    await knex.destroy();
    return;
  }
  console.log("\nColaborador(es) encontrados:");
  pessoas.forEach((p) => console.log(`  • id=${p.id}  ${p.nome}`));
  const ids = pessoas.map((p) => p.id);

  // 2) SERVIÇOS AVULSOS no período para esse(s) id(s).
  const servicos = await knex("servicos_avulsos")
    .whereIn("trocador_id", ids)
    .andWhere("data_servico", ">=", startTs)
    .andWhere("data_servico", "<=", endTs)
    .orderBy("data_servico", "desc")
    .select("id", "valor", "data_servico", "descricao");

  const servTotalCount = servicos.length;
  const servTotalSum = servicos.reduce((a, s) => a + Number(s.valor || 0), 0);
  const PAGE = 100;
  const servFirstPage = servicos.slice(0, PAGE); // a tela ordena data_servico desc
  const servPageSum = servFirstPage.reduce((a, s) => a + Number(s.valor || 0), 0);

  // 3) MÃO DE OBRA dentro de VENDAS (não canceladas) no período.
  const vendas = await knex("vendas")
    .whereIn("trocador_id", ids)
    .andWhere("data_venda", ">=", startTs)
    .andWhere("data_venda", "<=", endTs)
    .select("id", "mao_de_obra", "cancelada", "data_venda");
  const vendasValidas = vendas.filter((v) => !isCancelled(v.cancelada));
  const vendaMOCount = vendasValidas.filter((v) => Number(v.mao_de_obra) > 0).length;
  const vendaMOSum = vendasValidas.reduce(
    (a, v) => a + Number(v.mao_de_obra || 0),
    0,
  );

  // ---- Números reproduzidos ----
  const telaServicos = servPageSum; // "Total Pago (Saída)" (bug: só página)
  const telaServicosCorrigido = servTotalSum; // se somasse tudo
  const relatorioRepasse = servTotalSum + vendaMOSum; // "Repasse Mão de Obra"

  console.log("\n--- SERVIÇOS AVULSOS (período) ---");
  console.log(`  registros no período : ${servTotalCount}`);
  console.log(`  soma de TODOS        : ${brl(servTotalSum)}`);
  console.log(
    `  soma da 1ª página(100): ${brl(servPageSum)}  ${
      servTotalCount > PAGE ? "⟵ TELA SERVIÇOS mostra este (truncado!)" : ""
    }`,
  );
  if (servTotalCount > PAGE) {
    console.log(
      `  faltando da página   : ${brl(
        servTotalSum - servPageSum,
      )}  (${servTotalCount - PAGE} registros além do 100)`,
    );
  }

  console.log("\n--- MÃO DE OBRA EM VENDAS (período, não canceladas) ---");
  console.log(`  vendas c/ mão de obra: ${vendaMOCount}`);
  console.log(`  soma mao_de_obra     : ${brl(vendaMOSum)}`);

  console.log("\n--- RECONCILIAÇÃO ---");
  console.log(`  TELA SERVIÇOS  (hoje)      = ${brl(telaServicos)}`);
  console.log(`  TELA SERVIÇOS  (corrigida) = ${brl(telaServicosCorrigido)}`);
  console.log(`  RELATÓRIOS repasse         = ${brl(relatorioRepasse)}`);
  console.log(
    `    = serviços(todos) ${brl(servTotalSum)} + mão de obra em vendas ${brl(
      vendaMOSum,
    )}`,
  );
  console.log("\n  Diferença Relatórios − Serviços(tela):",
    brl(relatorioRepasse - telaServicos));
  console.log("    ├─ por PAGINAÇÃO (serviços além do 100):",
    brl(servTotalSum - servPageSum));
  console.log("    └─ por ESCOPO (mão de obra em vendas):",
    brl(vendaMOSum));

  // ---- Amostra ----
  console.log("\n--- AMOSTRA (5 serviços mais recentes) ---");
  servicos.slice(0, 5).forEach((s) =>
    console.log(
      `  #${s.id}  ${new Date(s.data_servico).toLocaleString("pt-BR")}  ${brl(
        s.valor,
      )}  ${s.descricao || ""}`,
    ),
  );
  if (vendasValidas.length) {
    console.log("\n--- AMOSTRA (5 vendas c/ mão de obra) ---");
    vendasValidas
      .filter((v) => Number(v.mao_de_obra) > 0)
      .slice(0, 5)
      .forEach((v) =>
        console.log(
          `  venda #${v.id}  ${new Date(v.data_venda).toLocaleString(
            "pt-BR",
          )}  MO ${brl(v.mao_de_obra)}`,
        ),
      );
  }

  console.log("\n" + "=".repeat(64));
  await knex.destroy();
})().catch(async (e) => {
  console.error("Erro:", e.message);
  try {
    await knex.destroy();
  } catch {}
  process.exit(1);
});
