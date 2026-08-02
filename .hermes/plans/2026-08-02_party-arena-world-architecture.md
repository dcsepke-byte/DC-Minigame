# Party Arena — World Architecture (Welt-Architektur)

**Status:** Konzept, von Danny definiert (2026-08-02)
**Zielplattform:** UE5 (Phase 3) mit World Partition + Data Layers; Web-App Phase 1 folgt demselben Schema skaliert
**Verknüpft mit:** `2026-07-31_party-arena-spielwelt-konzept.md`, `2026-07-28_party-panic-arena-concept-adaptation.md`

---

## Grundprinzip

> Erst kommt die Struktur der Welt, dann werden einzelne Regionen gebaut.
> (So arbeiten große Studios.)

Die Welt besteht aus schwebenden Inseln, die wie Themenparks aufgebaut sind.
Jede Insel ist in sich geschlossen und besitzt einen klaren visuellen Stil.

---

## Welt-Schema

```
                    ┌────────────────────┐
                    │  Sternenzitadelle  │
                    │   (Festival Hub)   │
                    └─────────┬──────────┘
                              │
                Portal / Luftschiff-Netz
                              │
 ┌──────────────┬─────────────┼──────────────┬──────────────┐
 │              │             │              │              │
 ▼              ▼             ▼              ▼              ▼

Sonnenstrand  Zuckerwald  Wolkenwerk  Frostgipfel  Mechanik-Stadt
      │             │            │             │              │
      └──────┬──────┴─────┬──────┴──────┬──────┴──────────────┘
             │            │             │
             ▼            ▼             ▼

       Dschungeltempel   Kristallhöhlen
                │
                ▼
          Geheiminsel
```

- **Sternenzitadelle = Festival Hub** (zentral, oben)
- 5 Haupt-Themeninseln: Sonnenstrand, Zuckerwald, Wolkenwerk, Frostgipfel, Mechanik-Stadt
- Darunter: Dschungeltempel + Kristallhöhlen (neu)
- Ganz unten: Geheiminsel (neu)
- Verbindung über **Portal / Luftschiff-Netz**

---

## Weltaufbau — 3 Ebenen

### Ebene 0 – Der Himmel
- Wolken
- Fliegende Inseln
- Luftschiffe
- Ballons
- Vögel
- Sonnenlicht
- Wettereffekte

### Ebene 1 – Hauptinsel (Festival Plaza)
Hier befinden sich:
- Festival Plaza
- Charakterauswahl
- Shops
- Tutorials
- Portalplatz
- Ranglisten
- Eventgebäude

Diese Insel ist der **zentrale Hub**, den der Spieler zwischen den Partien besucht.

### Ebene 2 – Themeninseln
Jede Themeninsel enthält:
- Spielbrett
- Minispiele
- NPCs
- Dekoration
- Sammelobjekte
- eigene Musik
- eigene Atmosphäre

**Beispiel Sonnenstrand:**

```
Palmen
██████████
Sandstrand
~~~~~~~~~~
Meer
~~~
```

---

## Größen (Richtwerte UE5)

| Bereich | Größe |
|---|---|
| Hubinsel | 800 × 800 Meter |
| Themeninseln | 500 × 500 Meter |
| Kleine Nebeninseln | 100 × 200 Meter |
| Spielbrett | 250 × 250 Meter |

---

## Einheitliche Insel-Struktur

Jede Insel besitzt dieselbe Grundstruktur:

```
           Eingang
               │
       Begrüßungsplatz
               │
      Hauptweg / Rundweg
      ┌──────────────┐
Minispiele      Spielbrett
      │              │
 Shop          Aussichtspunkt
      └──────┬───────┘
           Ausgang
```

---

## Spielbrett (modular)

Jedes Brett wird modular aufgebaut:

```
            Ziel
             ▲
      ○──○──○──○
      │       │
      ○       ○
      │       │
○──○──○       ○──○
│
○──○──○──○──○
Start
```

- Jeder Kreis = ein einzelnes Spielfeld
- Wege können sich verzweigen und später wieder zusammenführen

---

## Baustruktur je Region

Jede Region wird nach demselben Schema aufgebaut:

```
Region
│
├── Terrain
├── Vegetation
├── Architektur
├── Props
├── NPCs
├── Partikeleffekte
├── Audio
├── Spielbrett
├── Minispiele
└── Geheimnisse
```

---

## Bau-Reihenfolge

1. Hubwelt (Festival Plaza)
2. Sonnenstrand — einfache Geometrie, ideal zum Testen
3. Erstes Spielbrett — grundlegende Mechaniken
4. Erstes Minispiel — vollständiger Gameplay-Loop
5. Charaktere
6. Weitere Themeninseln
7. Online-Mehrspieler
8. Feinschliff und Inhalte

---

## Empfehlung (Danny)

> Die Welt **nicht** als sieben voneinander getrennte Karten bauen, sondern als
> eine **zusammenhängende Open-World-Hub-Welt**, in der die Themeninseln über
> Portale, Luftschiffe oder Brücken erreichbar sind.

Vorteile:
- Stärkeres Zusammengehörigkeitsgefühl
- Erleichtert spätere Erweiterungen (neue Inseln, saisonale Events)
- Sehr gut für UE5 geeignet: **World Partition + Data Layers** → Regionen
  unabhängig laden und erweitern

---

## Abgrenzung / Ergänzung zum bisherigen Konzept

- Bisher: 7 Inseln (Sonnenstrand, Zuckerwald, Wolkenwerk, Frostgipfel,
  Dschungeltempel, Mechanik-Stadt, Sternenzitadelle als Endfeld)
- Neu durch dieses Konzept:
  - **Sternenzitadelle wird Festival Hub** (statt nur Endfeld)
  - **Kristallhöhlen** als zusätzliche Insel
  - **Geheiminsel** als Bonus-/Secret-Region
  - Klare 3-Ebenen-Hierarchie + einheitliche Insel- & Brett-Struktur
  - UE5-Größenrichtwerte + Data-Layer-Architektur
- Web-App (Phase 1): Das Schema skaliert auf die bestehende Board-Route
  (8 Kleeblatt-Segmente). Das Hauptmenü-Showcase zeigt bereits die
  Mini-Aethonia-Welt (7 Inseln + ArenaStar) — als Vorschau auf diese Struktur.

*Erstellt: 2026-08-02 von Danny Csepke*
