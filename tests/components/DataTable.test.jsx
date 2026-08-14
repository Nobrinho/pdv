import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import DataTable from "../../apps/pdv/src/components/ui/DataTable.jsx";

describe("DataTable", () => {
  it("exibe estado de erro contextual antes do estado vazio", () => {
    render(
      <DataTable
        columns={[{ key: "nome", label: "Nome" }]}
        data={[]}
        error="Falha ao carregar clientes."
        emptyMessage="Nenhum cliente encontrado."
      />,
    );

    expect(screen.getByText("Falha ao carregar clientes.")).toBeInTheDocument();
    expect(screen.queryByText("Nenhum cliente encontrado.")).not.toBeInTheDocument();
  });
});
