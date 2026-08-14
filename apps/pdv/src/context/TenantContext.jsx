// =============================================================
// TenantContext.jsx — Contexto global de identidade da loja
// =============================================================
// Marca fixa SysControl (sem white-label): as cores/tema são fixas do design
// system (styles/tokens.css). O contexto expõe apenas os dados da loja que ainda
// fazem sentido — nome, contato e documento (recibos) e a logo (impressa no
// recibo). Não há mais injeção de cor/tema por loja em runtime.
// =============================================================
import React, { createContext, useState, useContext, useEffect, useCallback, useMemo } from "react";
import { api } from "../services/api";
// Versão ESM do contrato (o frontend/Vite não faz interop de CJS de fonte).
import { TENANT_FIELD_MAP, parseTenantResponse } from "../../../../packages/shared/domain/tenant.mjs";

// --- Defaults ---
const DEFAULT_TENANT = {
  nome: "Minha Loja",
  subtitulo: "Terminal de Vendas",
  endereco: "",
  cidade: "",
  telefone: "",
  documento: "",
  logoBase64: "",
  devNome: "",
  devLink: "",
};

// --- Cache de identidade (branding) ---
// No web, antes do login não há sessão para buscar a identidade da loja, então
// a marca "sumia" ao atualizar a tela. Guardamos a última identidade carregada
// no localStorage e reidratamos o login a partir dela (igual ao Electron, que
// lê do banco local). No Electron o cache é inofensivo (o load local prevalece).
const BRAND_CACHE_KEY = "syscontrol.brand";

function readBrandCache() {
  try {
    const raw = localStorage.getItem(BRAND_CACHE_KEY);
    if (!raw) return null;
    return { ...DEFAULT_TENANT, ...JSON.parse(raw) };
  } catch {
    return null;
  }
}

function writeBrandCache(tenant) {
  try {
    localStorage.setItem(BRAND_CACHE_KEY, JSON.stringify(tenant));
  } catch {
    /* localStorage indisponível/cheio — ignora silenciosamente */
  }
}

const TenantContext = createContext(null);

export const useTenant = () => {
  const ctx = useContext(TenantContext);
  if (!ctx) throw new Error("useTenant deve ser usado dentro de <TenantProvider>");
  return ctx;
};

/**
 * Núcleo da conversão térmica: recebe um <img> já carregado, redimensiona
 * para max 200px de largura e aplica preto/branco de alto contraste.
 * Retorna base64 PNG.
 */
function _thermalizeImage(img) {
  const MAX_WIDTH = 200;
  const scale = Math.min(1, MAX_WIDTH / img.width);
  const w = Math.round(img.width * scale);
  const h = Math.round(img.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");

  // Fundo branco
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);

  // Converter para escala de cinza com alto contraste (P&B puro)
  const imageData = ctx.getImageData(0, 0, w, h);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    const gray = Math.round(data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114);
    const bw = gray > 128 ? 255 : 0;
    data[i] = bw;
    data[i + 1] = bw;
    data[i + 2] = bw;
  }
  ctx.putImageData(imageData, 0, 0);

  return canvas.toDataURL("image/png", 0.8);
}

/**
 * Processa um arquivo de imagem para uso em impressoras térmicas (P&B, 200px).
 * Retorna uma Promise<string> com a imagem em base64.
 */
export function processLogoForThermal(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => resolve(_thermalizeImage(img));
      img.onerror = () => reject(new Error("Falha ao processar imagem"));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error("Falha ao ler arquivo"));
    reader.readAsDataURL(file);
  });
}

/**
 * Converte uma logo já em base64 (colorida) para a versão térmica P&B.
 * Usado na hora de imprimir o recibo, mantendo a versão colorida na tela.
 * Retorna Promise<string> (base64 P&B) — string vazia se não houver logo.
 */
