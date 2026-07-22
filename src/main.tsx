import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/montserrat';
import './styles/theme.css';
import App from './App';
import { requestPersistentStorage } from './lib/storage';

// Ask the browser not to evict months of cycle history under storage pressure.
void requestPersistentStorage();

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('Root element #root not found');

createRoot(rootEl).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
