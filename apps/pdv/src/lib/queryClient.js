import { QueryClient } from "@tanstack/react-query";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";

const DAY = 1000 * 60 * 60 * 24;

// Cliente único de cache/consultas do app.
// - staleTime: reentrar numa tela dentro da janela usa o cache sem refetch;
//   passando disso, revalida em background (stale-while-revalidate nativo).
// - gcTime alto (24h) para casar com a persistência no localStorage.
// - refetchOnWindowFocus desligado: é um PDV/desktop.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: DAY,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Persiste o cache no localStorage — assim o app abre com dados na tela mesmo
// após um F5, revalidando em background.
export const persister = createSyncStoragePersister({
  storage: typeof window !== "undefined" ? window.localStorage : undefined,
  key: "syscontrol-rq-cache",
  throttleTime: 1000,
});

// Só persistimos dados de REFERÊNCIA (listas estáveis). Relatórios/dashboard
// dependem de filtros e tempo — não vale ocupar o localStorage com eles.
const PERSIST_KEYS = new Set(["products", "people", "clients", "budgets"]);

export const persistOptions = {
  persister,
  maxAge: DAY,
  buster: "v1", // trocar invalida todo o cache persistido (ex.: mudança de schema do payload)
  dehydrateOptions: {
    shouldDehydrateQuery: (query) => {
      const key = Array.isArray(query.queryKey) ? query.queryKey[0] : query.queryKey;
      return PERSIST_KEYS.has(key) && query.state.status === "success";
    },
  },
};
