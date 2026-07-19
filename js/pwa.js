/* PWA-Cache entfernt — Service Worker wird de-registriert und alle Caches
   geloescht, damit Spieler die neue Version sofort sehen.
   Grund: Online-Multiplayer-App brauchte den SW nie wirklich; er hat vor allem
   alte Versionen blockiert (besonders in Opera).

   v3 (Cache-Busting): Zusaetzlich zur SW/Cache-Loeschung laden wir einmal alle
   kritischen Assets mit Cache-Buster und leeren damit den HTTP-Cache des
   Browsers. Beim naechsten Seitenaufruf holt der Browser frisch. */
(() => {
  'use strict';

  const ASSET_VERSION = 'v8';

  window.addEventListener('load', async () => {
    /* 1. Service Worker de-registrieren (falls noch einer aus alter Version
          vorhanden ist — besonders Opera behaelt diesen gerne). */
    if ('serviceWorker' in navigator) {
      try {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map(r => r.unregister()));
      } catch (_) { /* silent */ }
    }

    /* 2. Alle Cache-API-Eintraege loeschen. */
    try {
      if (window.caches) {
        const keys = await caches.keys();
        await Promise.all(keys.map(k => caches.delete(k)));
      }
    } catch (_) { /* silent */ }

    /* 3. Einmalige Hintergrund-Fetches mit Cache-Buster, um Opera/Chrome
          HTTP-Cache fuer unsere Assets zu invalidieren. fetch mit
          cache:'reload' zwingt den Browser, die Antwort neu zu holen und
          den Cache-Eintrag zu ueberschreiben. */
    try {
      const assets = [
        '/css/styles.css',
        '/js/scene3d.js',
        '/js/effects.js',
        '/js/quiz-duel-questions.js',
        '/js/games.js',
        '/js/net.js',
        '/js/pwa.js',
        '/js/host.js',
        '/js/player.js',
        '/js/main.js',
        '/manifest.webmanifest',
        '/assets/icon.svg',
      ];
      await Promise.all(assets.map(a =>
        fetch(a + '?' + ASSET_VERSION, { cache: 'reload' }).catch(() => {})
      ));
    } catch (_) { /* silent */ }

    console.info('[pwa] v' + ASSET_VERSION + ': SW de-registriert, Caches geloescht, Assets reloaded.');
  });
})();