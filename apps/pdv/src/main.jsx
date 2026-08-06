import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import '@fortawesome/fontawesome-free/css/all.min.css';
// -------------------------------------------
import { HashRouter } from 'react-router-dom'
import { AlertProvider } from './context/AlertSystem';
import { AuthProvider } from './context/AuthContext';
import { TenantProvider } from './context/TenantContext';
import { ThemeProvider } from './context/ThemeContext';

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
      <ThemeProvider>
        <AlertProvider>
          <TenantProvider>
            <AuthProvider>
              <App />
            </AuthProvider>
          </TenantProvider>
        </AlertProvider>
      </ThemeProvider>
    </HashRouter>
  </React.StrictMode>,
)