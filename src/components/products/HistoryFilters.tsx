import React from "react";

interface HistoryFiltersProps {
  periodType: string;
  onPeriodChange: (type: string) => void;
  startDate: string;
  setStartDate: (val: string) => void;
  endDate: string;
  setEndDate: (val: string) => void;
  searchTerm: string;
  setSearchTerm: (val: string) => void;
}

const HistoryFilters: React.FC<HistoryFiltersProps> = ({
  periodType,
  onPeriodChange,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  searchTerm,
  setSearchTerm,
}) => {
  return (
    <div className="bg-white p-5 rounded-xl shadow-sm mb-6 border border-gray-100 flex flex-col gap-4">
      {/* Filtros Rápidos */}
      <div className="flex gap-2 border-b pb-4 overflow-x-auto custom-scrollbar">
        {["weekly", "monthly", "yearly"].map((type) => (
          <button
            key={type}
            onClick={() => onPeriodChange(type)}
            className={`px-5 py-2 text-xs font-bold rounded-full transition whitespace-nowrap ${
              periodType === type
                ? "bg-blue-600 text-white shadow-md"
                : "bg-gray-100 text-gray-500 hover:bg-gray-200"
            }`}
          >
            {type === "weekly" ? "ESTA SEMANA" : type === "monthly" ? "ESTE MÊS" : "ESTE ANO"}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-4 items-end">
        <div className="w-full sm:w-auto">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block">Início</label>
          <input
            type="date"
            className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>
        <div className="w-full sm:w-auto">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block">Fim</label>
          <input
            type="date"
            className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
        <div className="flex-1 min-w-[200px]">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block">Buscar Produto</label>
          <div className="relative">
            <input
              type="text"
              className="w-full border border-gray-300 rounded-lg p-2.5 text-sm pl-10 focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50"
              placeholder="Nome ou código do produto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <i className="fas fa-search absolute left-3.5 top-3.5 text-gray-400 text-xs"></i>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HistoryFilters;
