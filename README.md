# Party Arena

Party Arena ist eine browserbasierte Multiplayer-Minispielsammlung mit Host-Ansicht und Handy-Clients.

## Features

- Host erstellt einen Raumcode und startet das Spiel.
- Spieler treten per Code über ihr Handy bei.
- 14 Minispiele (Reaktion, Memory, Mathe, Tap, Zieljagd, usw.).
- Zwei Modi:
- Classic: normale Rundensequenz mit Sternen-/Punktwertung.
- Board-Party: Mario-Party-artiger Brettspielmodus mit Würfeln, Feldern, Sternen, Items und Duellen.
- Reconnect-Mechanik für Host/Spieler.
- Vollbild-Option für den Host.

## Projektstruktur

- `server.py`: HTTP + WebSocket Server (Python Standardbibliothek)
- `host.html`: Host-Oberfläche
- `player.html`: Spieler-Oberfläche
- `index.html`: Solo-/lokale Variante
- `js/`: Spiel-, Netzwerk- und UI-Logik
- `css/styles.css`: komplettes UI- und Animations-Stylesheet
- `render.yaml`: Render-Deployment-Konfiguration

## Lokaler Start

Voraussetzung: Python 3.10+

```bash
python server.py
```

Danach im Browser:

- Host: `http://localhost:3000/host`
- Spieler: `http://<DEINE-LAN-IP>:3000/`

Hinweis: Im gleichen WLAN testen.

## Kurzanleitung

1. Host öffnet `/host` und erhält einen 4-stelligen Raumcode.
2. Spieler öffnen die angezeigte URL, geben Name/Figur/Code ein und treten bei.
3. Host stellt Runden, Modus und aktive Spiele ein.
4. Host startet das Spiel.
5. Nach jeder Runde werden Punkte und Sterne ausgewertet.
6. Nach der letzten Runde erscheint die Siegerehrung.

## Spielmodi

### Classic

- Runde besteht aus einem ausgewählten Minispiel.
- Alle Teilnehmer spielen das gleiche Minispiel.
- Rundensieger bekommt Stern(e).
- Gesamtwertung nach Sternen, danach Punkten.

### Monopoly

- Spieler bewegen Figuren auf einem Board.
- Felder können gekauft werden.
- Bei gegnerischem Feld: Miete zahlen oder Duell.
- Ereignisfelder lösen Spezialeffekte aus.
- Zwischenphasen können globale Minispielrunden auslösen.

## Minispiele (Kurzbeschreibung)

- Reaktion: tippen, sobald grün.
- Memory-Sequenz: Muster merken und wiederholen.
- Blitz-Rechnen: richtige Lösung wählen.
- Tap-Wahnsinn: möglichst viele Taps in kurzer Zeit.
- Ziel-Jagd: Ziele treffen, Bomben meiden.
- Farben-Chaos: Stroop-Prinzip.
- Präzisions-Stopp: Cursor in der Mitte stoppen.
- Bomben-Code: Zahlenfolge merken und eingeben.
- Zahlen-Jagd: Zahlen in richtiger Reihenfolge tippen.
- Finde das Andere: abweichendes Symbol erkennen.
- Pfeil-Wirbel: richtige Richtung antippen.
- Höher oder Tiefer: nächste Zahl vorhersagen.
- Count-Vision: Zielsymbole zählen.
- Reflex-Lanes: nur das Zielsymbol antippen.

## Deployment (Render)

Die App ist für Render vorbereitet (`render.yaml`).

- Runtime: Python
- Startkommando: `python server.py`
- Keine externen Python-Abhängigkeiten erforderlich

## Bekannte Hinweise

- Browser-Audio startet auf vielen Geräten erst nach erster Interaktion (Touch/Klick).
- Für stabiles Multiplayer-Testing am besten 2+ echte Geräte nutzen.
