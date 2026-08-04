// =============================================================
// reportsService.js - Relatorio de vendas agregado no servidor.
// Replica a matematica do hook useReportData (faturamento, custo,
// mao de obra, acrescimos, descontos, comissoes, lucro), alem de
// resumos por forma de pagamento e por responsavel de mao de obra.
// =============================================================
const { listSales } = require("./salesService");
const { listServices } = require("./serviceService");

function standardizeMethod(method) {
  if (!method) return "Outros";
  const upper = String(method).toUpperCase().trim();
  if (upper === "PIX") return "Pix";
  if (upper === "DINHEIRO") return "Dinheiro";
  if (upper.includes("CREDITO") || upper.includes("CRÉDITO")) return "Crédito";
  if (upper.includes("DEBITO") || upper.includes("DÉBITO")) return "Débito";
  if (upper.includes("FIADO")) return "Fiado";
  if (upper.includes("MULTIPLOS") || upper.includes("MÚLTIPLOS")) return "Múltiplos";
  return method.charAt(0).toUpperCase() + method.slice(1).toLowerCase();
}

async function getSalesReport(knex, lojaId, filters = {}) {
  const selectedPayment = filters.payment && filters.payment !== "all" ? standardizeMethod(filters.payment) : "all";
  const selectedSeller = filters.sellerId && filters.sellerId !== "all" ? Number(filters.sellerId) : "all";

  const [salesRaw, servicesRaw] = await Promise.all([
    listSales(knex, lojaId, { startDate: filters.startDate, endDate: filters.endDate }),
    listServices(knex, lojaId, { startDate: filters.startDate, endDate: filters.endDate }),
  ]);
  const sales = Array.isArray(salesRaw) ? salesRaw : salesRaw?.data || [];
  const services = Array.isArray(servicesRaw) ? servicesRaw : servicesRaw?.data || [];

  const salesFiltered = sales.filter((venda) => {
    const bySeller = selectedSeller === "all" || Number(venda.vendedor_id) === selectedSeller;
    let byPayment = selectedPayment === "all" || standardizeMethod(venda.forma_pagamento) === selectedPayment;
    if (!byPayment && Array.isArray(venda.lista_pagamentos)) {
      byPayment = venda.lista_pagamentos.some((p) => standardizeMethod(p.metodo) === selectedPayment);
    }
    return bySeller && byPayment;
  });

  let faturamento = 0;
  let custo = 0;
  let maoDeObra = 0;
  let acrescimos = 0;
  let descontos = 0;
  let comissoes = 0;
  const paymentMap = {};
  const laborMap = {};

  const addPayment = (metodoRaw, valor) => {
    const metodo = standardizeMethod(metodoRaw);
    paymentMap[metodo] = (paymentMap[metodo] || 0) + valor;
  };

  const filteredSales = salesFiltered.map((venda) => {
    const subtotal = Number(venda.subtotal) || 0;
    const desconto = Number(venda.desconto_valor) || 0;
    const acrescimo = Number(venda.acrescimo) || 0;
    const valorFinalProdutos = subtotal - desconto;
    const receitaLoja = valorFinalProdutos + acrescimo;
    const custoReal = Number(venda.custo_total_real) || 0;
    const comissao = Number(venda.comissao_real) || 0;
    const moVenda = Number(venda.mao_de_obra) || 0;

    if (!venda.cancelada) {
      let valorConsiderado = receitaLoja;
      if (selectedPayment === "all") {
        if (Array.isArray(venda.lista_pagamentos) && venda.lista_pagamentos.length) {
          venda.lista_pagamentos.forEach((p) => addPayment(p.metodo, Number(p.valor) || 0));
        } else {
          addPayment(venda.forma_pagamento, receitaLoja);
        }
      } else {
        if (Array.isArray(venda.lista_pagamentos) && venda.lista_pagamentos.length) {
          valorConsiderado = venda.lista_pagamentos
            .filter((p) => standardizeMethod(p.metodo) === selectedPayment)
            .reduce((acc, p) => acc + (Number(p.valor) || 0), 0);
        }
        addPayment(selectedPayment, valorConsiderado);
      }

      const ratio = receitaLoja > 0 && selectedPayment !== "all" ? valorConsiderado / receitaLoja : 1;
      faturamento += valorConsiderado;
      custo += custoReal * ratio;
      maoDeObra += moVenda * ratio;
      acrescimos += acrescimo * ratio;
      descontos += desconto * ratio;
      comissoes += comissao * ratio;

      if (moVenda > 0 && venda.trocador_id) {
        if (!laborMap[venda.trocador_id]) {
          laborMap[venda.trocador_id] = { nome: venda.trocador_nome, total: 0, qtd: 0 };
        }
        laborMap[venda.trocador_id].total += moVenda;
        laborMap[venda.trocador_id].qtd += 1;
      }
    }

    return { ...venda, comissao_calculada: comissao };
  });

  services.forEach((serv) => {
    const valor = Number(serv.valor) || 0;
    maoDeObra += valor;
    if (serv.trocador_id) {
      if (!laborMap[serv.trocador_id]) {
        laborMap[serv.trocador_id] = { nome: serv.trocador_nome || "Desconhecido", total: 0, qtd: 0 };
      }
      laborMap[serv.trocador_id].total += valor;
      laborMap[serv.trocador_id].qtd += 1;
    }
  });

  const paymentSummary = Object.entries(paymentMap)
    .map(([metodo, valor]) => ({ metodo, valor }))
    .sort((a, b) => b.valor - a.valor);

  const round = (n) => Number(n.toFixed(2));

  return {
    success: true,
    report: {
      filters: { startDate: filters.startDate || null, endDate: filters.endDate || null, sellerId: selectedSeller, payment: selectedPayment },
      metrics: {
        faturamento: round(faturamento),
        custo: round(custo),
        maoDeObra: round(maoDeObra),
        acrescimos: round(acrescimos),
        descontos: round(descontos),
        comissoes: round(comissoes),
        lucro: round(faturamento - (custo + comissoes)),
      },
      laborSummary: Object.values(laborMap),
      paymentSummary,
      sales: filteredSales,
      totals: { vendas: salesFiltered.length, servicos: services.length },
    },
  };
}

module.exports = { getSalesReport, standardizeMethod };
