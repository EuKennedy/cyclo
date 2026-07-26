import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/montserrat';
import './styles/theme.css';
import App from './App';
import { registerSW } from 'virtual:pwa-register';
import { requestPersistentStorage } from './lib/storage';

// Ask the browser not to evict months of cycle history under storage pressure.
void requestPersistentStorage();

// Keep the app on the latest deploy: the new service worker takes over
// immediately (skipWaiting/clientsClaim) and the page reloads. Re-check for a
// new build periodically and whenever the app regains focus.
registerSW({
  immediate: true,
  onRegisteredSW(_swUrl, registration) {
    if (!registration) return;
    const check = () => void registration.update();
    setInterval(check, 60_000);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') check();
    });
  },
});

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('Root element #root not found');

createRoot(rootEl).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
