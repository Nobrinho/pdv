// =============================================================
// StatCard.jsx — Card de KPI/Métrica reutilizável
// =============================================================
import React from "react";
import { formatCurrency } from "../../utils/format";

const StatCard = ({
  title,
  value,
  color = "blue",
  icon,
  tooltip,
  isCurrency = true,
  className = "",
}) => {
  const colorMap = {
    blue: { border: "border-primary-500", text: "text-surface-800", icon: "text-primary-200" },
    green: { border: "border-green-500", text: "text-green-600", icon: "text-green-200" },
    red: { border: "border-red-500", text: "text-red-600", icon: "text-red-200" },
    yellow: { border: "border-yellow-500", text: "text-yellow-600", icon: "text-yellow-200" },
    orange: { border: "border-orange-500", text: "text-orange-600", icon: "text-orange-200" },
    purple: { border: "border-purple-500", text: "text-purple-600", icon: "text-purple-200" },
    gray: { border: "border-surface-600", text: "text-surface-800", icon: "text-surface-200" },
  };

  const colors = colorMap[color] || colorMap.blue;

  return (
    <div
      className={`bg-surface-100 p-4 rounded-xl shadow-sm border-l-4 ${colors.border} relative group cursor-help transition-transform hover:scale-[1.02] flex items-center justify-between ${className}`}
    >
      {tooltip && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block w-48 bg-surface-900 text-white text-xs rounded p-2 z-50 text-center shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
          {tooltip}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-800"></div>
        </div>
      )}
      <div>
        <p className="text-xs text-surface-500 font-bold uppercase mb-1 w-fit">
          {title}
        </p>
        <p className={`text-xl font-bold ${colors.text}`}>
          {isCurrency ? formatCurrency(value) : value}
        </p>
      </div>
      {icon && (
        <i className={`fas ${icon} text-2xl ${colors.icon} opacity-50`}></i>
      )}
    </div>
  );
};

export default StatCard;
