import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import '@fortawesome/fontawesome-free/css/all.min.css';
// -------------------------------------------
import { HashRouter } from 'react-router-dom'
import { AlertProvider } from './context/AlertSystem';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HashRouter>
      <AlertProvider>
        <App />
      </AlertProvider>
    </HashRouter>
  </React.StrictMode>,
)