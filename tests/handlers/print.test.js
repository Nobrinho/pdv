import { describe, expect, it } from "vitest";
import { sanitizeReceiptHtml } from "../../electron/handlers/print.js";

describe("Print handler", () => {
  it("remove scripts, iframes e handlers inline do HTML do recibo", () => {
    const unsafe = `
      <div onclick="alert(1)">
        Recibo
        <script>alert("x")</script>
        <iframe src="https://example.com"></iframe>
        <object data="x"></object>
        <embed src="x">
        <link rel="stylesheet" href="x.css">
        <meta http-equiv="refresh" content="0">
        <a href="javascript:alert(1)">link</a>
        <img src=x onerror=alert(1)>
      </div>
    `;

    const safe = sanitizeReceiptHtml(unsafe);

    expect(safe).toContain("Recibo");
    expect(safe).not.toMatch(/<script/i);
    expect(safe).not.toMatch(/<iframe/i);
    expect(safe).not.toMatch(/<object/i);
    expect(safe).not.toMatch(/<embed/i);
    expect(safe).not.toMatch(/<link/i);
    expect(safe).not.toMatch(/<meta/i);
    expect(safe).not.toMatch(/onclick/i);
    expect(safe).not.toMatch(/onerror/i);
    expect(safe).not.toMatch(/javascript:/i);
  });
});
