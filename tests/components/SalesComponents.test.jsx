import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import SaleCartPanel from "../../apps/pdv/src/components/sales/SaleCartPanel.jsx";
import SaleEntryBar from "../../apps/pdv/src/components/sales/SaleEntryBar.jsx";
import QuickClientModal from "../../apps/pdv/src/components/sales/QuickClientModal.jsx";
import SaleReceiptModal from "../../apps/pdv/src/components/sales/SaleReceiptModal.jsx";

vi.mock("../../apps/pdv/src/components/CupomFiscal", () => ({
  default: ({ sale }) => <div>Cupom {sale.id}</div>,
}));

describe("SaleEntryBar", () => {
  it("encaminha busca de cliente e selecoes de cliente/produto", () => {
    const onClientSearchTermChange = vi.fn();
    const onClearSelectedClient = vi.fn();
    const onShowClientResultsChange = vi.fn();
    const onSelectClient = vi.fn();
    const onSelectProduct = vi.fn();

    render(
      <SaleEntryBar
        selectedSeller=""
        onSellerChange={vi.fn()}
        sellers={[{ id: 1, nome: "Ana" }]}
        selectedClient="1"
        clientSearchTerm="Maria"
        onClientSearchTermChange={onClientSearchTermChange}
        onClearSelectedClient={onClearSelectedClient}
        showClientResults={true}
        onShowClientResultsChange={onShowClientResultsChange}
        clients={[{ id: 1, nome: "Maria" }]}
        filteredClients={[{ id: 2, nome: "Carlos" }]}
        onSelectClient={onSelectClient}
        onOpenClientModal={vi.fn()}
        searchTerm=""
        onSearchTermChange={vi.fn()}
        onSearchKeyDown={vi.fn()}
        searchResults={[{ id: 9, descricao: "Pneu 17", codigo: "P17", preco_venda: 10, estoque_atual: 2 }]}
        onSelectProduct={onSelectProduct}
      />,
    );

    fireEvent.change(screen.getByDisplayValue("Maria"), { target: { value: "Mar" } });
    fireEvent.click(screen.getByText("Carlos"));
    fireEvent.click(screen.getByText("Pneu 17"));

    expect(onClientSearchTermChange).toHaveBeenCalledWith("Mar");
    expect(onClearSelectedClient).toHaveBeenCalled();
    expect(onShowClientResultsChange).toHaveBeenCalledWith(true);
    expect(onSelectClient).toHaveBeenCalledWith({ id: 2, nome: "Carlos" });
    expect(onSelectProduct).toHaveBeenCalledWith({
      id: 9,
      descricao: "Pneu 17",
      codigo: "P17",
      preco_venda: 10,
      estoque_atual: 2,
    });
  });
});

describe("SaleCartPanel", () => {
  it("exibe estado vazio do carrinho", () => {
    render(
      <SaleCartPanel
        cart={[]}
        totals={{ subtotal: 0 }}
        onQuantityChange={vi.fn()}
        onRemoveItem={vi.fn()}
      />,
    );

    expect(screen.getByText("Carrinho Vazio")).toBeInTheDocument();
  });

  it("encaminha alteracao de quantidade e remocao", () => {
    const onQuantityChange = vi.fn();
    const onRemoveItem = vi.fn();

    render(
      <SaleCartPanel
        cart={[{ id: 1, descricao: "Pneu", qty: 2, preco_venda: 50 }]}
        totals={{ subtotal: 100 }}
        onQuantityChange={onQuantityChange}
        onRemoveItem={onRemoveItem}
      />,
    );

    fireEvent.change(screen.getByDisplayValue("2"), { target: { value: "3" } });
    fireEvent.click(screen.getByRole("button"));

    expect(onQuantityChange).toHaveBeenCalledWith(1, "3");
    expect(onRemoveItem).toHaveBeenCalledWith(1);
  });
});

describe("QuickClientModal", () => {
  it("encaminha alteracoes de campos e fechamento", () => {
    const onClientFieldChange = vi.fn();
    const onClose = vi.fn();
    const onSubmit = vi.fn((event) => event.preventDefault());

    render(
      <QuickClientModal
        newClientData={{ nome: "", documento: "", telefone: "", endereco: "" }}
        onClientFieldChange={onClientFieldChange}
        onClose={onClose}
        onSubmit={onSubmit}
      />,
    );

    const inputs = screen.getAllByRole("textbox");
    fireEvent.change(inputs[0], { target: { value: "Maria" } });
    fireEvent.change(inputs[1], { target: { value: "123" } });
    fireEvent.change(inputs[2], { target: { value: "9999" } });
    fireEvent.click(screen.getByText("Cancelar"));
    fireEvent.submit(screen.getByRole("button", { name: "Salvar e Selecionar" }).closest("form"));

    expect(onClientFieldChange).toHaveBeenCalledWith("nome", "Maria");
    expect(onClientFieldChange).toHaveBeenCalledWith("documento", "123");
    expect(onClientFieldChange).toHaveBeenCalledWith("telefone", "9999");
    expect(onClose).toHaveBeenCalled();
    expect(onSubmit).toHaveBeenCalled();
  });
});

describe("SaleReceiptModal", () => {
  it("permite imprimir e fechar quando nao esta imprimindo", () => {
    const onPrint = vi.fn();
    const onClose = vi.fn();

    render(
      <SaleReceiptModal
        lastSale={{
          id: 1,
          data_venda: new Date("2026-01-01T12:00:00Z"),
          vendedor_nome: "Ana",
          itens: [{ id: 1, descricao: "Pneu", qty: 1, preco_venda: 10 }],
          total_final: 10,
          subtotal: 10,
          desconto_valor: 0,
          acrescimo_valor: 0,
          mao_de_obra: 0,
          pagamentos: [{ metodo: "Dinheiro", valor: 10 }],
        }}
        onPrint={onPrint}
        onClose={onClose}
      />,
    );

    fireEvent.click(screen.getByText("Imprimir"));
    fireEvent.click(screen.getByText("Fechar"));

    expect(onPrint).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });
});
