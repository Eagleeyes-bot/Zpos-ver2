import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { ShopProvider } from './lib/ShopContext';
import { AuthProvider } from './lib/AuthContext';
import { LanguageProvider } from './contexts/LanguageContext';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <LanguageProvider>
        <ShopProvider>
          <App />
        </ShopProvider>
      </LanguageProvider>
    </AuthProvider>
  </StrictMode>,
);