export function thermalizeLogoBase64(base64) {
  return new Promise((resolve, reject) => {
    if (!base64) return resolve("");
    const img = new Image();
    img.onload = () => {
      try {
        resolve(_thermalizeImage(img));
      } catch (err) {
        reject(err);
      }
    };
    img.onerror = () => reject(new Error("Falha ao processar logo"));
    img.src = base64;
  });
}

/**
 * Recebe um elemento DOM do recibo e devolve o seu outerHTML com TODAS as
 * imagens data:image convertidas para P&B térmico. Usado para impressão do
 * recibo, preservando o colorido na tela e no compartilhamento.
 */
export async function thermalizeReceiptHtml(element) {
  if (!element) return "";
  let html = element.outerHTML;
  const imgs = element.querySelectorAll("img");
  for (const img of imgs) {
    const src = img.getAttribute("src");
    if (src && src.startsWith("data:image")) {
      try {
        const bw = await thermalizeLogoBase64(src);
        if (bw) html = html.split(src).join(bw);
      } catch {
        /* mantém a original se falhar */
      }
    }
  }
  return html;
}

/**
 * Processa um arquivo de logo para exibição (tela + compartilhamento),
 * PRESERVANDO as cores. Redimensiona para max 400px e exporta PNG
 * (mantém transparência). Retorna Promise<string> base64.
 */
export function processLogoForWeb(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const MAX_WIDTH = 400;
        const scale = Math.min(1, MAX_WIDTH / img.width);
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);

        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, w, h);

        resolve(canvas.toDataURL("image/png"));
      };
      img.onerror = () => reject(new Error("Falha ao processar imagem"));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error("Falha ao ler arquivo"));
    reader.readAsDataURL(file);
  });
}

export const TenantProvider = ({ children }) => {
  // Reidrata da última identidade conhecida (persiste no web após refresh).
  const [tenant, setTenant] = useState(() => readBrandCache() || DEFAULT_TENANT);
  const [loading, setLoading] = useState(true);

  // Aplica o título da marca em cache imediatamente no boot, antes de qualquer
  // carregamento de rede, para o login já nascer com a identidade.
  useEffect(() => {
    if (tenant.nome) document.title = tenant.nome;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadTenant = useCallback(async () => {
    try {
      const raw = await api.config.getTenant();
      if (raw) {
        // Contrato único (packages/shared): converte a resposta snake_case
        // para o tenant camelCase usado pela UI.
        const mapped = parseTenantResponse(raw);
        setTenant(mapped);
        writeBrandCache(mapped);
        document.title = mapped.nome;
      }
    } catch (err) {
      console.error("Erro ao carregar config de tenant:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTenant();
  }, [loadTenant]);

  /** Atualiza uma chave do tenant e persiste no banco */
  const updateTenant = useCallback(async (key, value) => {
    // Mapeia chave do frontend para chave do banco (contrato compartilhado)
    const dbKey = TENANT_FIELD_MAP[key];
    if (!dbKey) return;

    await api.config.save(dbKey, value);
    setTenant((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "nome") {
        document.title = value;
      }
      writeBrandCache(next);
      return next;
    });
  }, []);

  /** Salva múltiplas chaves do tenant de uma vez */
  const saveTenantBatch = useCallback(async (updates) => {
    const promises = Object.entries(updates).map(([key, value]) => {
      const dbKey = TENANT_FIELD_MAP[key];
      if (dbKey) return api.config.save(dbKey, value);
      return Promise.resolve();
    });

    await Promise.all(promises);

    setTenant((prev) => {
      const next = { ...prev, ...updates };
      if (updates.nome) document.title = updates.nome;
      writeBrandCache(next);
      return next;
    });
  }, []);

  const value = useMemo(() => ({
    tenant,
    loading,
    updateTenant,
    saveTenantBatch,
    reloadTenant: loadTenant,
  }), [tenant, loading, updateTenant, saveTenantBatch, loadTenant]);

  return (
    <TenantContext.Provider value={value}>
      {children}
    </TenantContext.Provider>
  );
};

export default TenantContext;
