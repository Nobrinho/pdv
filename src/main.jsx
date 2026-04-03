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

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HashRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AlertProvider>
        <TenantProvider>
          <AuthProvider>
            <App />
          </AuthProvider>
        </TenantProvider>
      </AlertProvider>
    </HashRouter>
  </React.StrictMode>,
)