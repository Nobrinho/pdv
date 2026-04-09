// =============================================================
// TenantContext.jsx — Contexto global de identidade da loja
// =============================================================
// Carrega configurações white-label do banco e injeta CSS vars
// dinâmicas para cores em toda a interface.
// =============================================================
import React, { createContext, useState, useContext, useEffect, useCallback, useMemo } from "react";
import { api } from "../services/api";

// --- Utilitários de cores ---

/** Converte hex (#RRGGBB) para componentes HSL */
function hexToHSL(hex) {
  let r = parseInt(hex.slice(1, 3), 16) / 255;
  let g = parseInt(hex.slice(3, 5), 16) / 255;
  let b = parseInt(hex.slice(5, 7), 16) / 255;

  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

/** HSL para R G B nativo (para suportar opacidade do Tailwind) */
function hslToRgbValues(h, s, l) {
  s /= 100; l /= 100;
  const k = n => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return `${Math.round(255 * f(0))} ${Math.round(255 * f(8))} ${Math.round(255 * f(4))}`;
}

function hexToRgbValues(hex) {
  let r = parseInt(hex.slice(1, 3), 16);
  let g = parseInt(hex.slice(3, 5), 16);
  let b = parseInt(hex.slice(5, 7), 16);
  return `${r} ${g} ${b}`;
}

/** Gera uma palette completa a partir de uma cor hex, retornando apenas valores RGB */
function generatePalette(hex) {
  try {
    const { h, s } = hexToHSL(hex);
    return {
      50:  hslToRgbValues(h, s, 97),
      100: hslToRgbValues(h, s, 93),
      200: hslToRgbValues(h, s, 85),
      300: hslToRgbValues(h, s, 73),
      400: hslToRgbValues(h, s, 60),
      500: hslToRgbValues(h, s, 50),
      600: hexToRgbValues(hex),
      700: hslToRgbValues(h, s, 38),
      800: hslToRgbValues(h, s, 28),
      900: hslToRgbValues(h, s, 18),
    };
  } catch {
    return null;
  }
}

/** Injeta CSS custom properties no :root */
function injectCSSVars(primary, secondary) {
  const root = document.documentElement;
  const primaryPalette = generatePalette(primary);
  const secondaryPalette = generatePalette(secondary);

  if (primaryPalette) {
    Object.entries(primaryPalette).forEach(([shade, value]) => {
      root.style.setProperty(`--color-primary-${shade}`, value);
    });
    // Fallback/Legacy
    root.style.setProperty("--color-primary", primary);
  }

  if (secondaryPalette) {
    Object.entries(secondaryPalette).forEach(([shade, value]) => {
      root.style.setProperty(`--color-secondary-${shade}`, value);
    });
    root.style.setProperty("--color-secondary", secondary);
  }
}

// --- Defaults ---
const DEFAULT_TENANT = {
  nome: "Minha Loja",
  subtitulo: "Terminal de Vendas",
  endereco: "",
  cidade: "",
  telefone: "",
  documento: "",
  logoBase64: "",
  bgBase64: "",
  corPrimaria: "#2563EB",
  corSecundaria: "#4F46E5",
  devNome: "",
  devLink: "",
};

const TenantContext = createContext(null);

export const useTenant = () => {
  const ctx = useContext(TenantContext);
  if (!ctx) throw new Error("useTenant deve ser usado dentro de <TenantProvider>");
  return ctx;
};

/**
 * Processa uma imagem para uso em impressoras térmicas.
 * - Redimensiona para max 200px de largura (padrão 58/80mm)
 * - Converte para escala de cinza com alto contraste
 * - Comprime como JPEG com qualidade otimizada
 * Retorna uma Promise<string> com a imagem em base64.
 */
export function processLogoForThermal(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
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

        // Converter para escala de cinza com alto contraste
        const imageData = ctx.getImageData(0, 0, w, h);
        const data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
          // Luminância ponderada
          const gray = Math.round(data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114);
          // Alto contraste: threshold para preto/branco puro
          const bw = gray > 128 ? 255 : 0;
          data[i] = bw;
          data[i + 1] = bw;
          data[i + 2] = bw;
        }
        ctx.putImageData(imageData, 0, 0);

        // Exportar como PNG (melhor para P&B do que JPEG)
        const base64 = canvas.toDataURL("image/png", 0.8);
        resolve(base64);
      };
      img.onerror = () => reject(new Error("Falha ao processar imagem"));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error("Falha ao ler arquivo"));
    reader.readAsDataURL(file);
  });
}

