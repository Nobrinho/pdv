import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import UserManager from "../../src/components/config/UserManager.jsx";

describe("UserManager", () => {
  it("exibe loading da lista de usuarios", () => {
    render(
      <UserManager
        users={[]}
        loading={true}
        newUser={{ nome: "", username: "", password: "", cargo: "vendedor" }}
        onNewUserChange={vi.fn()}
        onAddUser={vi.fn()}
        onDeleteUser={vi.fn()}
        onTogglePassword={vi.fn()}
      />,
    );

    expect(screen.getByText("Carregando dados...")).toBeInTheDocument();
  });

  it("encaminha alteracoes do formulario e alternancia de senha", () => {
    const onNewUserChange = vi.fn();
    const onTogglePassword = vi.fn();

    render(
      <UserManager
        users={[]}
        loading={false}
        newUser={{ nome: "", username: "", password: "", cargo: "vendedor" }}
        onNewUserChange={onNewUserChange}
        onAddUser={vi.fn()}
        onDeleteUser={vi.fn()}
        onTogglePassword={onTogglePassword}
      />,
    );

    const inputs = screen.getAllByRole("textbox");
    fireEvent.change(inputs[0], { target: { value: "Ana" } });
    fireEvent.change(inputs[1], { target: { value: "ana" } });
    fireEvent.change(screen.getByPlaceholderText("******"), { target: { value: "1234" } });
    fireEvent.click(screen.getAllByRole("button")[0]);

    expect(onNewUserChange).toHaveBeenCalledWith({
      nome: "Ana",
      username: "",
      password: "",
      cargo: "vendedor",
    });
    expect(onNewUserChange).toHaveBeenCalledWith({
      nome: "",
      username: "ana",
      password: "",
      cargo: "vendedor",
    });
    expect(onNewUserChange).toHaveBeenCalledWith({
      nome: "",
      username: "",
      password: "1234",
      cargo: "vendedor",
    });
    expect(onTogglePassword).toHaveBeenCalled();
  });
});
