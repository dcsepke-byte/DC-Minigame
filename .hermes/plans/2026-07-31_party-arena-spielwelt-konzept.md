# Party Arena — Spielwelt-Konzept (erweitert)

**Status:** Konzept fuer Web-App Phase 1 und langfristige UE5-Phase 3
**Angelehnt an:** Party Panic Arena Vision (UE5) + bestehende Party Arena Web-App (HTML/JS/Three.js)
**Ziel:** Einheitliche Spielmarke schaffen, die auf dem Handy sofort funktioniert und spaeter in eine Premium-/AAA-Version ueberfuehrt werden kann.

---

## Grundidee

Die Welt von **Party Arena** ist ein magischer Kontinent namens **Aethonia**, auf dem alle Bewohner Wettkämpfe lieben. Statt Kriege auszutragen oder Konflikte mit Gewalt zu lösen, messen sich die verschiedenen Regionen in Turnieren, Geschicklichkeitsspielen und verrückten Herausforderungen.

Einmal im Jahr findet das **Große PartyArena-Festival** statt. Teams aus allen Regionen reisen an, um Sterne, Trophäen und den Titel des **Arena-Champions** zu gewinnen.

Die Spielwelt soll sich wie ein lebendiges Spielbrett anfühlen — voller Bewegung, Überraschungen und Humor. Dies passt direkt zum bestehenden Board-Modus: Das Spielbrett ist die Reisekarte zwischen den Inseln, Minispiele finden auf den Inseln statt, und das Finale entscheidet in der Sternenzitadelle.

---

## Art Style

### Stilrichtung

- Stylized 3D
- Cartoon
- Toy-like (Spielzeugcharakter)
- High Saturation
- Weiche Formen
- Keine realistischen Texturen
- Runde Kanten
- Sehr lesbare Silhouetten

### Inspirationen (ohne zu kopieren)

- Moderne Partyspiele
- Freizeitparks
- Spielzeugwelten
- Bunte Animationsfilme

### Technische Umsetzung in Web-App Phase 1

- Three.js mit flachen, bunten Materialien (`MeshStandardMaterial` mit niedrigem Roughness)
- Keine hochauflösenden Texturen — Farbe und Form tragen die Identität
- Prozedurale Geometrien (Kugeln, Kapseln, abgerundete Boxen)
- Partikelsysteme für Konfetti, Sterne, Ballons, Schnee, Blätter
- Post-Processing: leichter Bloom für Sterne und Lichter, kein schwerer Realismus

---

## Die Welt

Die Oberwelt besteht aus mehreren **schwebenden Inseln**, die durch Ballons, Luftschiffe, Brücken oder Portale verbunden sind. Jede Insel repräsentiert einen Spielstil und dient als **Biom für Minispiele** und als **Station auf dem Board**.

| # | Insel | Thema | Farben | Board-Effekt | Minispiel-Beispiele |
|---|---|---|---|---|---|
| 1 | Sonnenstrand | Urlaub & Wasser | Türkis, Sandgelb, Korallenrot | Bonus auf Bewegung | Bootsrennen, Kokosnuss-Weitwurf, Surfen, Schatzsuche |
| 2 | Zuckerwald | Süßigkeiten-Paradies | Rosa, Schokobraun, Mintgrün | Zufallsbonbons | Keks-Balance, Donut-Dash, Schokoladenfluss |
| 3 | Wolkenwerk | Schwebende Himmel | Hellblau, Weiß, Regenbogen | Flug-Sprünge | Ballonrennen, Propeller-Hindernis, Wolken-Springen |
| 4 | Frostgipfel | Eis & Schnee | Eisblau, Weiß, Violett | Rutschgefahr | Eis-Bowling, Schneball-Schlacht, Eisbrücken-Lauf |
| 5 | Dschungeltempel | Ruinen & Abenteuer | Dschungelgrün, Gold, Braun | Geheime Pfade | Lianen-Schwingen, Wasserfall-Sprung, Affen-Jagd |
| 6 | Mechanik-Stadt | Spielzeug-Technik | Silber, Orange, Gelb | Förderbänder | Zahnrad-Rennen, Roboter-Dash, Dampf-Block |
| 7 | Sternenzitadelle | Finale & Endgame | Gold, Tiefblau, Magenta | Doppelte Sterne | Arena-Champion-Runde, letzte Herausforderung |

### Verbindung zum Board-Modus

- Jede Insel ist ein **Feld-Typ** auf dem Spielbrett.
- Spieler reisen von Insel zu Insel und lösen dort **Minispiele** aus.
- Die **Sternenzitadelle** ist das Endfeld: Wer zuerst mit den meisten Sternen ankommt, gewinnt.
- Insel-Symbole und Farben werden im Board-HUD, im Shop und in der Figuren-Auswahl verwendet.

