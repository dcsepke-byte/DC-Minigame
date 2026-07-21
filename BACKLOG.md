# Party Arena – Commercial Development Backlog

## Ziel: App Store Ready (iOS + Android)

Party Arena soll soweit ausgereift werden, dass es als native App im Apple App Store und Google Play Store veroeffentlicht werden kann. Qualitaetsstandard: kommerziell, nicht Hobby.

---

## Phase 1: Gameplay Foundation (Woche 1-2)

- [~] **NEUE MINISPIELE** — Aktuelle Spiele sind zu simpel (nur Reaktion/Memory/Tap), werden schnell langweilig. Neue Spiele mit Tiefe, Strategie, Skill-Ceiling und "One More Try"-Suchtpotenzial entwickeln. Ideen:
  - [x] **Tower Stack** — Bausteine stapeln, Timing-basiert, immer schmaler werdend (wie Stack/Ketchapp) (2026-07-21)
  - [x] **Bubble Pop** — Bunte Blasen steigen auf, nur eigene Farbe poppen, Kettenreaktion-Bonus (2026-07-21)
  - [x] **Ninja Slash** — Objekte fliegen rein (Fruit-Ninja-Style), treffen, Bomben meiden (2026-07-21)
  - [x] **Color Catch** — Schiebender Korb, nur richtige Farben auffangen, falsche meiden (2026-07-21)
  - [x] **Dodgeball** — Ausweichen vor heranfliegenden Baellen, immer schneller werdend (2026-07-21)
  - [x] **Bounce Survival** — Ball am Leben halten mit Paddle, Geschwindigkeit steigt (2026-07-22)
  - [ ] **Quick Draw Duel** — Western-Duell: waechst bis Signal, dann schnellstes Tippen
  - [ ] **Rhythm Tap** — Im Takt tippen, musik-basiert, Combo-Multiplikator
  - [ ] **Coin Dash** — Muenzen sammeln, Gegner ausweichen, Power-Ups nutzen
  - [ ] **Tile Flip** — Memory-Puzzle mit Boostern, gegen die Zeit
  - Alte simple Spiele behalten als "Classic Mix", neue als "Action Mix"

- [ ] **META-PROGRESSION SYSTEM** — Kern fuer Suchtpotenzial:
  - Spieler-Level (XP aus Spielen)
  - Unlockable Charaktere/Figuren (nicht nur Emojis — echte 3D-Figuren)
  - Cosmetics: Farben, Trails, Pawn-Skins
  - Daily Challenge: taegliches Minispiel mit Bonus
  - Sternen-Sammlung als Waehrung fuer Unlocks
  - Achievement-System (erste 10 Achievements)

- [ ] **ONBOARDING / TUTORIAL** — Erste-Session-Erlebnis:
  - Willkommen-Screen mit Animation
  - Interaktives Tutorial fuer ersten Spiel-Modus
  - Hinweis-Pfeile und Tooltips
  - "Dein erstes Spiel" gefuehrt

## Phase 2: Visual & Audio Polish (Woche 3-4)

- [~] **ART DIRECTION** — Konsistenter visueller Stil:
  - Einheitliche Farbpalette und Design-Sprache
  - UI-Redesign: moderne, runde Karten statt flacher Boxen
  - Animationen: Uebergange zwischen Screens, Popup-Effekte
  - Loading Screen mit Animation
  - Lobby-Redesign

- [ ] **SOUND DESIGN** — Professionelle Audio:
  - Hintergrundmusik pro Modus (Lobby, Board, Minispiel)
  - Sound-Effekte: UI-Taps, Erfolge, Fehler, Level-Up
  - Jingle fuer Sieg/Niederlage
  - Audio-Settings (Musik/SFX getrennt, Lautstaerkeregler)

- [ ] **3D-POLISH** — Weiterentwicklung der 3D-Szene:
  - Pawns als erkennbare Charakter-Modelle (nicht Kapseln)
  - Tile-Texturen mit Normal Maps fuer Tiefe
  - Bessere Biom-Deko (mehr Variation, weniger Primitive)
  - Partikel-Effekte bei Events (Muenzen, Sterne, Duell)
  - Kamera-Fuehrung bei Board-Zuegen (cinematic)

## Phase 3: App Store Preparation (Woche 5-6)

- [ ] **APP WRAPPER (Capacitor)** — PWA → native App:
  - Capacitor installieren und konfigurieren
  - iOS und Android Build-Pipeline
  - Native APIs: Haptik (Vibration), Push-Notifications
  - App-Icon und Splash-Screen Assets
  - Screen-Orientation Lock (landscape fuer Host, portrait fuer Player)

