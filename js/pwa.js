/* PWA-Cache entfernt — Service Worker wird de-registriert und alle Caches
   geloescht, damit Spieler die neue Version sofort sehen.
   Grund: Online-Multiplayer-App brauchte den SW nie wirklich; er hat vor allem
   alte Versionen blockiert. */
(() => {
  'use strict';

  if (!('serviceWorker' in navigator)) return;

  window.addEventListener('load', async () => {
    try {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map(r => r.unregister()));
    } catch (_) { /* silent */ }

    try {
      const keys = await caches.keys();
      await Promise.all(keys.map(k => caches.delete(k)));
    } catch (_) { /* silent */ }

    // Cache-Control Header kann man clientseitig nicht killen, aber ohne SW
    // holt der Browser immer frisch (ggf. Shift-Reload beim ersten Mal).
    console.info('[pwa] Service Worker de-registriert, Caches geloescht.');
  });
})();