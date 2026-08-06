import { describe, it, expect } from "vitest";
import {
  TENANT_FIELD_MAP,
  TENANT_CONFIG_KEYS,
  buildTenantResponse,
  parseTenantResponse,
} from "../../packages/shared/domain/tenant.js";

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
    // todas as chaves de identidade presentes
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
