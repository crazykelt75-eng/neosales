'use client';

import { useEffect } from 'react';

/**
 * Registers the offline service worker after the page is interactive, so it
 * never competes with first paint. Production only — a service worker in
 * development would cache stale HMR chunks.
 */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    if (!('serviceWorker' in navigator)) return;

    const register = () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // Offline support is a bonus; the storefront works fine without it.
      });
    };

    if (document.readyState === 'complete') {
      register();
      return;
    }

    window.addEventListener('load', register);
    return () => window.removeEventListener('load', register);
  }, []);

  return null;
}