- [ ] **MONETARISIERUNG** — Strategie festlegen und implementieren:
  - Freemium: Basis kostenlos, Premium-Charaktere/Figuren kosten
  - In-App-Kaeufe: Cosmetic Packs, Charakter-Freischaltungen
  - Belohnungs-Werbung: schaue Werbung fuer Bonus-Sterne
  - Premium-Modus: einmalige Zahlung fuer alle Inhalte

- [ ] **APP STORE ASSETS** — Fuer Store-Listing:
  - App-Icon (1024x1024, iOS + Android)
  - Screenshots (6+ pro Geraet)
  - App-Beschreibung (DE + EN)
  - Privacy Policy + Terms of Service
  - Altersfreigabe (USK/PEGI)

## Phase 4: Quality & Launch (Woche 7-8)

- [ ] **QUALITY ASSURANCE** — Bug-free:
  - Alle bekannten Bugs fixen
  - Edge-Case-Testing (2-8 Spieler, Reconnect, Disconnect)
  - Performance auf Low-End-Geraeten (2D-Fallback)
  - Memory-Leak-Test (laengere Sessions)
  - Cross-Browser-Test (Safari, Chrome, Firefox)

- [ ] **CODE-DUPLIKATE AUSLAGERN** — host.js/player.js shared Funktionen in js/shared.js
- [ ] **DIFF-BASIERTE BOARD-UPDATES** — nur geaenderte Tiles senden
- [ ] **RATE-LIMITING WEBSOCKET** — max 10 Msg/s pro Client
- [ ] **5-STELLIGER RAUM-CODE** — oder Brute-Force-Sperre
- [ ] **I18N** — DE/EN Sprachauswahl
- [ ] **SETTINGS-MENU** — Sound, Musik, Sprache, Vibration, Account

---

## Done

- [x] **Dodgeball Minispiel** — Komplettes Ausweich-Spiel mit TDD entwickelt: getestete Spiellogik (37 Unit-Tests + 21 Paritaetstests), Baelle von allen Seiten, Spieler-Figur mit Gesicht, Drag-Steuerung, Close-Call-Bonus, Survival-Score, Treffer-Animationen, Game Over bei 3 Treffern, Sound, 30 Sekunden (2026-07-21)

- [x] **Color Catch Minispiel** — Komplettes Korb-Fang-Spiel mit TDD entwickelt: getestete Spiellogik (36 Unit-Tests + 23 Paritaetstests), fallende Farb-Bloecke, Korb-Steuerung durch Ziehen, wechselnde Zielfarbe, Combo-System, Missed-Anzeige, Game-Over, Sound, Animationen (2026-07-21)
- [x] **Ninja Slash Minispiel** — Komplettes Fruit-Ninja-Style-Spiel mit TDD entwickelt: getestete Spiellogik (34 Unit-Tests + 18 Paritaetstests), parabolische Physik, Fruechte schlitzern, Bomben meiden, Combo-System, Missed-Anzeige, Game-Over, Sound, Animationen (2026-07-21)
- [x] **Bubble Pop Minispiel** — Komplettes Farb-Tapping-Spiel mit TDD entwickelt: getestete Spiellogik (25 Unit-Tests + 7 Paritaetstests), wechselnde Zielfarbe, Combo-System, Misses-Anzeige, Game-Over, Sound, Animationen (2026-07-21)
- [x] **Tower Stack Minispiel** — Komplettes Timing-Stack-Spiel mit TDD entwickelt: getestete Spiellogik (23 Unit-Tests + Paritaetstest), UI mit Animation, Sound, Scoring, Game-Over (2026-07-21)
- [x] **3D-Modelle verbessern** — Schatten, 3D-Pawns, prozedurale Texturen, FXAA, Sprite-LOD (2026-07-20)
- [x] **Auto-Reconnect** — net.js mit exponentiellem Backoff + Token-Rejoin (2026-07-20)
- [x] **pid-Bug in player.js** — p.id === pid -> p.id === me.id (2026-07-20)
- [x] **branchChoice-Disconnect** — Server handled offline Spieler waehrend Wegwahl (2026-07-20)
- [x] **WebSocket-Ping alle 30s** — verhindert Render-Timeout (2026-07-20)
- [x] **Doppelter AudioContext** — games.js nutzt FX.ensureCtx() (2026-07-20)
- [x] **setupBoardSlides doppelte Listener** — slidesBound Guard in host.js (2026-07-20)
- [x] **bgCanvas Memory Leak** — 2D-Partikel stoppen bei 3D-Aktiv (2026-07-20)
- [x] **pointerdown No-Op** — setSoundEnabled(true) statt No-Op (2026-07-20)