import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import './lib/pdfWorker';
import { initSecurityProtection } from './lib/securityProtection';
import App from './App.tsx';
import './index.css';

// Kaynak koruma ve F12 / Sağ Tık engelleme başlat
initSecurityProtection();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
