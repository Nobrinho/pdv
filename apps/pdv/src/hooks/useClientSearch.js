// =============================================================
// useClientSearch.js — Hook de busca de clientes
// =============================================================
import { useState, useMemo, useCallback } from "react";

const useClientSearch = (clients) => {
  const [clientSearchTerm, setClientSearchTerm] = useState("");
  const [showClientResults, setShowClientResults] = useState(false);
  const [selectedClient, setSelectedClient] = useState("");

  const filteredClients = useMemo(() => {
    if (!clientSearchTerm) return [];
    const lower = clientSearchTerm.toLowerCase();
    const rawSearch = clientSearchTerm.replace(/\D/g, "");
    return clients
      .filter((c) => {
        const docRaw = c.documento ? c.documento.replace(/\D/g, "") : "";
        const telRaw = c.telefone ? c.telefone.replace(/\D/g, "") : "";
        return (
          c.nome.toLowerCase().includes(lower) ||
          (c.documento && c.documento.includes(lower)) ||
          (rawSearch && docRaw && docRaw.includes(rawSearch)) ||
          (c.telefone && c.telefone.includes(lower)) ||
          (rawSearch && telRaw && telRaw.includes(rawSearch))
        );
      })
      .slice(0, 10);
  }, [clientSearchTerm, clients]);

  const handleSelectClient = useCallback((client) => {
    if (client) {
      setSelectedClient(client.id);
      setClientSearchTerm(client.nome);
    } else {
      setSelectedClient("");
      setClientSearchTerm("");
    }
    setShowClientResults(false);
  }, []);

  return {
    clientSearchTerm,
    setClientSearchTerm,
    showClientResults,
    setShowClientResults,
    selectedClient,
    setSelectedClient,
    filteredClients,
    handleSelectClient,
  };
};

export default useClientSearch;
