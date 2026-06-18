import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Detect if running on a Smart TV browser (Tizen, webOS, LG, Samsung, etc.)
const isTV = /SmartTV|Tizen|Web0S|LG|Samsung|HbbTV|STB|Chromecast/i.test(navigator.userAgent);

// Register Service Worker for PWA - Bypassed on TVs to prevent caching static bugs of old TV engines
if ('serviceWorker' in navigator) {
  if (isTV) {
    // If we are on a TV, proactively unregister any active service worker to clean any stale/buggy cache
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      let unregistered = false;
      for (const registration of registrations) {
        registration.unregister();
        unregistered = true;
      }
      if (unregistered) {
        console.log('Unregistered service worker on Smart TV browser to guarantee live updates.');
        // Force reload once to reflect clean network assets
        window.location.reload();
      }
    });
  } else {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').then(registration => {
        // Force update the service worker
        registration.onupdatefound = () => {
          const installingWorker = registration.installing;
          if (installingWorker) {
            installingWorker.onstatechange = () => {
              if (installingWorker.state === 'installed') {
                if (navigator.serviceWorker.controller) {
                  // New content is available; reload the page
                  window.location.reload();
                }
              }
            };
          }
        };
      });
    });
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
