import React from "react";
import { Icon } from "../ui/Icon";

/**
 * Cabeçalho padrão dos cartões de Configurações (visual do handoff):
 * pastilha primary-soft + título em font-display + subtítulo opcional.
 */
const ConfigCardHeader = ({ icon, title, subtitle, actions }) => (
  <div className="flex items-center justify-between gap-3 mb-5 pb-4 border-b border-[var(--border)]">
    <div className="flex items-center gap-2.5 min-w-0">
      <span className="w-8 h-8 shrink-0 rounded-[var(--radius-md)] bg-[var(--primary-soft)] text-[var(--primary-soft-foreground)] flex items-center justify-center">
        <Icon name={icon} size={16} />
      </span>
      <div className="min-w-0">
        <h2
          className="text-sm font-semibold text-[var(--foreground)] tracking-tight truncate"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {title}
        </h2>
        {subtitle && (
          <p className="text-xs text-[var(--muted-foreground)] truncate">{subtitle}</p>
        )}
      </div>
    </div>
    {actions}
  </div>
);

export default ConfigCardHeader;
