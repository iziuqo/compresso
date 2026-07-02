'use client';

import { useEffect } from 'react';

const RELOAD_KEY = 'compresso-chunk-reload';

function isChunkLoadError(reason) {
  if (!reason) return false;
  const message = typeof reason === 'string' ? reason : reason.message || '';
  const name = reason.name || '';
  return (
    name === 'ChunkLoadError'
    || message.includes('Loading chunk')
    || message.includes('Failed to fetch dynamically imported module')
    || message.includes('Importing a module script failed')
  );
}

function reloadOnce() {
  if (typeof window === 'undefined') return;
  if (sessionStorage.getItem(RELOAD_KEY)) return;
  sessionStorage.setItem(RELOAD_KEY, '1');
  window.location.reload();
}

export default function ServiceWorker() {
  useEffect(() => {
    const onError = (event) => {
      if (isChunkLoadError(event.error || event.message)) {
        reloadOnce();
      }
    };

    const onRejection = (event) => {
      if (isChunkLoadError(event.reason)) {
        event.preventDefault();
        reloadOnce();
      }
    };

    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);
    window.addEventListener('load', () => sessionStorage.removeItem(RELOAD_KEY), { once: true });

    if (!('serviceWorker' in navigator)) {
      return () => {
        window.removeEventListener('error', onError);
        window.removeEventListener('unhandledrejection', onRejection);
      };
    }

    let refreshing = false;
    const onControllerChange = () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    };

    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);

    navigator.serviceWorker.register('/sw.js').then((registration) => {
      if (registration.waiting) {
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      }

      registration.addEventListener('updatefound', () => {
        const worker = registration.installing;
        if (!worker) return;

        worker.addEventListener('statechange', () => {
          if (worker.state === 'installed' && navigator.serviceWorker.controller) {
            worker.postMessage({ type: 'SKIP_WAITING' });
          }
        });
      });

      // Check for updates when tab becomes visible again
      const checkForUpdates = () => registration.update().catch(() => {});
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') checkForUpdates();
      });
    }).catch(() => {});

    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
    };
  }, []);

  return null;
}
