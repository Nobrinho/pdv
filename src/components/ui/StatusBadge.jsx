// =============================================================
// StatusBadge.jsx — Badge de status reutilizável
// =============================================================
import React from "react";

const presets = {
  novo:      { bg: "bg-primary-500/10",   text: "text-primary-600",   border: "border-primary-500/20",  label: "NOVO" },
  usado:     { bg: "bg-orange-500/10",    text: "text-orange-600",    border: "border-orange-500/20",   label: "USADO" },
  ok:        { bg: "bg-green-500/10",     text: "text-green-600",     border: "border-green-500/20",    label: "OK" },
  cancelada: { bg: "bg-red-500/10",       text: "text-red-600",       border: "border-red-500/20",      label: "CANCELADA" },
  pendente:  { bg: "bg-yellow-500/10",    text: "text-yellow-600",    border: "border-yellow-500/20",   label: "PENDENTE" },
  quitado:   { bg: "bg-green-500/10",     text: "text-green-600",     border: "border-green-500/20",    label: "QUITADO" },
  emdia:     { bg: "bg-green-500/10",     text: "text-green-600",     border: "border-green-500/20",    label: "EM DIA" },
  devedor:   { bg: "bg-red-500/10",       text: "text-red-500",       border: "border-red-500/20",      label: "DEVEDOR" },
};

/**
 * @param {Object} props
 * @param {"novo"|"usado"|"ok"|"cancelada"|"pendente"|"quitado"|"emdia"|"devedor"} props.preset - Preset de estilo
 * @param {string} [props.label] - Texto customizado (sobrescreve o label do preset)
 * @param {string} [props.className] - Classes adicionais
 */
const StatusBadge = ({ preset, label, className = "" }) => {
  const style = presets[preset] || presets.ok;
  const displayLabel = label || style.label;

  return (
    <span
      className={`px-2 py-1 rounded text-[10px] font-bold uppercase border ${style.bg} ${style.text} ${style.border} ${className}`}
    >
      {displayLabel}
    </span>
  );
};

export default StatusBadge;
