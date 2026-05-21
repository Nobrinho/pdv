import { describe, expect, it } from "vitest";
import { stringifyPayload, truncateText } from "../../apps/pdv/electron/lib/eventLogger.js";

describe("eventLogger", () => {
  it("limita textos longos para evitar crescimento excessivo do banco", () => {
    const text = "a".repeat(600);
    const truncated = truncateText(text);

    expect(truncated.length).toBe(503);
    expect(truncated.endsWith("...")).toBe(true);
  });

  it("limita payload serializado", () => {
    const payload = { data: "x".repeat(20_000) };
    const serialized = stringifyPayload(payload);

    expect(serialized.length).toBe(10_003);
    expect(serialized.endsWith("...")).toBe(true);
  });

  it("trata payload circular sem quebrar gravacao de evento", () => {
    const payload = {};
    payload.self = payload;

    expect(stringifyPayload(payload)).toBe('{"error":"payload_not_serializable"}');
  });
});
