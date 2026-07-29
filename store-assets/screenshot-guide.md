# Party Arena — Screenshot Guide

## Anforderungen

### Apple App Store (iOS)
- **iPhone 6.7" Display** (iPhone 14 Pro Max): 1290 x 2796 px
- **iPhone 6.5" Display** (iPhone 11 Pro Max): 1242 x 2688 px
- **iPhone 5.5" Display** (iPhone 8 Plus): 1242 x 2208 px
- **iPad 12.9" Display**: 2048 x 2732 px
- Mindestens 3 Screenshots, maximal 10
- PNG oder JPG, 72 DPI, kein Alpha-Kanal

### Google Play Store (Android)
- Mindestens 2 Screenshots, maximal 8
- 16:9 oder 9:16 Seitenverhaeltnis
- Empfohlen: 1080 x 1920 px (Portrait)
- PNG oder JPG, max 8 MB pro Bild

## Empfohlene Screenshots (6 Stueck)

### 1. Hauptmenue / Lobby
- Zeigt: Startbildschirm mit "Party Arena" Logo, Join-Button, Shop, Einstellungen
- Text-Overlay: "TRITT EINER PARTY BEI" / "JOIN A PARTY"
- Caption: "Einfach Raumcode eingeben und losspielen!"

### 2. Host-Ansicht (Board Party)
- Zeigt: 3D-Spielbrett mit Spielfiguren, HUD mit Spieler-Infos
- Text-Overlay: "BOARD PARTY MODUS" / "BOARD PARTY MODE"
- Caption: "Wuerfelt, kauft Felder, duelliert euch!"

### 3. Minispiel-Action (Ninja Slash)
- Zeigt: Ninja Slash Minispiel mit Fruechten und Slash-Effekten
- Text-Overlay: "14+ MINISPIELE" / "14+ MINIGAMES"
- Caption: "Rasante Action: Fruechte zerschneiden, Bomben meiden!"

### 4. Minispiel-Action (Tower Stack)
- Zeigt: Tower Stack mit gestapelten Bloecken
- Text-Overlay: "PERFEKTES TIMING" / "PERFECT TIMING"
- Caption: "Wie hoch kannst du stapeln?"

### 5. Ergebnis-Bildschirm
- Zeigt: Ranking mit Sternen, XP-Gewinn, Level-Up-Animation
- Text-Overlay: "SAMMLE STERNE & LEVEL AUF" / "COLLECT STARS & LEVEL UP"
- Caption: "Sterne verdienen, Charaktere freischalten!"

### 6. Charakter-Shop
- Zeigt: Unlock-Shop mit freischaltbaren Charakteren und Trails
- Text-Overlay: "SCHALTE ALLE CHARAKTERE FREI" / "UNLOCK ALL CHARACTERS"
- Caption: "8+ Charaktere und 3 Trails zum Freischalten!"

## Erstellung

### Option A: Manuell (empfohlen fuer beste Qualitaet)
1. App auf echtem Geraet oeffnen (iPhone + Android)
2. Screenshots in den richtigen Aufloesungen machen
3. Text-Overlays mit Figma/Canva/Photoshop hinzufuegen
4. In store-assets/screenshots/ ablegen

### Option B: Simulator
1. iOS Simulator (Xcode): `npx cap open ios` → Simulator starten
2. Android Emulator: `npx cap open android` → Emulator starten
3. Screenshots mit Simulator-Bordmitteln aufnehmen

### Option C: Automatisiert (Playwright)
```bash
# Playwright installieren
npm install playwright
# Screenshot-Script ausfuehren
node scripts/take-screenshots.js
```

## Text-Overlay Style Guide
- Schriftart: Fredoka Bold (Google Fonts)
- Farbe: Weiß (#FFFFFF) mit Schlagschatten
- Position: Oben oder unten zentriert
- Hintergrund: Halbtransparenter Gradient (optional)
- Sprache: DE + EN Varianten

## Dateinamen-Konvention
```
screenshots/
  ios-6.7/
    01-main-menu-de.png
    02-board-party-de.png
    03-ninja-slash-de.png
    04-tower-stack-de.png
    05-results-de.png
    06-shop-de.png
  android/
    01-main-menu-de.png
    ...
  en/
    ... (englische Varianten)
```
