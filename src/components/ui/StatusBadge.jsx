// =============================================================
// StatusBadge.jsx — Badge de status reutilizável
// =============================================================
import React from "react";

const presets = {
  novo:      { bg: "bg-blue-50",   text: "text-blue-700",   border: "border-blue-200",  label: "NOVO" },
  usado:     { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200", label: "USADO" },
  ok:        { bg: "bg-green-100", text: "text-green-800",  border: "border-green-200",  label: "OK" },
  cancelada: { bg: "bg-red-100",   text: "text-red-800",    border: "border-red-200",    label: "CANCELADA" },
  pendente:  { bg: "bg-yellow-100",text: "text-yellow-800", border: "border-yellow-200", label: "PENDENTE" },
  quitado:   { bg: "bg-green-100", text: "text-green-700",  border: "border-green-200",  label: "QUITADO" },
  emdia:     { bg: "bg-green-100", text: "text-green-700",  border: "border-green-200",  label: "EM DIA" },
  devedor:   { bg: "bg-red-100",   text: "text-red-600",    border: "border-red-200",    label: "DEVEDOR" },
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
