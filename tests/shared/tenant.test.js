import { describe, it, expect } from "vitest";
import { createRequire } from "module";
import {
  TENANT_FIELD_MAP,
  TENANT_CONFIG_KEYS,
  TENANT_DEFAULTS,
  buildTenantResponse,
  parseTenantResponse,
} from "../../packages/shared/domain/tenant.mjs";

// O lado CommonJS (Node/Electron) é carregado via require para comparar paridade.
const require = createRequire(import.meta.url);
const cjs = require("../../packages/shared/domain/tenant.js");

describe("contrato de tenant (packages/shared)", () => {
  it("mapeia todos os campos camelCase -> snake_case", () => {
    expect(TENANT_FIELD_MAP.nome).toBe("loja_nome");
    expect(TENANT_FIELD_MAP.logoBase64).toBe("loja_logo_base64");
    expect(TENANT_FIELD_MAP.corPrimaria).toBe("cor_primaria");
    expect(TENANT_FIELD_MAP.devNome).toBe("dev_nome");
    expect(TENANT_CONFIG_KEYS).toContain("loja_bg_base64");
  });

  it("buildTenantResponse devolve snake_case com defaults e todas as chaves", () => {
    const resp = buildTenantResponse({ cor_primaria: "#111" });
    expect(resp.loja_nome).toBe("Minha Loja");
    expect(resp.loja_subtitulo).toBe("Terminal de Vendas");
    expect(resp.cor_primaria).toBe("#111");
    for (const key of TENANT_CONFIG_KEYS) {
      expect(resp).toHaveProperty(key);
    }
  });

  it("parseTenantResponse é o inverso e preenche defaults de cor/nome", () => {
    const parsed = parseTenantResponse({
      loja_nome: "Loja X",
      dev_nome: "@dev",
      loja_logo_base64: "data:img",
    });
    expect(parsed.nome).toBe("Loja X");
    expect(parsed.devNome).toBe("@dev");
    expect(parsed.logoBase64).toBe("data:img");
    expect(parsed.corPrimaria).toBe("#2563EB");
  });

  it("roundtrip build -> parse preserva os dados", () => {
    const original = {
      loja_nome: "Auto Peças",
      loja_telefone: "1199999",
      cor_primaria: "#abc123",
      cor_secundaria: "#654321",
      dev_link: "https://x",
    };
    const parsed = parseTenantResponse(buildTenantResponse(original));
    expect(parsed.nome).toBe("Auto Peças");
    expect(parsed.telefone).toBe("1199999");
    expect(parsed.corPrimaria).toBe("#abc123");
    expect(parsed.corSecundaria).toBe("#654321");
    expect(parsed.devLink).toBe("https://x");
  });
});

describe("paridade CommonJS x ESM", () => {
  it("tenant.js (CJS) e tenant.mjs (ESM) têm o mesmo mapa e defaults", () => {
    expect(cjs.TENANT_FIELD_MAP).toEqual(TENANT_FIELD_MAP);
    expect(cjs.TENANT_DEFAULTS).toEqual(TENANT_DEFAULTS);
  });

  it("as duas versões produzem o mesmo resultado", () => {
    const map = { loja_nome: "Y", cor_primaria: "#123", dev_nome: "@x" };
    expect(cjs.buildTenantResponse(map)).toEqual(buildTenantResponse(map));
    const raw = { loja_nome: "Y", cor_primaria: "#123", dev_link: "z" };
    expect(cjs.parseTenantResponse(raw)).toEqual(parseTenantResponse(raw));
  });
});
