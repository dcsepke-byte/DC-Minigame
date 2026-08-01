# Session Handoff — Party Arena

**Datum:** 2026-08-01 (Cron-Session clean-2..5 + Stand-Update)
**Branch:** main
**Arbeitsverzeichnis:** /opt/data/DC-Minigame

## Stand (verifiziert, alle Tests gruen)

- **clean-2 Shop-Overlay:** FIX bereits in `99a9280` (window.FX Export, Shared-Helfer
  am IIFE-Anfang, Cache-Busting v15). Verifiziert mit neuem Playwright-Smoke-Test
  `tests/smoke_shop_overlay.js`: FX vorhanden, Sound.tap ok, Shop-Overlay oeffnet
  (8 Karten), Settings-Overlay oeffnet, Join-Screen-Shop oeffnet, 0 Konsolen-Fehler.
- **clean-3 BACKLOG:** Phase-1/2-Hauptpunkte (Minispiele, Meta-Progression,
  Art Direction, 3D-Polish, Store-Assets, Minispiel-Vertrag) auf [x] gesetzt.
  Verbleibende offene Punkte sind manuelle Danny-Aufgaben (App-Store-Connect
  Konfiguration, Cross-Browser-Test) bzw. optional (Rewarded Ads) — dokumentiert.
- **clean-4 Tests:** E2E-Bot `tests/e2e_bot_v3.py` PASS, Shop-Smoke PASS,
  neuer Konsolen-Smoke `tests/smoke_console_pages.js` (index/host/player: 0 Fehler) PASS.
- **arch-1 Minispiel-Vertrag:** ERLEDIGT (Commit 97f58f4 ff.) — minigame-contract.js
  16 Tests gruen, minigame-session.js 11+5 Tests gruen, Registry-Konvention 3 Tests.
- **arch-2 Modularisierung:** ERLEDIGT (Schritt 1+2) — alle 46+ Spiele auf sessionWrap,
  minigame-registry.test.mjs gruen. Schritt 3 (Host-Rundensystem an Session-Phasen
  anbinden) laut Plan erst nach stabiler Web-Version.
- **arch-3 Asset-Loader:** ERLEDIGT (Commits 19540ba, 773543a, 77627c5) —
  js/asset-loader.js (SVG/PNG/GLTF + Primitive-Fallback), 5 Tests gruen.
- **visual-1 (teilweise):** 3D-Welt (7 Inseln als GLB + Previews v3), 8 Arenian-
  Charaktere mit 3D-Silhouetten, Gesamtkarte, Konzept-Verifier 34/34 gruen.
- **games-1 (in Arbeit):** Teil 1 (Farb-Tokens) + Teil 2 (HUD-Konsolidierung) done.

## Commits dieser Session

- `7573062` test+fix: clean-2 Shop-Overlay verifiziert (Smoke-Test, GLB v3, core ignoriert)
- `52029f7` docs: BACKLOG clean-3 Phase-1/2-Status
- `7176fb6` test: clean-4 Konsolen-Smoke (index/host/player)

## Aktive Todo-Liste (Roadmap)

1. **clean-5** Saubere Version pushen + Statusbericht — in_progress (dieser Handoff + Push)
2. **games-1** 8 hochwertige Minispiele finalisieren — in_progress
   (naechste Kandidaten laut Plan: Lava Floor/Classic-Spiele auf neue HUD-Bausteine
   heben ODER miss-dot-Duplikat bereinigen; miss-dot ist 2x in styles.css definiert —
   Bubble 12px vs CC 10px, spaetere gewinnt)
3. **visual-1** Welt + Charaktere nach und nach austauschen — pending
   (3D-Basis steht; Feinschliff: In-Game-Charakterdarstellung, Welt-Details)

## Technische Hinweise

- Render URL: `https://party-arena.onrender.com`
- Lokaler Server: `PORT=3000 python3 server.py`
- E2E-Bot: `python3 tests/e2e_bot_v3.py` (PASS erwartet)
- Browser-Smoke: `node tests/smoke_shop_overlay.js` + `node tests/smoke_console_pages.js`
  (Playwright braucht `executablePath` chromium-1228; node_modules-Playwright will 1234,
  daher Pfad im Skript hart gesetzt)
- Danny ist in Thailand; Verifikation lokal, Ergebnis per Nachricht
- Cronjob `9a3b09055476` bleibt PAUSIERT (nicht ohne Abstimmung aktivieren)

## Lern-Entscheidungen

- `const FX` in effects.js braucht explizites `window.FX = FX` (modernes JS erzeugt
  kein implizites global).
- Playwright: Browser-Pfad explizit setzen, da node_modules-Version (1234) und
  installierte Browser (1228) auseinanderlaufen.
- Core-Dump (`core`, 216MB ELF) nach Blender-Crash nicht committen — .gitignore.
- Handoff vom 31.07. war veraltet: arch-1/2/3 wurden inzwischen umgesetzt; immer
  git log + Backlog pruefen, bevor Todo-Status neu gesetzt wird.
