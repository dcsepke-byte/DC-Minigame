# Party Arena — Kompletter Neuaufbau (Welt + Board + UI)

**Stand:** 2026-08-06
**Auftrag (Danny):** Alles neu entwickeln, altes Design vergessen. Sinnvolle schöne Welt mit vielen Details, Biome klar erkennbar, Felder hübsch passend. 160 Felder mit Verzweigungen + verschiedenen Funktionen. Shop-Feld = optisch vor Shop mit Schaufenster. Rucksack/Inventar am Bildschirm. Ereignis-Popup. Alles stimmig zum neuen Design.

## Vision (aus Konzept + Game-Design-Skill)
- **Aethonia:** magischer Kontinent, 7 schwebende Inseln + Sternenzitadelle
- **8 Arenians** (Brix, Nixie, Pip, Koko, Tiko, Bolt, Bloom, Momo) mit Heimat-Inseln
- **Biome:** Sonnenstrand, Zuckerwald, Wolkenwerk, Frostgipfel, Dschungeltempel, Mechanik-Stadt, Sternenzitadelle
- **2D-Cartoon-Look** (Canvas-2D, kein 3D-Primitive-Mix)
- **Mario-Party-Prinzipien:** Catch-up, kluges Spiel belohnen, konstanter Rhythmus, semi-opake Wertung, Risiken

## Architektur-Entscheidung
- **Board als 2D-Canvas-Weltkarte** (nicht 3D, nicht das alte Kleeblatt)
- **160 Felder** auf einer generierten Insel-Welt, durch 8 Biome
- **Verzweigungen** an Junctions (Spieler wählt)
- **Feld-Typen:** Start, Eigentum (Minispiel), Ereignis, Stern-Shop, Item-Shop, Glück/Pech, Münz-Bonus, Junction
- **Neue UI:** Shop-Feld mit Schaufenster, Rucksack/Inventar, Ereignis-Popup

## Phasen
1. **Welt-Generierung** (Server): 160 Felder, 8 Biome, Verzweigungen, Feld-Typen
2. **Board-Rendering** (2D-Canvas): Weltkarte mit Biomen, Feldern, Wegen, Deko
3. **Feld-Funktionen** (Server): Shop, Ereignis, Stern, Item, Bonus, Eigentum
4. **Shop-UI** (Player): Schaufenster mit Items
5. **Rucksack/Inventar** (Player): Gegenstände ansehen/benutzen
6. **Ereignis-Popup** (Player): bei Ereignis-Feld
7. **Stimmiges Design** (CSS): alles an neues Welt-Design angepasst
8. **Test + Deploy + Notion**

## Technische Notizen
- Server: `server.py` — Board-Generierung + Feld-Logik
- Player-UI: `player.html` + `js/player.js` + `css/styles.css`
- Board-Render: `js/board-2d.js` (2D-Canvas) — wird zum Haupt-Renderer
- Cache-Busting: `?v=N` nach Änderungen
- E2E-Bot: `tests/e2e_bot_v3.py`
