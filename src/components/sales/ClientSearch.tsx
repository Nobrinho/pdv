import React, { useState, useMemo } from "react";
import { Client, Person } from "../../types";

interface ClientSearchProps {
  clients: Client[];
  sellers: Person[];
  selectedClient: string | number;
  selectedSeller: string | number;
  onSelectClient: (client: Client | null) => void;
  onSelectSeller: (id: string | number) => void;
  onOpenNewClientModal: () => void;
}

const ClientSearch: React.FC<ClientSearchProps> = ({
  clients,
  sellers,
  selectedClient,
  selectedSeller,
  onSelectClient,
  onSelectSeller,
  onOpenNewClientModal,
}) => {
  const [clientSearchTerm, setClientSearchTerm] = useState("");
  const [showClientResults, setShowClientResults] = useState(false);

  const filteredClients = useMemo(() => {
    if (!clientSearchTerm) return [];
    const lower = clientSearchTerm.toLowerCase();
    return clients
      .filter(
        (c) =>
          c.nome.toLowerCase().includes(lower) ||
          (c.documento && c.documento.includes(lower)) ||
          (c.telefone && c.telefone.includes(lower))
      )
      .slice(0, 10);
  }, [clientSearchTerm, clients]);

  const handleSelectClient = (client: Client | null) => {
    onSelectClient(client);
    setClientSearchTerm(client ? client.nome : "");
    setShowClientResults(false);
  };

  return (
    <div className="bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-slate-800">
      <div className="flex gap-4">
        <div className="w-1/2">
          <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase mb-1">
            Vendedor
          </label>
          <select
            className="w-full border border-gray-300 dark:border-slate-700 rounded-lg p-2.5 bg-gray-50 dark:bg-slate-800/50 outline-none focus:ring-2 focus:ring-blue-500"
            value={selectedSeller}
            onChange={(e) => onSelectSeller(e.target.value)}
          >
            <option value="">Selecione...</option>
            {sellers.map((s) => (
              <option key={s.id} value={s.id!}>
                {s.nome}
              </option>
            ))}
          </select>
        </div>

        <div className="w-1/2 flex gap-2 items-end">
          <div className="flex-1 relative">
            <label className="block text-xs font-bold text-gray-500 dark:text-slate-400 uppercase mb-1">
              Cliente
            </label>
            <div className="relative">
              <input
                className={`w-full border rounded-lg p-2.5 pl-8 outline-none focus:ring-2 focus:ring-blue-500 ${
                  selectedClient
                    ? "border-green-500 bg-green-50 dark:bg-green-900/20 text-green-800 font-bold"
                    : "border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                }`}
                placeholder={selectedClient ? "" : "Buscar Cliente..."}
                value={clientSearchTerm}
                onChange={(e) => {
                  setClientSearchTerm(e.target.value);
                  if (selectedClient) onSelectClient(null);
                  setShowClientResults(true);
                }}
                onFocus={() => setShowClientResults(true)}
                onBlur={() =>
                  setTimeout(() => setShowClientResults(false), 200)
                }
              />
              <i
                className={`fas ${
                  selectedClient
                    ? "fa-user-check text-green-600"
                    : "fa-search text-gray-400"
                } absolute left-3 top-3`}
              ></i>
              {selectedClient && (
                <button
                  onClick={() => handleSelectClient(null)}
                  className="absolute right-3 top-3 text-gray-400 hover:text-red-500"
                >
                  <i className="fas fa-times"></i>
                </button>
              )}
            </div>
            {showClientResults &&
              (clientSearchTerm.length > 0 || clients.length > 0) && (
                <div className="absolute top-full left-0 w-full bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-lg shadow-xl mt-1 max-h-48 overflow-y-auto z-[60]">
                  <div
                    className="p-2 hover:bg-gray-100 cursor-pointer text-sm text-gray-600 italic border-b"
                    onClick={() => handleSelectClient(null)}
                  >
                    <i className="fas fa-user-tag mr-2"></i> Consumidor Final
                  </div>
                  {filteredClients.map((c) => (
                    <div
                      key={c.id}
                      onClick={() => handleSelectClient(c)}
                      className="p-2 hover:bg-blue-50 cursor-pointer border-b border-gray-100 text-sm"
                    >
                      <div className="font-bold text-gray-800 dark:text-slate-100">{c.nome}</div>
                    </div>
                  ))}
                </div>
              )}
          </div>
          <button
            onClick={onOpenNewClientModal}
            className="bg-green-600 text-white p-2.5 rounded-lg hover:bg-green-700 transition shadow-sm h-[42px] w-[42px] flex items-center justify-center"
          >
            <i className="fas fa-plus"></i>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ClientSearch;
