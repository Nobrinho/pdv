import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { api } from "../services/api";

function ensureElement(element) {
  if (!element) {
    throw new Error("Documento do orcamento nao encontrado.");
  }
}

function dataUrlToBase64(dataUrl) {
  return String(dataUrl).split(",")[1] || "";
}

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let index = 0; index < bytes.byteLength; index += 1) {
    binary += String.fromCharCode(bytes[index]);
  }
  return window.btoa(binary);
}

async function captureBudgetCanvas(element) {
  ensureElement(element);
  return html2canvas(element, {
    scale: 2,
    backgroundColor: "#ffffff",
    useCORS: true,
  });
}

export async function exportBudgetAsImage(element, fileName) {
  const canvas = await captureBudgetCanvas(element);
  const result = await api.system.saveGeneratedFile({
    defaultPath: `${fileName}.png`,
    filters: [{ name: "Imagem PNG", extensions: ["png"] }],
    dataBase64: dataUrlToBase64(canvas.toDataURL("image/png")),
  });

  if (!result?.success) {
    throw new Error(result?.error || "Nao foi possivel salvar a imagem do orcamento.");
  }

  return result;
}

export async function exportBudgetAsPdf(element, fileName) {
  const canvas = await captureBudgetCanvas(element);
  const imageData = canvas.toDataURL("image/png");
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 8;
  const imageWidth = pageWidth - margin * 2;
  const imageHeight = (canvas.height * imageWidth) / canvas.width;

  let renderedHeight = imageHeight;
  let positionY = margin;
  let remainingHeight = imageHeight;

  pdf.addImage(imageData, "PNG", margin, positionY, imageWidth, imageHeight);
  remainingHeight -= pageHeight - margin * 2;

  while (remainingHeight > 0) {
    pdf.addPage();
    renderedHeight -= pageHeight - margin * 2;
    pdf.addImage(imageData, "PNG", margin, margin - renderedHeight, imageWidth, imageHeight);
    remainingHeight -= pageHeight - margin * 2;
  }

  const pdfBase64 = arrayBufferToBase64(pdf.output("arraybuffer"));
  const result = await api.system.saveGeneratedFile({
    defaultPath: `${fileName}.pdf`,
    filters: [{ name: "PDF", extensions: ["pdf"] }],
    dataBase64: pdfBase64,
  });

  if (!result?.success) {
    throw new Error(result?.error || "Nao foi possivel salvar o PDF do orcamento.");
  }

  return result;
}
