import { describe, expect, it } from "vitest";
import { createAuthSession, requireAdmin } from "../../electron/lib/authSession.js";

const eventFor = (id) => ({ sender: { id } });

const knexWithUserCount = (total) => () => ({
  count: () => ({
    first: async () => ({ total }),
  }),
});

describe("authSession", () => {
  it("mantem sessoes separadas por sender", () => {
    const session = createAuthSession();
    const adminEvent = eventFor(1);
    const cashierEvent = eventFor(2);

    session.setUser(adminEvent, { id: 1, cargo: "admin" });
    session.setUser(cashierEvent, { id: 2, cargo: "caixa" });

    expect(session.isAdmin(adminEvent)).toBe(true);
    expect(session.isAdmin(cashierEvent)).toBe(false);
  });

  it("permite bootstrap quando ainda nao existem usuarios", async () => {
    const session = createAuthSession();
    const result = await requireAdmin(eventFor(1), knexWithUserCount(0), session, {
      allowBootstrap: true,
    });

    expect(result).toBeNull();
  });

  it("bloqueia acao admin sem sessao admin apos bootstrap", async () => {
    const session = createAuthSession();
    const result = await requireAdmin(eventFor(1), knexWithUserCount(1), session, {
      allowBootstrap: true,
    });

    expect(result).toEqual({
      success: false,
      error: "Permissao de administrador necessaria.",
    });
  });

  it("permite acao admin com sessao admin", async () => {
    const session = createAuthSession();
    const event = eventFor(1);
    session.setUser(event, { id: 1, cargo: "admin" });

    const result = await requireAdmin(event, knexWithUserCount(1), session);

    expect(result).toBeNull();
  });

  it("permite acao admin com autorizacao temporaria de supervisor", async () => {
    const session = createAuthSession();
    const event = eventFor(1);
    session.setUser(event, { id: 2, cargo: "caixa" });
    session.grantAdmin(event, 60_000);

    const result = await requireAdmin(event, knexWithUserCount(1), session);

    expect(result).toBeNull();
  });

  it("mantem usuario original apos autorizacao temporaria", () => {
    const session = createAuthSession();
    const event = eventFor(1);
    session.setUser(event, { id: 2, cargo: "caixa" });
    session.grantAdmin(event, 60_000);

    expect(session.getUser(event)).toEqual({ id: 2, cargo: "caixa" });
    expect(session.isAdmin(event)).toBe(true);
  });

  it("expira autorizacao temporaria de supervisor", async () => {
    const session = createAuthSession();
    const event = eventFor(1);
    session.setUser(event, { id: 2, cargo: "caixa" });
    session.grantAdmin(event, -1);

    const result = await requireAdmin(event, knexWithUserCount(1), session);

    expect(result).toEqual({
      success: false,
      error: "Permissao de administrador necessaria.",
    });
  });

  it("bloqueia acao admin sem excecao de bootstrap", async () => {
    const session = createAuthSession();
    const result = await requireAdmin(eventFor(1), knexWithUserCount(0), session);

    expect(result).toEqual({
      success: false,
      error: "Permissao de administrador necessaria.",
    });
  });
});
