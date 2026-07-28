# Capacitor Mobile Wrapper

## Setup (2026-07-28)

### Installation
```bash
npm install @capacitor/cli @capacitor/core @capacitor/android @capacitor/ios
npm install @capacitor/haptics@^6.0.0 @capacitor/screen-orientation@^6.0.0
```

### Konfiguration
- `capacitor.config.json`: appId=com.partyarena.app, webDir=www, cleartext=true
- `www/` wird via `npm run build` aus aktuellen Web-Assets erzeugt
- `.gitignore`: android/, ios/, node_modules/, www/ (Capacitor generiert sie neu)

### Build-Pipeline
```bash
npm run build    # www/ aus index.html, player.html, host.html, css/, js/, assets/ erzeugen
npx cap sync     # www/ in android/ und ios/ kopieren
npx cap open android  # Android Studio oeffnen
npx cap open ios      # Xcode oeffnen
```

### Icons & Splash
- `scripts/generate-icons.js`: SVG-to-PNG via sharp
- Android: adaptive icons (foreground + background) in mipmap-*/
- iOS: AppIcon.appiconset + Splash.imageset
- PNGs in .gitignore (werden via Script generiert)

### Native Plugins
- `@capacitor/haptics`: Vibration-Feedback
- `@capacitor/screen-orientation`: Landscape (Host) / Portrait (Player)

### Pitfalls
- `npm init` uebernimmt ggf. Remote-URL mit GitHub-Token → vor Push pruefen
- Capacitor braucht `www/` Ordner, nicht Root-Verzeichnis
- TypeScript-Konfig (.ts) braucht `typescript` als devDependency → JSON-Konfig verwenden
- Capacitor 6.x braucht passende Plugin-Versionen (^6.0.0, nicht ^8.0.0)
