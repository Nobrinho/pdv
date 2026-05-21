import { describe, expect, it } from "vitest";
import {
  findSavedClient,
  findSelectedClient,
  getSalesPeopleByRole,
} from "../../apps/pdv/src/utils/salesViewModel";

describe("salesViewModel", () => {
  it("separa vendedores e trocadores por cargo", () => {
    const people = [
      { id: 1, cargo_nome: "Vendedor", nome: "Ana" },
      { id: 2, cargo_nome: "Trocador", nome: "Beto" },
      { id: 3, cargo_nome: "Outro", nome: "Caio" },
    ];

    const result = getSalesPeopleByRole(people);

    expect(result.sellers).toEqual([{ id: 1, cargo_nome: "Vendedor", nome: "Ana" }]);
    expect(result.mechanics).toEqual([{ id: 2, cargo_nome: "Trocador", nome: "Beto" }]);
  });

  it("encontra cliente selecionado com comparacao flexivel de id", () => {
    const clients = [
      { id: 1, nome: "Maria" },
      { id: 2, nome: "Joao" },
    ];

    expect(findSelectedClient(clients, "2")).toEqual({ id: 2, nome: "Joao" });
  });

  it("encontra cliente salvo por id do resultado", () => {
    const clients = [
      { id: 1, nome: "Maria", documento: "123" },
      { id: 2, nome: "Joao", documento: "456" },
    ];

    expect(findSavedClient(clients, 2, "999")).toEqual({ id: 2, nome: "Joao", documento: "456" });
  });

  it("encontra cliente salvo por documento quando id nao bate", () => {
    const clients = [
      { id: 1, nome: "Maria", documento: "123" },
      { id: 2, nome: "Joao", documento: "456" },
    ];

    expect(findSavedClient(clients, 9, "123")).toEqual({ id: 1, nome: "Maria", documento: "123" });
  });
});
