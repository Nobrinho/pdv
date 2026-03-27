import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "../../electron/services/auth.js";
import crypto from "crypto";

describe("hashPassword", () => {
  it("retorna hash e salt", () => {
    const result = hashPassword("minhaSenha123");

    expect(result).toHaveProperty("hash");
    expect(result).toHaveProperty("salt");
    expect(result.hash).toHaveLength(128);
    expect(result.salt).toHaveLength(32);
  });

  it("gera hashes diferentes para mesma senha (salt aleatório)", () => {
    const r1 = hashPassword("minhaSenha123");
    const r2 = hashPassword("minhaSenha123");

    expect(r1.hash).not.toBe(r2.hash);
    expect(r1.salt).not.toBe(r2.salt);
  });
});

describe("verifyPassword", () => {
  it("verifica senha correta com iterações novas", () => {
    const { salt, hash } = hashPassword("senhaCorreta");

    const result = verifyPassword("senhaCorreta", salt, hash);

    expect(result.valid).toBe(true);
    expect(result.needsRehash).toBe(false);
  });

  it("rejeita senha incorreta", () => {
    const { salt, hash } = hashPassword("senhaCorreta");

    const result = verifyPassword("senhaErrada", salt, hash);

    expect(result.valid).toBe(false);
    expect(result.needsRehash).toBe(false);
  });

  it("detecta hash legado e sinaliza re-hash", () => {
    const salt = crypto.randomBytes(16).toString("hex");
    const legacyHash = crypto
      .pbkdf2Sync("senhaLegada", salt, 1000, 64, "sha512")
      .toString("hex");

    const result = verifyPassword("senhaLegada", salt, legacyHash);

    expect(result.valid).toBe(true);
    expect(result.needsRehash).toBe(true);
  });
});
