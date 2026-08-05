# Party Arena — Tileset Bible (Band 1)

**Datum:** 2026-08-05
**Status:** Fundament (Version 1.0)
**Autor:** Hermes (im Auftrag von Danny)
**Zweck:** Vollständiges, konsistentes eigenes Asset-System für PartyArena — unabhängig von Kenney.

---

## 1. Technische Vorgaben (fix)

| Eigenschaft | Wert |
|---|---|
| **Tilegröße** | 32 × 32 px (Performance-Optimierung ggü. 64; 16 optional für Retro-Deko) |
| **Perspektive** | Top-Down (90°), KEINE Isometrie |
| **Pixel Perfect** | Ja (scharfe Kanten, keine Verwischung) |
| **Farben pro Region** | Max. 24–32, hoher Kontrast, klare Schatten, KEINE Farbverläufe |
| **Outlines** | Dunkelbraun statt Schwarz, 1 px breit |
| **Licht** | IMMER von links oben → Schatten IMMER rechts unten |

### Farb-Prinzip
- Einheitliche Beleuchtungsrichtung: **Highlight links-oben, Schatten rechts-unten**.
- Jede Region hat eine feste **Palette** (24–32 Farben), abgelegt im `palettes/`-Ordner.
- Schatten = abgedunkelte Grundfarbe (ca. 60–70 % Helligkeit), nie schwarz.

---

## 2. Tile-ID & Benennungskonvention

**Format:** `<Kategorie>_<ID>_<Variante>[_<Ort>]`

Beispiel:
- `Tree_01_Oak` → Baum, Index 01, Eiche
- `Sand_05_WaterEdge_N` → Sand, 05, Wasserkante Nord
- `Building_03_Roof_TL` → Gebäude, 03, Dach Ecke oben-links

### Kategorien (Präfixe)
| Präfix | Kategorie |
|---|---|
| `Grass` | Gras / Boden |
| `Sand` | Sand / Strand |
| `Water` | Wasser |
| `Tree` | Bäume |
| `Plant` | Pflanzen / Büsche / Pilze |
| `Rock` | Steine / Felsen / Berge |
| `Building` | Gebäude (Dach/Wand/Tür/Fenster) |
| `Prop` | Deko (Fass, Kiste, Zaun, Laterne…) |
| `Road` | Wege / Pfade |
| `Bridge` | Brücken |
| `Mountain` | Berge |
| `Dungeon` | Dungeon-Tiles |

### Richtungs-Suffixe (für Kanten/Autotile)
- `N` / `S` / `E` / `W` (Nord/Süd/Ost/West)
- `NE` / `NW` / `SE` / `SW` (Ecken)
- `TL` / `TR` / `BL` / `BR` (Multi-Tile-Quadrat: oben-links etc.)

---

## 3. Tile-Registry (jedes Tile dokumentiert)

Jedes Tile wird in `registry/tiles.md` (oder JSON) mit folgendem Schema erfasst:

```yaml
tile_id: Tree_01_Oak
kategorie: Baum
groesse: 32x32
beschreibung: Eiche, runde Krone, 70% der Tilehöhe
verwendung: Wald, Park
nachbar_tiles: [Grass_00, Tree_01_Oak_Trunk]
layer: Object        # Ground | Object | Roof | Overlay
kollision: Stamm blockiert, Blätter nicht
animation: keine
varianten: [Tree_01_Oak_Autumn, Tree_01_Oak_Spring]
palette: Nature
empfohlene_nutzung: Dichte Wälder, Baumreihen
```

**Layers:**
- `Ground` — Boden (Gras, Sand, Wasser, Weg)
- `Object` — stehende Objekte (Bäume, Felsen, Häuser)
- `Roof` — überlagernd (Dächer, Baumkronen)
- `Overlay` — transparente Deko (Blumen, Schatten)

---

## 4. Autotile-Regeln

Für Wege, Wasser, Klippen (automatische Kanten-Erkennung):

### Straßen / Wege (Bitmask-16 Autotile)
Jeder Weg-Tile hat **4 Bits** (N/S/E/W): 1 = verbunden. Daraus ergeben sich:
- Gerade (NS, EW)
- Ecken (NE, NW, SE, SW)
- Kreuzungen (NSEW, NES, NSW, ESW, NEW)
- Enden (N, S, E, W)
- Einzeln (keine Verbindung)

→ 16 Basis-Varianten pro Weg-Typ.

### Wasser (Kanten-Autotile)
Wasser-Tile prüft Nachbarn: je nach angrenzendem Land/Wasser wird die **Uferlinie** gezeichnet (weicher Übergang, 1–2 px).

### Klippen / Höhen
Höhenübergang braucht Oberkante + Schatten (rechts unten) für den 3D-Effekt.

---

## 5. Regionen-Paletten (Soll-Kontingent)

| Region | Theme | Tiles-Soll | Paletten-Charakter |
|---|---|---|---|
| **Sonnenstrand** | Sand, Palmen, Strand | 150–200 | warm, gelb/sand/türkis |
| **Zuckerwald** | Bonbons, Keks, Lolli | ~200 | pink, creme, pastell |
| **Wolkenwerk** | Wolken, Ballons, Himmel | ~180 | hellblau, weiß, regenbogen |
| **Frostgipfel** | Schnee, Eis, Tannen | ~180 | kalt, weiß, eisblau |
| **Dschungeltempel** | Tempel, Lianen, Ruinen | ~200 | sattgrün, steingrau |
| **Mechanik-Stadt** | Zahnräder, Rohre, Fabrik | ~250 | metallgrau, orange |
| **Sternenzitadelle** | Marmor, Gold, Kristalle | ~250 | gold, weiß, violett |
| **Gesamt** | | **~1.300–1.500** | |

---

## 6. Asset-Pack-Struktur (Module)

```
assets/custom-tiles-32/
  ground/        (Gras, Sand, Wasser, Boden-Details)
  trees/         (Bäume als Multi-Tile 2x2 + Einzel)
  plants/        (Blumen, Büsche, Pilze, Farne)
  buildings/     (Dächer, Wände, Türen, Fenster)
  props/         (Fässer, Kisten, Zäune, Laternen)
  bridges/       (Brücken, Stege)
  mountains/     (Felsen, Berge)
  region-sonnenstrand/
  region-zuckerwald/
  ...
palettes/        (eine .json/.md Palette pro Region)
registry/        (tiles.md — vollständige Dokumentation)
```

**Build-Prinzip:** Region für Region. Erst Sonnenstrand pilotieren, dann Framework für die anderen wiederverwenden.

---

## 7. Verifikation (jedes Pack)

- [ ] Pixel-Perfect (32×32, keine halben Pixel)
- [ ] Licht konsistent (links-oben hell, rechts-unten Schatten)
- [ ] Outlines dunkelbraun, 1px
- [ ] Max. 32 Farben pro Region
- [ ] Alle Nachbar-Kanten nahtlos (Autotile geprüft)
- [ ] Multi-Tile-Objekte lückenlos zusammengesetzt
- [ ] In Registry dokumentiert
