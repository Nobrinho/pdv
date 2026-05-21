import { describe, expect, it } from "vitest";
import { buildOnboardingSettings } from "../../apps/pdv/src/pages/Onboarding.jsx";

describe("Onboarding - configuracoes iniciais", () => {
  it("normaliza chaves esperadas pelo TenantContext e comissoes em decimal", () => {
    const settings = buildOnboardingSettings({
      lojaNome: "Loja Teste",
      subtitulo: "Terminal",
      telefone: "(11) 99999-9999",
      documento: "12.345.678/0001-90",
      endereco: "Rua A",
      cidade: "Manaus - AM",
      lojaLogo: "data:image/png;base64,abc",
      comissaoNovos: "30",
      comissaoUsados: "25",
    });

    expect(settings).toEqual([
      { chave: "loja_nome", valor: "Loja Teste" },
      { chave: "loja_subtitulo", valor: "Terminal" },
      { chave: "loja_telefone", valor: "(11) 99999-9999" },
      { chave: "loja_documento", valor: "12.345.678/0001-90" },
      { chave: "loja_endereco", valor: "Rua A" },
      { chave: "loja_cidade", valor: "Manaus - AM" },
      { chave: "loja_logo_base64", valor: "data:image/png;base64,abc" },
      { chave: "comissao_padrao", valor: "0.3" },
      { chave: "comissao_usados", valor: "0.25" },
    ]);
  });

  it("rejeita percentuais de comissao fora do intervalo seguro", () => {
    const settings = buildOnboardingSettings({
      lojaNome: "Loja Teste",
      comissaoNovos: "101",
      comissaoUsados: "25",
    });

    expect(settings).toBeNull();
  });
});
