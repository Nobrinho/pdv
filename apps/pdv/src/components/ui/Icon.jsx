import React from "react";
import { icons } from "lucide-react";

/**
 * Icon — wrapper do design system sobre o Lucide.
 *
 * Aceita o nome no formato **kebab-case** exatamente como o handoff do design
 * (`layout-dashboard`, `shopping-cart`, `chevrons-up-down`, `trash-2`...), então
 * a tradução do protótipo é literal.
 *
 * A cor sai do `currentColor` — basta aplicar `text-[var(--primary)]` (ou
 * qualquer classe de cor) no próprio Icon ou num ancestral.
 *
 * Props:
 * - name: nome do ícone Lucide em kebab-case (obrigatório)
 * - size: tamanho em px (default 20)
 * - strokeWidth: espessura do traço (default 2)
 * - className: classes extras (cor, margem, etc.)
 * Demais props nativas do SVG são repassadas.
 */

const cache = new Map();
function resolve(name) {
  if (cache.has(name)) return cache.get(name);
  const pascal = String(name || "")
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join("");
  const Cmp = icons[pascal] || icons.HelpCircle;
  cache.set(name, Cmp);
  return Cmp;
}

export function Icon({ name, size = 20, strokeWidth = 2, className = "", ...props }) {
  const Cmp = resolve(name);
  return (
    <Cmp
      size={size}
      strokeWidth={strokeWidth}
      className={className}
      aria-hidden={props["aria-label"] ? undefined : true}
      {...props}
    />
  );
}

export default Icon;
