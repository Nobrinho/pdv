import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import CupomFiscal from "../../apps/pdv/src/components/CupomFiscal";

vi.mock("../../apps/pdv/src/context/TenantContext", () => ({
  useTenant: () => ({
    tenant: {
      nome: "Loja Teste",
      endereco: "",
      cidade: "",
      telefone: "",
      documento: "",
      logoBase64: "",
    },
  }),
}));

const baseSale = {
  id: 1,
  data_venda: Date.now(),
  vendedor_nome: "Maria",
  subtotal: "100.00",
  acrescimo: "0",
  desconto_valor: "0",
  total_final: "100.00",
  forma_pagamento: "Dinheiro",
};

describe("CupomFiscal", () => {
  it("renderiza valores numericos como string sem quebrar o recibo", () => {
    render(
      <CupomFiscal
        sale={baseSale}
        items={[
          {
            quantidade: "2",
            descricao: "Produto",
            preco_unitario: "50.00",
          },
        ]}
      />,
    );

    expect(screen.getByText("R$ 100.00")).toBeInTheDocument();
    expect(screen.getAllByText("100.00").length).toBeGreaterThan(0);
    expect(screen.getByText(/2 x/)).toBeInTheDocument();
  });

  it("marca venda cancelada quando cancelada vem como boolean true", () => {
    render(
      <CupomFiscal
        sale={{ ...baseSale, cancelada: true }}
        items={[
          {
            quantidade: 1,
            descricao: "Produto",
            preco_unitario: 100,
          },
        ]}
      />,
    );

    expect(screen.getByText("VENDA CANCELADA")).toBeInTheDocument();
  });
});
