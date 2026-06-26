# Party Arena in der Cloud (kostenfrei)

Diese App ist bereits fuer Render vorbereitet (Datei `render.yaml`).

## 1) Kostenlos deployen auf Render

1. Code nach GitHub pushen.
2. Bei Render einloggen: https://render.com
3. "New +" -> "Blueprint" waehlen.
4. GitHub-Repository verbinden.
5. Render erkennt `render.yaml` und erstellt den Service.
6. Warten bis der Build fertig ist.
7. Oeffentliche URL testen, z. B. `https://dein-service.onrender.com`.

## 2) Spiel starten

1. Host-Seite oeffnen: `https://dein-service.onrender.com/host`
2. Raum erstellen (passiert automatisch beim Laden).
3. Spieler oeffnen die Basis-URL im Browser: `https://dein-service.onrender.com/`
4. Spieler geben Namen + Raum-Code ein.

## 3) Host spielt nicht mit

- Der Host ist ein eigener Rollenkanal (`host:create`) und wird nicht als Spieler registriert.
- Spieler koennen nur ueber `player:join` in den Raum.
- Damit ist der Host-Bildschirm nur Steuerung/Moderation.

## 4) Wichtige Hinweise zum Free-Tier

- Render Free kann bei Inaktivitaet schlafen (Cold Start beim ersten Aufruf).
- WebSocket funktioniert, aber erste Verbindung kann ein paar Sekunden brauchen.
- Wenn viele parallel spielen, kann ein kostenpflichtiger Plan stabiler sein.

## 5) Optionaler Betrieb ohne manuellen Host

Falls ihr komplett ohne Host-Bedienung spielen wollt (Server steuert automatisch Runden),
muessen wir einen "Auto-Host" Modus ergaenzen. Das ist ein eigenes Feature.
