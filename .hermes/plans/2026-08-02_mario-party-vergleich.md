# Mario Party vs. Party Arena — Feature-Vergleich

**Datum:** 2026-08-02 · **Quellen:** Wikipedia (Mario-Party-Serie), Nintendo, Game-Dev-Analysen

---

## Kern-Loop (gleich)

| | Mario Party | Party Arena |
|---|---|---|
| Brettspiel + Minispiele | ✅ | ✅ |
| Würfeln → Ziehen → Minispiel pro Runde | ✅ | ✅ |
| Sieger = meisten Sterne (+ Münzen) | ✅ | ✅ |

## Unterschiede

| # | Feature | Mario Party | Party Arena | Priorität |
|---|---|---|---|---|
| 1 | **Spielbretter** | 5–8 Boards pro Spiel, eigene Layouts/Gimmicks | 1 Board (8-Segment-Kleeblatt) | 🔴 Hoch |
| 2 | **Stern-Kauf** | Sterne kaufen (20 Münzen), Stern zieht nach Kauf um | Sterne nur aus Platzierung/Level-Up, kein Kauf | 🔴 Hoch |
| 3 | **Feld-Typen** | Blau (+Münzen), Rot (−Münzen), ? (Zufall), Bowser (Strafe), Stern, Item-Shop, Chance | Tiles + Verzweigungen, Bio-Effekte; keine Münz-/Bowser-/Chance-Felder | 🔴 Hoch |
| 4 | **Items** | Capsules/Orbs/Kandis: Extra-Wurf, Teleport, Fallen | Kein Item-System (Shop verkauft nur Charaktere/Trails) | 🔴 Hoch |
| 5 | **Bonus-Sterne** | Am Ende: meist Minigame-Siege / meiste Münzen / meiste Felder | Fehlt | 🟠 Mittel |
| 6 | **Minigame-Formate** | 4p FFA, 2v2, 1v3, Duel, Boss-Kämpfe | FFA + Quiz-Duell, keine Teams | 🟠 Mittel |
| 7 | **Charakter-Roster** | 10–22 Charaktere, Unlocks via Challenges | 8 Arenians, Shop-Unlocks (preis 0-50 Sterne) | 🟠 Mittel |
| 8 | **CPU-Gegner** | Ja (0–3 CPUs) | Nein — mind. 2 menschliche Spieler nötig | 🟠 Mittel |
| 9 | **Hub-Welt** | Vollständige 3D-Hub (Plaza, Shops, Minigame-Haus, Charakter-Bereich) | Menü = 3D-Welt-Vorschau, nicht interaktiv | 🟠 Mittel |
| 10 | **Minigame-Standalone-Modus** | Freies Spiel, Üben, Turnier, Decathlon | Solo-Modus (Daily/Duell) existiert | 🟡 Niedrig |
| 11 | **Event-Gimmicks** | Bowser-Events, Tag/Nacht-Zyklus (MP6), Jamboree-Buddies, Boss-Runden | Fehlt | 🟡 Niedrig |
| 12 | **Charakter-Vorschau** | Charakter steht groß im Select-Screen | Kommt jetzt (Vorschau-Panel) | ✅ In Arbeit |
| 13 | **Online** | Superstars/Jamboree: voller Online-Multiplayer | WebSocket-Mehrspieler (Raum-Code), kein Matchmaking | 🟡 Niedrig |
| 14 | **Runden-Länge** | 20/40/60 Züge | Runden-Stepper (Default 5) | 🟡 Niedrig |
| 15 | **Würfel** | 1–10 + Item-Würfel | 1–6 (Standard) | 🟡 Niedrig |

## Was Party Arena BESSER/Konzept-eigen macht

- **Eigene IP:** 8 Arenians mit Heimat-Insel, Persönlichkeit und Farben (nicht Nintendo-IP)
- **Handy-als-Controller:** Host-Bildschirm + Spieler-Handys (Mario Party: alle am selben Gerät)
- **Meta-Progression:** XP, Level, Sterne, Achievements, Shop (langfristige Motivation)
- **Welt-Konzept:** Festival-Hub + Themeninseln + Kristallhöhlen + Geheiminsel (Open-World-Plan für UE5)
- **3D-Welt im Menü:** tanzende Charaktere + wandernde Kamera (Mario-Party-ähnlich, aber eigen)

## Empfehlung (nächste Schritte)

1. **Sterne-Kauf + ziehender Stern** — das Herz der Mario-Party-Spannung (🔴)
2. **Mehr Feld-Typen:** Münz-Felder (+/−), ?-Felder, Event-Felder (🔴)
3. **2. Spielbrett** (z.B. Sonnenstrand als anderes Layout) (🔴)
4. **Bonus-Sterne am Ende** — billig zu bauen, hoher Wiederspielwert (🟠)
5. **CPU-Gegner** — macht Solo-Spiel möglich (🟠)
6. **Items** (Extra-Wurf, Teleport, Falle) (🟠)

*Erstellt: 2026-08-02 · Ablage: .hermes/plans/2026-08-02_mario-party-vergleich.md*
