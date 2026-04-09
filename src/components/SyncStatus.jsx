import React, { useState, useEffect } from "react";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/pt-br";

dayjs.extend(relativeTime);
dayjs.locale("pt-br");

const SyncStatus = ({ isCollapsed }) => {
  const [syncState, setSyncState] = useState({
    syncStatus: "idle",
    lastSync: null,
  });

  useEffect(() => {
    // Busca o status inicial
    const fetchInitialStatus = async () => {
      try {
        const status = await window.api.getSyncStatus();
        setSyncState(status);
      } catch (error) {
        console.error("Erro ao buscar status de sincronização:", error);
      }
    };

    fetchInitialStatus();

    // Escuta eventos de sincronização em tempo real
    const removeListener = window.api.onSyncEvent((data) => {
      setSyncState(data);
    });

    return () => {
      if (removeListener) removeListener();
    };
  }, []);

  const getStatusConfig = () => {
    switch (syncState.syncStatus) {
      case "syncing":
        return {
          icon: "fa-sync fa-spin",
          color: "text-blue-500",
          bg: "bg-blue-500/10",
          label: "Sincronizando...",
        };
      case "success":
        return {
          icon: "fa-cloud",
          color: "text-green-500",
          bg: "bg-green-500/10",
          label: "Sincronizado",
        };
      case "error":
        return {
          icon: "fa-exclamation-triangle",
          color: "text-red-500",
          bg: "bg-red-500/10",
          label: "Erro na sincronização",
        };
      default:
        return {
          icon: "fa-cloud",
          color: "text-surface-400",
          bg: "bg-surface-400/10",
          label: "Aguardando",
        };
    }
  };

  const config = getStatusConfig();

  if (isCollapsed) {
    return (
      <div className="flex items-center justify-center py-2 group relative">
        <i className={`fas ${config.icon} ${config.color} text-sm`}></i>
        {/* Tooltip para o modo colapsado */}
        <div className="absolute left-full ml-2 px-2 py-1 bg-surface-800 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none transition-opacity z-[100]">
          {config.label} {syncState.lastSync && `(${dayjs(syncState.lastSync).fromNow()})`}
        </div>
      </div>
    );
  }

  return (
    <div className={`mt-2 px-3 py-2 rounded-xl border border-surface-200 transition-all ${config.bg}`}>
      <div className="flex items-center gap-3">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${config.bg} ${config.color}`}>
          <i className={`fas ${config.icon}`}></i>
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-[10px] font-black uppercase tracking-widest ${config.color}`}>
            {config.label}
          </p>
          <p className="text-[9px] text-surface-500 truncate">
            {syncState.lastSync 
              ? `Última: ${dayjs(syncState.lastSync).format("HH:mm")}`
              : "Nunca sincronizado"}
          </p>
        </div>
      </div>
    </div>
  );
};

export default SyncStatus;
