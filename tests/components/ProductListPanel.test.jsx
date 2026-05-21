import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ProductListPanel from "../../apps/pdv/src/components/products/ProductListPanel.jsx";

describe("ProductListPanel", () => {
  const columns = [{ key: "descricao", label: "Descricao" }];

  it("prioriza erro vindo do carregamento", () => {
    render(
      <ProductListPanel
        columns={columns}
        data={[]}
        loading={false}
        error="Falha ao carregar produtos."
        emptyMessage="Nenhum produto."
      />,
    );

    expect(screen.getByText("Falha ao carregar produtos.")).toBeInTheDocument();
    expect(screen.queryByText("Nenhum produto.")).not.toBeInTheDocument();
  });

  it("exibe paginacao e encaminha navegacao", () => {
    const onPreviousPage = vi.fn();
    const onNextPage = vi.fn();

    render(
      <ProductListPanel
        columns={columns}
        data={[{ id: 1, descricao: "Pneu" }]}
        page={2}
        totalPages={3}
        totalItems={201}
        onPreviousPage={onPreviousPage}
        onNextPage={onNextPage}
      />,
    );

    fireEvent.click(screen.getByText("Anterior"));
    fireEvent.click(screen.getByText("Proximo"));

    expect(screen.getByText(/Pag 2 de 3/)).toBeInTheDocument();
    expect(onPreviousPage).toHaveBeenCalled();
    expect(onNextPage).toHaveBeenCalled();
  });
});
