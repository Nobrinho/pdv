import React from "react";
import { Person, Client } from "../../types";

interface SalesFiltersProps {
  periodType: string;
  onPeriodChange: (type: string) => void;
  startDate: string;
  setStartDate: (val: string) => void;
  endDate: string;
  setEndDate: (val: string) => void;
  sellerId: string;
  setSellerId: (val: string) => void;
  sellers: Person[];
  clientSearchTerm: string;
  setClientSearchTerm: (val: string) => void;
  clientId: string;
  setClientId: (val: string) => void;
  showClientResults: boolean;
  setShowClientResults: (val: boolean) => void;
  filteredClients: Client[];
  onSelectClient: (client: Client | null) => void;
  onClear: () => void;
}

const SalesFilters: React.FC<SalesFiltersProps> = ({
  periodType,
  onPeriodChange,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  sellerId,
  setSellerId,
  sellers,
  clientSearchTerm,
  setClientSearchTerm,
  clientId,
  setClientId,
  showClientResults,
  setShowClientResults,
  filteredClients,
  onSelectClient,
  onClear,
}) => {
  return (
    <div className="bg-white p-5 rounded-xl shadow-sm mb-6 border border-gray-100 flex flex-col gap-4">
      {/* Botões Rápidos */}
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
        <div>
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block">
            Data Início
          </label>
          <input
            type="date"
            className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>
        <div>
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block">
            Data Fim
          </label>
          <input
            type="date"
            className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
        <div>
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block">
            Vendedor
          </label>
          <select
            className="w-full border border-gray-300 rounded-lg p-2.5 text-sm bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none font-medium"
            value={sellerId}
            onChange={(e) => setSellerId(e.target.value)}
          >
            <option value="all">Todos os Vendedores</option>
            {sellers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nome}
              </option>
            ))}
          </select>
        </div>

        <div className="relative">
          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block">
            Filtrar Cliente
          </label>
          <div className="relative">
            <input
              className={`w-full border rounded-lg p-2.5 text-sm pl-9 outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
                clientId
                  ? "border-green-500 bg-green-50 text-green-800 font-bold"
                  : "border-gray-300 bg-gray-50"
              }`}
              placeholder={clientId ? "" : "Nome ou Doc..."}
              value={clientSearchTerm}
              onChange={(e) => {
                setClientSearchTerm(e.target.value);
                if (clientId) setClientId("");
                setShowClientResults(true);
              }}
              onFocus={() => setShowClientResults(true)}
              onBlur={() => setTimeout(() => setShowClientResults(false), 200)}
            />
            <i
              className={`fas ${
                clientId ? "fa-user-check text-green-600" : "fa-search text-gray-400"
              } absolute left-3 top-3 text-sm`}
            ></i>
            {clientId && (
              <button
                onClick={() => onSelectClient(null)}
                className="absolute right-3 top-3 text-gray-400 hover:text-red-500"
              >
                <i className="fas fa-times-circle"></i>
              </button>
            )}
          </div>
          {/* Resultados Cliente */}
          {showClientResults && (clientSearchTerm.length > 0) && (
            <div className="absolute top-full left-0 w-full bg-white border border-gray-200 rounded-lg shadow-2xl mt-1 max-h-48 overflow-y-auto z-[60] animate-fade-in">
              <div
                className="p-3 hover:bg-gray-100 cursor-pointer text-xs text-gray-500 font-bold border-b bg-gray-50"
                onClick={() => onSelectClient(null)}
              >
                <i className="fas fa-filter-slash mr-2"></i> TODOS OS CLIENTES
              </div>
              {filteredClients.map((c) => (
                <div
                  key={c.id}
                  onClick={() => onSelectClient(c)}
                  className="p-3 hover:bg-blue-50 cursor-pointer border-b border-gray-100 text-sm flex items-center"
                >
                  <i className="far fa-user mr-3 text-blue-400"></i>
                  <div>
                    <div className="font-bold text-gray-800">{c.nome}</div>
                    <div className="text-[10px] text-gray-400">{c.documento}</div>
                  </div>
                </div>
              ))}
              {filteredClients.length === 0 && (
                <div className="p-4 text-center text-xs text-gray-400 italic">
                  Nenhum cliente no filtro
                </div>
              )}
            </div>
          )}
        </div>

        <button
          onClick={onClear}
          className="h-[42px] px-6 text-xs font-bold text-blue-600 hover:text-white border-2 border-blue-600 rounded-lg hover:bg-blue-600 transition flex items-center justify-center whitespace-nowrap"
        >
          <i className="fas fa-undo mr-2"></i> LIMPAR
        </button>
      </div>
    </div>
  );
};

export default SalesFilters;
