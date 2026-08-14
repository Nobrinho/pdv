// =============================================================
// StatCard.jsx — Card de KPI/Métrica (anatomia do design: caption + valor mono).
// =============================================================
import React from "react";
import { formatCurrency } from "../../utils/format";
import { Icon, faToLucide } from "./Icon";

const MONO = { fontFamily: "var(--font-mono)", fontVariantNumeric: "tabular-nums", letterSpacing: "-0.02em" };

// Cor semântica do valor/ícone por "color" legado.
const TONE = {
  blue: "var(--primary)",
  green: "var(--money-positive)",
  red: "var(--money-negative)",
  yellow: "var(--warning-icon)",
  orange: "var(--warning-icon)",
  purple: "var(--primary)",
  gray: "var(--foreground)",
};

const StatCard = ({
  title,
  value,
  color = "blue",
  icon,
  tooltip,
  isCurrency = true,
  format,
  className = "",
}) => {
  const tone = TONE[color] || TONE.blue;
  const displayValue = format ? format(value) : isCurrency ? formatCurrency(value) : value;

  return (
    <div
      className={`bg-[var(--card)] p-5 rounded-[var(--radius-xl)] shadow-[var(--shadow-xs)] border border-[var(--border)] relative group flex items-center justify-between gap-3 ${className}`}
      title={tooltip || undefined}
    >
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-[var(--tracking-caps)] text-[var(--muted-foreground)] mb-1">
          {title}
        </p>
        <p className="text-2xl font-semibold" style={{ ...MONO, color: tone }}>
          {displayValue}
        </p>
      </div>
      {icon && (
        <div className="shrink-0 opacity-80" style={{ color: tone }}>
          <Icon name={faToLucide(icon)} size={22} />
        </div>
      )}
    </div>
  );
};

export default StatCard;
