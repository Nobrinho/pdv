import React from "react";
import { Icon } from "./Icon";

/**
 * Estado vazio ilustrado (ícone em disco + título + mensagem opcional + ação).
 * Aceita nome Lucide (kebab) ou um nome FontAwesome legado (`fa-...`), que é
 * mapeado para o Lucide equivalente — assim os call sites antigos seguem valendo.
 */

// FontAwesome legado → Lucide (só os usados em estados vazios; resto cai em inbox).
const FA_TO_LUCIDE = {
  "fa-inbox": "inbox",
  "fa-box-open": "package-open",
  "fa-box": "package",
  "fa-clipboard-list": "clipboard-list",
  "fa-receipt": "receipt",
  "fa-tag": "tag",
  "fa-tags": "tags",
  "fa-search": "search",
  "fa-users": "users",
  "fa-user-friends": "users-round",
  "fa-wrench": "wrench",
  "fa-file-alt": "file-text",
  "fa-file-invoice-dollar": "receipt",
  "fa-hand-holding-usd": "hand-coins",
  "fa-history": "history",
};

function resolveName(icon) {
  if (!icon) return "inbox";
  if (icon.startsWith("fa-")) return FA_TO_LUCIDE[icon] || "inbox";
  return icon; // já é um nome Lucide
}

const EmptyState = ({
  icon = "inbox",
  title = "Nada por aqui ainda",
  message = "",
  action = null,
  className = "",
}) => (
  <div className={`flex flex-col items-center justify-center gap-3 px-6 py-16 text-center ${className}`}>
    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--content2)]">
      <Icon name={resolveName(icon)} size={26} className="text-[var(--icon-muted)]" />
    </div>
    <div>
      <p className="text-[17px] font-semibold text-[var(--foreground)]" style={{ textWrap: "pretty" }}>{title}</p>
      {message && <p className="mx-auto mt-1 max-w-xs text-sm text-[var(--muted-foreground)]" style={{ textWrap: "pretty" }}>{message}</p>}
    </div>
    {action}
  </div>
);

export default EmptyState;
