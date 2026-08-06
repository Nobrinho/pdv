// =============================================================
// whatsapp.js - Monta o recibo em texto e abre o WhatsApp (wa.me).
// =============================================================
import dayjs from "dayjs";

const toNumber = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const brl = (value) => `R$ ${toNumber(value).toFixed(2).replace(".", ",")}`;

// Normaliza para o formato do wa.me: so digitos, com DDI (Brasil = 55).
export function normalizePhone(phone, ddi = "55") {
  const digits = String(phone || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith(ddi) && digits.length >= 12) return digits;
  // 10 (fixo) ou 11 (celular) digitos -> adiciona o DDI.
  if (digits.length === 10 || digits.length === 11) return ddi + digits;
  return digits;
}

// Monta a mensagem de texto do recibo.
export function buildReceiptMessage(sale, items = [], tenant = {}) {
  const linhas = [];
  linhas.push(`*${tenant?.nome || "Recibo"}*`);
  linhas.push(`Recibo de venda #${sale?.id ?? ""}`);
  linhas.push(dayjs(sale?.data_venda || new Date()).format("DD/MM/YYYY HH:mm"));
  linhas.push("");

  (items || []).forEach((item) => {
    const qty = toNumber(item.qty ?? item.quantidade);
    const unit = toNumber(item.preco_venda ?? item.preco_unitario);
    const desc = item.descricao || "Produto";
    linhas.push(`${qty}x ${desc} — ${brl(qty * unit)}`);
  });

  linhas.push("");
  const subtotal = toNumber(sale?.subtotal);
  const acrescimo = toNumber(sale?.acrescimo_valor ?? sale?.acrescimo);
  const desconto = toNumber(sale?.desconto_valor);
  if (subtotal) linhas.push(`Subtotal: ${brl(subtotal)}`);
  if (acrescimo > 0) linhas.push(`Acréscimo: +${brl(acrescimo)}`);
  if (desconto > 0) linhas.push(`Desconto: -${brl(desconto)}`);
  linhas.push(`*TOTAL: ${brl(sale?.total_final)}*`);

  const pagamentos = sale?.lista_pagamentos || sale?.pagamentos || [];
  if (pagamentos.length) {
    linhas.push("");
    linhas.push(`Pagamento: ${pagamentos.map((p) => p.metodo).join(", ")}`);
  } else if (sale?.forma_pagamento) {
    linhas.push("");
    linhas.push(`Pagamento: ${sale.forma_pagamento}`);
  }

  linhas.push("");
  linhas.push("Obrigado pela preferência!");
  return linhas.join("\n");
}

// Abre o WhatsApp com a mensagem pronta (texto). Fallback quando nao da
// para compartilhar a imagem. Se houver telefone, vai direto pra conversa.
export function sendReceiptWhatsapp(sale, items, tenant) {
  const text = buildReceiptMessage(sale, items, tenant);
  const clienteTel = sale?.cliente?.telefone || sale?.cliente_telefone || "";
  const phone = normalizePhone(clienteTel);
  const encoded = encodeURIComponent(text);
  const url = phone
    ? `https://wa.me/${phone}?text=${encoded}`
    : `https://wa.me/?text=${encoded}`;

  if (typeof window !== "undefined") window.open(url, "_blank", "noopener,noreferrer");
  return { url, hasPhone: !!phone };
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Captura o recibo como IMAGEM (PNG) e abre a tela nativa de compartilhamento
// (Web Share API) para o usuario escolher o app (WhatsApp, etc.).
// Fallbacks: baixa a imagem + abre o WhatsApp em texto quando o navegador
// nao suporta compartilhar arquivos.
export async function shareReceiptImage(element, sale, tenant) {
  if (!element || typeof window === "undefined") {
    return sendReceiptWhatsapp(sale, sale?.itens, tenant);
  }
  try {
    const html2canvas = (await import("html2canvas")).default;
    const canvas = await html2canvas(element, {
      scale: 2,
      backgroundColor: "#ffffff",
      useCORS: true,
      logging: false,
    });
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
    if (!blob) throw new Error("Falha ao gerar a imagem.");

    const file = new File([blob], `recibo-${sale?.id || "venda"}.png`, { type: "image/png" });
    const caption = `${tenant?.nome || "Recibo"} — Recibo de venda #${sale?.id ?? ""}`;

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: `Recibo #${sale?.id ?? ""}`, text: caption });
      return { shared: true, mode: "image" };
    }

    // Sem suporte a compartilhar arquivo (ex.: desktop): baixa a imagem e abre o WhatsApp em texto.
    downloadBlob(blob, file.name);
    sendReceiptWhatsapp(sale, sale?.itens, tenant);
    return { shared: false, mode: "download+text" };
  } catch (error) {
    if (error && error.name === "AbortError") return { shared: false, canceled: true };
    // Qualquer falha na captura -> fallback para o texto.
    sendReceiptWhatsapp(sale, sale?.itens, tenant);
    return { shared: false, mode: "text", error: error?.message };
  }
}
