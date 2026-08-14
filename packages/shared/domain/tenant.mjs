// =============================================================
// Versão ESM do contrato de tenant — consumida pelo FRONTEND (Vite/Rollup),
// que não faz interop de módulos CommonJS de fonte.
// O conteúdo é idêntico ao tenant.js (CommonJS, usado por Node/Electron).
// Um teste (tests/shared/tenant.test.js) garante a paridade entre os dois.
// =============================================================

export const TENANT_FIELD_MAP = {
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

export const TENANT_CONFIG_KEYS = Object.values(TENANT_FIELD_MAP);

export const TENANT_DEFAULTS = {
  nome: "Minha Loja",
  subtitulo: "Terminal de Vendas",
  corPrimaria: "#2563EB",
  corSecundaria: "#4F46E5",
};

export function buildTenantResponse(configMap = {}) {
  const out = {};
  for (const key of TENANT_CONFIG_KEYS) {
    out[key] = configMap[key] != null ? configMap[key] : "";
  }
  out.loja_nome = configMap.loja_nome || TENANT_DEFAULTS.nome;
  out.loja_subtitulo = configMap.loja_subtitulo || TENANT_DEFAULTS.subtitulo;
  return out;
}

export function parseTenantResponse(raw = {}) {
  const tenant = {};
  for (const [field, key] of Object.entries(TENANT_FIELD_MAP)) {
    tenant[field] = raw[key] || "";
  }
  tenant.nome = raw.loja_nome || TENANT_DEFAULTS.nome;
  tenant.subtitulo = raw.loja_subtitulo || TENANT_DEFAULTS.subtitulo;
  tenant.corPrimaria = raw.cor_primaria || TENANT_DEFAULTS.corPrimaria;
  tenant.corSecundaria = raw.cor_secundaria || TENANT_DEFAULTS.corSecundaria;
  return tenant;
}
