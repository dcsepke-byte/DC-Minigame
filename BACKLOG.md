# Party Arena – Development Backlog

## Priority: High

- [ ] **NEUE MINISPIELE** — Aktuelle Spiele sind zu simpel (nur Reaktion/Memory/Tap), werden schnell langweilig. Neue Spiele mit Tiefe, Strategie, Skill-Ceiling und "One More Try"-Suchtpotenzial entwickeln. Ideen:
  - **Tower Stack** — Bausteine stapeln, Timing-basiert, immer schmaler werdend (wie Stack/Ketchapp)
  - **Bubble Pop** — Bunte Blasen steigen auf, nur eigene Farbe poppen, Kettenreaktion-Bonus
  - **Draw Path** — Linie zeichnen um fallende Objekte zu fangen, ohne Barrieren zu beruehren
  - **Color Catch** — Schiebender Korb, nur richtige Farben auffangen, falsche meiden
  - **Ninja Slash** — Objekte fliegen rein (Fruit-Ninja-Style), treffen, Bomben meiden
  - **Tile Flip Puzzle** — Memory-Grid aufdecken, Paare finden gegen die Zeit, mit Boostern
  - **Dodgeball** — Ausweichen vor heranfliegenden Objekten, immer schneller werdend
  - **Coin Dash** — Muenzen sammeln, Gegner ausweichen, Power-Ups nutzen
  - **Rhythm Tap** — Im Takt tippen, musik-basiert, Combo-Multiplikator
  - **Shape Match** — Formen rotieren/skalieren bis sie passen, Puzzle-Style
  - **Bounce Survival** — Ball am Leben halten mit Paddle, Geschwindigkeit steigt
  - **Quick Draw Duel** — Western-Duell: waechst bis Signal, dann schnellstes Tippen
  Alte simple Spiele behalten als "Classic Mix", neue Spiele als "Action Mix" Kategorie
- [x] **3D-Modelle verbessern** — Pawns: bessere Geometrie (z.B. abgerundet, Glow), Tiles: Biom-spezifische Texturen/Deko,Animations-Polish
- [ ] **Code-Duplikate auslagern** — host.js/player.js shared Funktionen (el, escapeHtml, initials, renderBoardPills, etc.) in js/shared.js
- [ ] **Memory Leaks fixen** — Quiz-Bank-Cache begrenzen, Konfetti-Array cappen
- [ ] **Diff-basierte Board-Updates** — board_payload nur geänderte Tiles senden statt Full-State (240 Tiles)

## Priority: Medium

- [ ] **Rate-Limiting WebSocket** — max 10 Msg/s pro Client
- [ ] **5-stelligen Raum-Code** — oder Brute-Force-Sperre nach 5 Fehlversuchen
- [ ] **2D-Fallback für 3D-Board** — Performance-Detection → einfaches 2D-Grid auf schwachen Geräten
- [ ] **PNG-PWA-Icons** — 192px, 512px, maskable für iOS < 16 und ältere Android
- [ ] **Bot-KI im Solo-Modus** — skill-basierter Score statt rein random
- [ ] **Accessibility** — Tastatur-Shortcuts für Minispiele, ARIA-Labels

## Priority: Low

- [ ] **Server.py modularisieren** — aufteilen in ws_protocol.py, http_server.py, room.py, board_engine.py
- [ ] **i18n / Sprachauswahl** — mindestens DE/EN
- [ ] **Observer/Spectator-Modus** — nicht-teilnehmende Zuschauer
- [ ] **Host-Token in sessionStorage** — statt localStorage (XSS-Reduktion)
- [ ] **Cache-Control no-store auf HTML** — aktuell nur JS/CSS

## Done

- [x] **Auto-Reconnect** — net.js mit exponentiellem Backoff + Token-Rejoin (2026-07-20)
- [x] **pid-Bug in player.js** — p.id === pid → p.id === me.id (2026-07-20)
- [x] **branchChoice-Disconnect** — Server handled offline Spieler während Wegwahl (2026-07-20)
- [x] **WebSocket-Ping alle 30s** — verhindert Render-Timeout (2026-07-20)
- [x] **Doppelter AudioContext** — games.js nutzt FX.ensureCtx() (2026-07-20)
- [x] **setupBoardSlides doppelte Listener** — slidesBound Guard in host.js (2026-07-20)
- [x] **bgCanvas Memory Leak** — 2D-Partikel stoppen bei 3D-Aktiv (2026-07-20)
- [x] **pointerdown No-Op** — setSoundEnabled(true) statt No-Op (2026-07-20)