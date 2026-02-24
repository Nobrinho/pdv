import React from "react";
import { Person } from "../../types";

interface AdjustmentSectionProps {
  laborInput: string | number;
  setLaborInput: (val: string | number) => void;
  mechanics: Person[];
  selectedMechanic: string | number;
  setSelectedMechanic: (id: string | number) => void;
  surchargeType: "percent" | "fixed";
  setSurchargeType: (type: "percent" | "fixed") => void;
  surchargeValue: string;
  setSurchargeValue: (val: string) => void;
  discountType: "percent" | "fixed";
  setDiscountType: (type: "percent" | "fixed") => void;
  discountValue: string;
  setDiscountValue: (val: string) => void;
  total: number;
}

const AdjustmentSection: React.FC<AdjustmentSectionProps> = ({
  laborInput,
  setLaborInput,
  mechanics,
  selectedMechanic,
  setSelectedMechanic,
  surchargeType,
  setSurchargeType,
  surchargeValue,
  setSurchargeValue,
  discountType,
  setDiscountType,
  discountValue,
  setDiscountValue,
  total,
}) => {
  const formatCurrency = (val: number) =>
    `R$ ${val.toFixed(2).replace(".", ",")}`;

  return (
    <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 space-y-4">
      <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide border-b pb-2">
        Ajustes
      </h2>

      <div className="border-b border-dashed pb-3">
        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
          Mão de Obra (R$)
        </label>
        <div className="flex gap-2">
          <input
            type="number"
            className="flex-1 border border-gray-300 rounded p-1.5 text-right text-sm font-medium focus:ring-1 focus:ring-blue-500 outline-none"
            value={laborInput}
            onChange={(e) => setLaborInput(e.target.value)}
            placeholder="0.00"
            min="0"
          />
          <select
            className="w-1/2 border border-gray-300 rounded p-1.5 text-xs bg-white"
            value={selectedMechanic}
            onChange={(e) => setSelectedMechanic(e.target.value)}
          >
            <option value="">Técnico...</option>
            {mechanics.map((m) => (
              <option key={m.id} value={m.id!}>
                {m.nome}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex gap-2 items-center">
        <div className="flex bg-gray-100 rounded p-0.5 border border-gray-200">
          <button
            onClick={() => setSurchargeType("fixed")}
            className={`text-xs px-2 py-1 rounded ${
              surchargeType === "fixed"
                ? "bg-white shadow text-green-600 font-bold"
                : "text-gray-400"
            }`}
          >
            R$
          </button>
          <button
            onClick={() => setSurchargeType("percent")}
            className={`text-xs px-2 py-1 rounded ${
              surchargeType === "percent"
                ? "bg-white shadow text-green-600 font-bold"
                : "text-gray-400"
            }`}
          >
            %
          </button>
        </div>
        <input
          type="number"
          className="flex-1 border border-gray-300 rounded p-1.5 text-right text-sm text-green-600 outline-none"
          placeholder="Acréscimo"
          value={surchargeValue}
          onChange={(e) => setSurchargeValue(e.target.value)}
        />
      </div>
      <div className="flex gap-2 items-center">
        <div className="flex bg-gray-100 rounded p-0.5 border border-gray-200">
          <button
            onClick={() => setDiscountType("fixed")}
            className={`text-xs px-2 py-1 rounded ${
              discountType === "fixed"
                ? "bg-white shadow text-red-600 font-bold"
                : "text-gray-400"
            }`}
          >
            R$
          </button>
          <button
            onClick={() => setDiscountType("percent")}
            className={`text-xs px-2 py-1 rounded ${
              discountType === "percent"
                ? "bg-white shadow text-red-600 font-bold"
                : "text-gray-400"
            }`}
          >
            %
          </button>
        </div>
        <input
          type="number"
          className="flex-1 border border-gray-300 rounded p-1.5 text-right text-sm text-red-600 outline-none"
          placeholder="Desconto"
          value={discountValue}
          onChange={(e) => setDiscountValue(e.target.value)}
        />
      </div>
      <div className="flex justify-between items-center pt-2 border-t border-dashed">
        <span className="text-gray-600 font-bold">Total a Pagar</span>
        <span className="text-2xl font-extrabold text-blue-700">
          {formatCurrency(total)}
        </span>
      </div>
    </div>
  );
};

export default AdjustmentSection;
