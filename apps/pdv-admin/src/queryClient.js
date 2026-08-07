import { QueryClient } from "@tanstack/react-query";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";

const DAY = 1000 * 60 * 60 * 24;

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, gcTime: DAY, retry: 1, refetchOnWindowFocus: false },
  },
});

// Persiste o cache no localStorage → o painel abre com dados após um F5.
export const persister = createSyncStoragePersister({
  storage: typeof window !== "undefined" ? window.localStorage : undefined,
  key: "syscontrol-admin-rq-cache",
  throttleTime: 1000,
});

// Só listas de referência (lojas e planos). Faturamento/dashboard são
// agregados sensíveis ao tempo — melhor sempre buscar frescos.
const PERSIST_KEYS = new Set(["admin-stores", "admin-plans"]);

export const persistOptions = {
  persister,
  maxAge: DAY,
  buster: "v1",
  dehydrateOptions: {
    shouldDehydrateQuery: (query) => {
      const key = Array.isArray(query.queryKey) ? query.queryKey[0] : query.queryKey;
      return PERSIST_KEYS.has(key) && query.state.status === "success";
    },
  },
};
