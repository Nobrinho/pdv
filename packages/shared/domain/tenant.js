// =============================================================
// Contrato da identidade da loja (tenant / white-label).
// Fonte única de verdade para o formato dos dados de identidade,
// usado por:
//   - backend  (apps/pdv-back)  -> resposta de GET /tenant
//   - electron (apps/pdv)       -> IPC get-tenant-config
//   - frontend (apps/pdv)       -> TenantContext (leitura e escrita)
//
// Antes cada lado tinha sua própria versão do mapeamento, o que causava
// divergências (ex.: backend devolvendo camelCase e o front lendo snake_case).
// Manter tudo aqui garante que os três concordem.
// =============================================================

// Campo (camelCase, usado na UI) -> chave persistida (snake_case, tabela `configuracoes`).
const TENANT_FIELD_MAP = {
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

// Lista das chaves de config que compõem a identidade (snake_case).
const TENANT_CONFIG_KEYS = Object.values(TENANT_FIELD_MAP);

const TENANT_DEFAULTS = {
  nome: "Minha Loja",
  subtitulo: "Terminal de Vendas",
  corPrimaria: "#2563EB",
  corSecundaria: "#4F46E5",
};

/**
 * A partir de um mapa cru { chave: valor } da tabela `configuracoes`, devolve o
 * objeto de RESPOSTA em snake_case — o "contrato" que o endpoint /tenant e o IPC
 * get-tenant-config entregam ao frontend. Garante todas as chaves e os defaults.
 */
function buildTenantResponse(configMap = {}) {
  const out = {};
  for (const key of TENANT_CONFIG_KEYS) {
    out[key] = configMap[key] != null ? configMap[key] : "";
  }
  out.loja_nome = configMap.loja_nome || TENANT_DEFAULTS.nome;
  out.loja_subtitulo = configMap.loja_subtitulo || TENANT_DEFAULTS.subtitulo;
  return out;
}

/**
 * A partir da resposta snake_case (raw), devolve o tenant em camelCase para a UI.
 * É o inverso de buildTenantResponse.
 */
function parseTenantResponse(raw = {}) {
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

module.exports = {
  TENANT_FIELD_MAP,
  TENANT_CONFIG_KEYS,
  TENANT_DEFAULTS,
  buildTenantResponse,
  parseTenantResponse,
};
