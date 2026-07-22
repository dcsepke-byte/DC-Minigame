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
  - [x] **Quick Draw Duel** — Western-Duell: waechst bis Signal, dann schnellstes Tippen (2026-07-22)
  - [x] **Rhythm Tap** — Im Takt tippen, Combo-Multiplikator, BPM-basierte Beats, Perfect/Good/Early/Late (2026-07-22)
  - [x] **Coin Dash** — Muenzen sammeln, Gegner ausweichen, Power-Ups nutzen (2026-07-22)
  - [x] **Tile Flip** — Memory-Puzzle mit Boostern, gegen die Zeit (2026-07-22)
  - Alte simple Spiele behalten als "Classic Mix", neue als "Action Mix"

- [~] **META-PROGRESSION SYSTEM** — Kern fuer Suchtpotenzial:
  - [x] **XP & Level-System** — XP aus Minispielen (sqrt-basiert, diminishing returns), progressive Level-Kurve (1.5x), Level-Up gibt Sterne (2026-07-22)
  - [x] **Sternen-Waehrung** — Sterne aus Platzierung (1.=5, 2.=3, 3.=2, 4.+=1) und Level-Up, gespeichert in localStorage (2026-07-22)
  - [x] **Achievement-System** — 10 Achievements: first_game, veteran_10/50, level_5/10/25, star_collector_50/200, high_scorer, dedicated (2026-07-22)
  - [x] **Unlock-Shop Logik** — 8 Charaktere + 3 Trails, Default-Rakete kostenlos, Sterne als Waehrung (2026-07-22)
  - [x] **Lobby-Anzeige** — Level, XP-Bar, Sterne, Spiele-Anzahl, Achievement-Zaeler in der Lobby (2026-07-22)
  - [x] **Daily Challenge** — taegliches Minispiel mit Bonus (2026-07-22)
  - [x] **Unlock-Shop UI** — Charakter-Auswahl im Browser (Logik fertig, UI fehlt) (2026-07-22)

- [x] **ONBOARDING / TUTORIAL** — Erste-Session-Erlebnis mit TDD entwickelt: getestete Spiellogik (22 Unit-Tests + 15 Paritaetstests), 5 Tutorial-Schritte (Welcome, Spieler hinzufuegen, Spiele auswaehlen, Spiel starten, Daily Challenge), Glassmorphism-Overlay mit Progress-Bar, Target-Highlighting mit Pfeil und Pulsing-Glow, Schritt-Dots, Skip-Funktion, localStorage-Persistenz (2026-07-22)

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

- [x] **Meta-Progression System (Kern)** — Komplettes XP/Level/Sterne/Achievement/Unlock-System mit TDD entwickelt: getestete Spiellogik (80 Unit-Tests + 38 Paritaetstests), progressive XP-Kurve (1.5x pro Level), XP aus Minispiel-Score mit Diminishing Returns (sqrt), Sterne aus Platzierung + Level-Up, 10 Achievements, 8 Charaktere + 3 Trails als Unlocks, Lobby-Anzeige mit XP-Bar, localStorage-Persistenz, ESM + IIFE Browser-Version (2026-07-22)

- [x] **Tile Flip Minispiel** — Komplettes Memory-Puzzle mit TDD entwickelt: getestete Spiellogik (25 Unit-Tests + 10 Paritaetstests), 4x4 Kachel-Grid mit 8 Paaren, 3D-Flip-Animationen, Combo-System (aufeinanderfolgende Matches geben mehr Punkte), 3 Booster (Peek/Shuffle/Freeze), Zeitbonus bei Completion, 60 Sekunden, Sound, Feedback-Animationen (2026-07-22)

- [x] **Coin Dash Minispiel** — Komplettes Sammel-Ausweich-Spiel mit TDD entwickelt: getestete Spiellogik (30 Unit-Tests + 10 Paritaetstests), Drag-Steuerung, Muenzen sammeln mit Combo-System (bis 4x Multiplikator), rote Gegner ausweichen (3 Leben), 4 Power-Ups (Magnet/Schild/Speed/Freeze), Canvas-Rendering mit Gesichtern, Sound, Animationen, 30 Sekunden (2026-07-22)

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