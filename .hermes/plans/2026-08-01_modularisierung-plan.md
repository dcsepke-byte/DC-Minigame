# Party Arena — Modularisierungsplan (arch-2 + arch-3)

**Datum:** 2026-08-01
**Ziel:** SPS-ähnliche Bausteine mit definierten Schnittstellen, isoliert testbar, austauschbar.

## Ist-Zustand (Analyse)

Die Codebasis ist bereits stark modularisiert:
- Jede Minispiel-Logik hat eigene `*-logic.js` (TDD) + `*-logic-browser.js` (IIFE)
- UI-Riesen: `games.js` (4298 Zeilen, 45+ Spiele), `player.js` (1856), `host.js` (1642), `scene3d.js` (2578), `server.py` (2206)
- Minispiel-Vertrag existiert: `js/minigame-contract.js` + `minigame-session.js` (State-Machine)
- Gemeinsame HUD-Helfer in `js/shared.js` (`window.PartyArenaShared`)

## Ziel-Struktur (Domänen)

```
js/
  shared/          — PartyArenaShared (HUD, el, escapeHtml, initials)
  net/             — net.js, branchchoice.js, reconnect, rate-limit
  minigames/       — Vertrag, Session, Registry + Spiel-Adapter
    contract/      — minigame-contract.js, minigame-session.js
    logic/         — *-logic.js (pure TDD-Logik)
    ui/            — *-logic-browser.js (DOM/Canvas-Render)
  meta/            — Progression, Shop, Achievements, IAP, Daily, Onboarding
  board/           — board-2d.js, scene3d.js, biome-decor, cinematic-camera, pawn-model
  ui/              — screens, overlays, settings, transitions
  audio/           — effects.js, audio-settings-logic
```

## Migrations-Reihenfolge

1. ✅ Saubere Version (clean-1..5)
2. ✅ Minispiel-Vertrag (arch-1)
3. **Ordnerstruktur anlegen + isolierte Logik-Module einsortieren** (heute)
4. games.js in Kernspiele aufteilen (10 hochwertige Spiele → eigene Dateien + Registry)
5. player.js / host.js / main.js in ui/-Bereiche aufteilen
6. Asset-Loader (arch-3): SVG/PNG/GLTF/FBX mit Fallback
7. 8 hochwertige Spiele finalisieren (games-1)
8. Welt + Charaktere austauschen (visual-1)

## Schnittstellen (Verträge)

### Minispiel (bereits definiert)
```js
play(stage, api)
api = { stage, setScore(n), finish(score), timeout, interval, frameLoop(fn) }
```

### Asset-Loader (neu, arch-3)
```js
window.AssetLoader.load(path) -> Promise<{type, url, data}>
  - .svg/.png/.jpg -> Image
  - .glb/.gltf     -> GLTFLoader Result
  - Fallback: generische Primitive wenn Datei fehlt
```

## Risiken

- HTML-Script-Tags müssen bei Ordner-Verschiebung aktualisiert werden
- Cache-Busting (`?v=N`) nach jeder Änderung erhöhen
- Nach jedem Schritt: `node --check` + E2E-Bot