---

## Bewohner

Die Bewohner heißen **Arenians**. Sie bestehen aus einfachen, gut lesbaren Formen und sind bewusst **nicht an Menschen** angelehnt.

### Gemeinsamkeiten

- Große Köpfe
- Große Augen
- Kleine Körper
- Große Hände
- Klare Silhouetten
- Keine sichtbaren Gelenke (Puppet-Style)

### NPCs auf dem Board

- **ArenaStar** — leuchtender Stern mit Krone, erklärt Regeln, moderiert, verteilt Belohnungen
- **Hüpfende Schleime** — verspielte Hindernisse in Minispielen
- **Freche Krähen** — stehlen manchmal Münzen, bringen aber auch Geschenke
- **Windgeister** — beeinflussen Bewegung auf dem Board
- **Lebende Pflanzen** — winken, lächeln, reagieren auf Spieler

---

## Spielbare Charaktere

Die 8 Spielfiguren der App werden zu **Arenians** mit eigenem Hintergrund, Heimat-Insel und Farbe. Die bestehenden 8 Spielerfarben bleiben erhalten:

| Name | Typ | Heimat | Persönlichkeit | Farbe |
|---|---|---|---|---|
| Brix | Stein-Golem | Mechanik-Stadt | mutig, ehrlich, tollpatschig | Orange (#ff6a00) |
| Nixie | Axolotl | Sonnenstrand | neugierig, fröhlich, wasseraffin | Türkis (#00f0ff) |
| Pip | Fliegendes Eichhörnchen | Wolkenwerk | schnell, frech, agil | Gelb (#ffd34e) |
| Koko | Panda | Zuckerwald | freundlich, gemütlich, überraschend stark | Rosa (#ff4d6d) |
| Tiko | Vogel | Dschungeltempel | chaotisch, lustig, gut gelaunt | Grün (#2bffb9) |
| Bolt | Roboter | Mechanik-Stadt | logisch, präzise, technisch | Blau (#3a86ff) |
| Bloom | Wandelnder Kaktus | Dschungeltempel | ruhig, gelassen, humorvoll | Lila (#7b2ff7) |
| Momo | Waschbär | Frostgipfel | clever, trickreich, sammelt Schätze | Pink (#ff3cac) |

**Web-App Umsetzung:** Die Figuren werden zuerst als 3D-Primitive oder Emoji-Sprites dargestellt. Jede Figur erhält:
- eigene Farbe
- ein Symbol/Emoji
- einen kurzen Flavor-Text im Shop
- optional eine kleine Animation (Wackeln, Hüpfen)

---

## Gegner & Hindernisse

Es gibt keine klassischen Bösewichte. Stattdessen sorgen verspielte Hindernisse für Chaos:

- Hüpfende Schleime
- Freche Krähen
- Laufende Kisten
- Windgeister
- Freche Affen
- Kleine Roboter
- Lebendige Pflanzen

In Minispielen dienen sie als mobile Hindernisse, im Board-Modus als Event-Trigger ("Ein Windgeist weht dich 3 Felder zurück!").

---

## Maskottchen

**ArenaStar**

- Ein leuchtender Stern mit schwebender Krone.
- Erklärt Regeln in Tutorials.
- Moderiert Turniere.
- Verteilt Belohnungen.
- Begleitet Events.
- Ist das Gesicht von PartyArena und sorgt für Wiedererkennung.

**Web-App Umsetzung:**
- ArenaStar erscheint im Hauptmenü, beim Tutorial und im Sieger-Screen.
- Spricht kurze Textblasen mit i18n-Unterstützung.
- Animation: sanftes Pulsieren und Schweben.

---

## Währungen

| Währung | Verwendung | Quelle |
|---|---|---|
| Sterne | Turnierpunkte, Siegbedingung im Board-Modus | Minispiele gewinnen, Bonusfelder |
| Münzen | Shop-Käufe (Charaktere, Trails, Skins) | Minispiele, tägliche Belohnung |
| Arena-Tickets | Event-Modi, Turniere, wöchentliche Challenges | Login-Streak, Achievements |
| Kristalle | Seltene Belohnung, Premium-Inhalte | besondere Achievements, Events |

**Bestehende App:** Sterne und Münzen sind bereits im Meta-Progression-System vorhanden. Arena-Tickets und Kristalle werden als Erweiterung ergänzt.

---

## Architektur

Alles wirkt wie ein Spielzeug:

- Runde Dächer
- Bunte Fenster
- Fahnen
- Luftballons
- Holzdetails
- Übergroße Zahnräder
- Leuchtende Farben

### Web-App Umsetzung

- Gebäude und Dekoration als 3D-Primitive in Three.js
- Jedes Biom hat ein eigenes **Tile-Set** (Sonnenstrand = Holzstege, Palmen, Schirm / Zuckerwald = Kekse, Lutscher, Donuts)
- Board-Felder werden visuell als kleine Insel-Fragmente dargestellt

---

## Vegetation

Die Pflanzen sind lebendig und freundlich:

- Blumen winken
- Bäume lächeln
- Pilze hüpfen leicht
- Gras bewegt sich übertrieben
- Büsche haben Gesichter

**Web-App Umsetzung:**
- Einfache Pflanzen-Geometrien mit Idle-Animation (Sinus-Wackeln, Skalieren)
- Partikeleffekte für Pollen, Blütenblätter, Schneeflocken pro Biom

---

## Atmosphäre

Die Welt soll sich ständig lebendig anfühlen:

- Luftballons treiben vorbei
- Konfetti wirbelt durch die Luft
- Windmühlen drehen sich
- NPCs jubeln und tanzen
- Feuerwerke markieren Turniersiege
- Überall laufen kleine Animationen im Hintergrund

**Web-App Umsetzung:**
- Hintergrund-Loop-Animationen im Hauptmenü und Board
- Event-Partikel bei Sternen-Gewinn, Sieg, Level-Up
- Ambiente Sound-Effekte (Meeresrauschen, Wind, Maschinen)

---

## Designprinzipien

Jedes Element folgt vier Regeln:

1. **Sofort verständlich** — Der Spieler erkennt auf den ersten Blick, was ein Objekt oder Charakter ist.
2. **Überzeichnet statt realistisch** — Große Formen, klare Farben und humorvolle Proportionen.
3. **Interaktiv wirkend** — Fast alles bewegt sich leicht oder reagiert auf die Umgebung.
4. **Wiedererkennbar** — Jede Welt, Figur und jedes Objekt besitzt eine eigene Farbpalette und markante Silhouette.

So entsteht eine eigenständige Identität für PartyArena: ein fröhliches Universum, das den Charme klassischer Partyspiele einfängt, ohne sich auf bestehende Marken oder deren Figuren zu stützen. Mit einem starken Maskottchen wie ArenaStar, klar unterscheidbaren Regionen und einem konsistenten visuellen Stil kann sich daraus eine eigene, langfristig ausbaubare Spielmarke entwickeln.

---

## Anpassung an bestehendes Konzept

### Was aus Party Panic Arena (UE5) übernommen wird

| Konzept-Element | Web-App Version |
|---|---|
| 8+ spielbare Charaktere | 8 Arenians mit Farbe, Heimat-Insel, Emoji/Sprite |
| 8 Biome / Arenen | 7 schwebende Inseln + Sternenzitadelle |
| Modulare Minispiele | `js/games.js` erweitert, pro Insel eigene Spiele |
| Meta-Progression | Sterne, Münzen, Arena-Tickets, Kristalle |
| Maskottchen | ArenaStar im Menü, Tutorial, Sieger-Screen |
| Dynamische Kamera | Three.js-Kamera pro Minispiel vorbereitet |

### Was zuerst in der Web-App umgesetzt wird

1. **Board-Visuale:** Spielbrett als schwebende Insel-Route mit Biom-Farben.
2. **Charakter-Shop:** 8 Arenians freischaltbar, jede mit Farbe, Heimat, Beschreibung.
3. **Biom-Screens:** Minispiel-Intro zeigt die aktuelle Insel als Hintergrund.
4. **ArenaStar:** Tutorial-Overlay und Willkommens-Animation im Hauptmenü.
5. **Atmosphäre:** Hintergrund-Partikel, Ambiente-Sounds, leichte Geometrie-Animationen.

### Was für Phase 3 (UE5 / AAA) reserviert bleibt

- Voll geriggte 3D-Charaktere mit Animationen
- Echte 60×60-Meter-Arenen
- Nanite / Lumen
- Steam Workshop
- Cross-Play
- Lokaler Splitscreen

---

## Nächste Schritte

1. Die 8 Charaktere in `js/player.js` Shop und Figuren-Auswahl als Arenians abbilden.
2. 7 Inseln als Board-Biome definieren und Felder farblich zuordnen.
3. Pro Insel 2–3 Minispiel-Ideen priorisieren und in `BACKLOG.md` ergänzen.
4. ArenaStar als Maskottchen im Hauptmenü hinzufügen (Overlay + Animation).
5. Ambiente-Partikel und Biom-Hintergründe für Board und Menü erstellen.

---

*Erstellt: 2026-07-31*
*Verknüpft mit: `2026-07-28_party-panic-arena-concept-adaptation.md`, `BACKLOG.md`*