/**
 * Processa uma imagem de background para o login.
 * - Redimensiona para max 1920px de largura
 * - Mantém cores originais
 * - Comprime como JPEG com qualidade média (economizar espaço no SQLite)
 */
export function processBackgroundImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const MAX_WIDTH = 1920;
        const scale = Math.min(1, MAX_WIDTH / img.width);
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);

        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, w, h);

        const base64 = canvas.toDataURL("image/jpeg", 0.7);
        resolve(base64);
      };
      img.onerror = () => reject(new Error("Falha ao processar imagem"));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error("Falha ao ler arquivo"));
    reader.readAsDataURL(file);
  });
}

export const TenantProvider = ({ children }) => {
  const [tenant, setTenant] = useState(DEFAULT_TENANT);
  const [loading, setLoading] = useState(true);

  const loadTenant = useCallback(async () => {
    try {
      const raw = await api.config.getTenant();
      if (raw) {
        const mapped = {
          nome: raw.loja_nome || DEFAULT_TENANT.nome,
          subtitulo: raw.loja_subtitulo || DEFAULT_TENANT.subtitulo,
          endereco: raw.loja_endereco || "",
          cidade: raw.loja_cidade || "",
          telefone: raw.loja_telefone || "",
          documento: raw.loja_documento || "",
          logoBase64: raw.loja_logo_base64 || "",
          bgBase64: raw.loja_bg_base64 || "",
          corPrimaria: raw.cor_primaria || DEFAULT_TENANT.corPrimaria,
          corSecundaria: raw.cor_secundaria || DEFAULT_TENANT.corSecundaria,
          devNome: raw.dev_nome || "",
          devLink: raw.dev_link || "",
        };
        setTenant(mapped);
        injectCSSVars(mapped.corPrimaria, mapped.corSecundaria);
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
    // Mapeia chave do frontend para chave do banco
    const keyMap = {
      nome: "loja_nome",
      subtitulo: "loja_subtitulo",
      endereco: "loja_endereco",
      cidade: "loja_cidade",
      telefone: "loja_telefone",
      documento: "loja_documento",
      logoBase64: "loja_logo_base64",
      bgBase64: "loja_bg_base64",
      corPrimaria: "cor_primaria",
      corSecundaria: "cor_secundaria",
      devNome: "dev_nome",
      devLink: "dev_link",
    };
    const dbKey = keyMap[key];
    if (!dbKey) return;

    await api.config.save(dbKey, value);
    setTenant((prev) => {
      const next = { ...prev, [key]: value };
      // Re-injetar cores se mudou
      if (key === "corPrimaria" || key === "corSecundaria") {
        injectCSSVars(next.corPrimaria, next.corSecundaria);
      }
      if (key === "nome") {
        document.title = value;
      }
      return next;
    });
  }, []);

  /** Salva múltiplas chaves do tenant de uma vez */
  const saveTenantBatch = useCallback(async (updates) => {
    const keyMap = {
      nome: "loja_nome",
      subtitulo: "loja_subtitulo",
      endereco: "loja_endereco",
      cidade: "loja_cidade",
      telefone: "loja_telefone",
      documento: "loja_documento",
      logoBase64: "loja_logo_base64",
      bgBase64: "loja_bg_base64",
      corPrimaria: "cor_primaria",
      corSecundaria: "cor_secundaria",
      devNome: "dev_nome",
      devLink: "dev_link",
    };

    const promises = Object.entries(updates).map(([key, value]) => {
      const dbKey = keyMap[key];
      if (dbKey) return api.config.save(dbKey, value);
      return Promise.resolve();
    });

    await Promise.all(promises);

    setTenant((prev) => {
      const next = { ...prev, ...updates };
      injectCSSVars(next.corPrimaria, next.corSecundaria);
      if (updates.nome) document.title = updates.nome;
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
