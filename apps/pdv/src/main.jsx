import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
// -------------------------------------------
import { HashRouter } from 'react-router-dom'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { queryClient, persistOptions } from './lib/queryClient';
import { AlertProvider } from './context/AlertSystem';
import { AuthProvider } from './context/AuthContext';
import { TenantProvider } from './context/TenantContext';
import { ThemeProvider } from './context/ThemeContext';

// Devtools apenas em desenvolvimento (removido do bundle de produção por DCE).
const ReactQueryDevtools = import.meta.env.DEV
  ? React.lazy(() =>
      import('@tanstack/react-query-devtools').then((m) => ({ default: m.ReactQueryDevtools })),
    )
  : () => null;

// PWA: registra o service worker apenas na web (nao no Electron/file://).
if (
  "serviceWorker" in navigator &&
  typeof window !== "undefined" &&
  !window.api &&
  window.location.protocol.startsWith("http")
) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HashRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <PersistQueryClientProvider client={queryClient} persistOptions={persistOptions}>
        <ThemeProvider>
          <AlertProvider>
            <TenantProvider>
              <AuthProvider>
                <App />
              </AuthProvider>
            </TenantProvider>
          </AlertProvider>
        </ThemeProvider>
        <React.Suspense fallback={null}>
          <ReactQueryDevtools initialIsOpen={false} />
        </React.Suspense>
      </PersistQueryClientProvider>
    </HashRouter>
  </React.StrictMode>,
)