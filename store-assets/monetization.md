# Party Arena — Monetarisierungs-Strategie

## Modell: Freemium + Cosmetic IAP

### Basis (kostenlos)
- Alle 14+ Minispiele spielbar
- Board Party Modus komplett
- 2 Start-Charaktere (Default-Rakete + 1 weiterer)
- 1 Trail (Standard)
- XP & Level-System
- 10 Achievements
- Daily Challenge
- Online-Multiplayer (Host + bis zu 7 Spieler)

### Premium (Einmalkauf, 4,99 €)
- Alle 8+ Charaktere sofort freigeschaltet
- Alle 3 Trails freigeschaltet
- Exklusiver Premium-Charakter (Gold-Rakete)
- Exklusiver Premium-Trail (Regenbogen)
- Keine Werbung (falls spaeter implementiert)
- "Premium"-Badge im Spiel

### In-App-Kaeufe (Cosmetic Packs)
| Pack | Inhalt | Preis |
|---|---|---|
| Starter Pack | 2 Charaktere + 1 Trail + 50 Sterne | 1,99 € |
| Character Pack | 3 zufaellige Charaktere | 2,99 € |
| Trail Pack | Alle 3 Trails | 1,99 € |
| Star Pack S | 100 Sterne | 0,99 € |
| Star Pack M | 500 Sterne | 3,99 € |
| Star Pack L | 1200 Sterne | 7,99 € |

### Belohnungs-Werbung (Rewarded Ads)
- "Schaue Werbung fuer 10 Bonus-Sterne" (1x pro Tag)
- "Schaue Werbung fuer Daily Challenge Retry"
- "Schaue Werbung fuer XP-Boost (2x fuer 30min)"
- Keine erzwungene Werbung, keine Interstitials

### Waehrungen
- **Sterne (Stars):** Verdient durch Spielen (1.=5, 2.=3, 3.=2, 4.+=1), Level-Ups, Daily Challenge
- **Premium:** Einmalkauf, schaltet alles frei

## Implementierung

### Phase 1: Vorbereitung (jetzt)
- [x] Store-Assets (Beschreibungen, Age-Rating, Screenshot-Guide)
- [ ] Capacitor Purchase Plugin integrieren (`cordova-plugin-purchase` oder `@capacitor-community/in-app-purchases`)
- [ ] Produkt-Konfiguration in App Store Connect + Google Play Console

### Phase 2: IAP-Integration (vor Launch)
- [ ] In-App-Purchase-Flow in JS
- [ ] Kauf-Bestaetigung + Freischaltung
- [ ] Restore-Purchases-Button
- [ ] Receipt-Validierung (Server-seitig)

### Phase 3: Ads (optional, nach Launch)
- [ ] AdMob oder Unity Ads SDK
- [ ] Rewarded-Ad-Integration
- [ ] Consent-Management (GDPR/ATT)

## App Store Pricing Tiers

### Apple App Store
- Premium: Tier 5 (4,99 €)
- Starter Pack: Tier 2 (1,99 €)
- Character Pack: Tier 3 (2,99 €)
- Trail Pack: Tier 2 (1,99 €)
- Star Pack S: Tier 1 (0,99 €)
- Star Pack M: Tier 4 (3,99 €)
- Star Pack L: Tier 6 (7,99 €)

### Google Play Store
- Gleiche Preisstruktur
- Pricing-Template: "0,99 € - 7,99 € pro Artikel"

## Revenue-Erwartung
- Konservativ: 2-5% Conversion zu Premium
- Pro 1000 Downloads: ~100-250 € (bei 5% Conversion + einige IAPs)
- Break-Even: ~200 Premium-Kaeufe (Apple Developer Fee 99 €/Jahr + Google 25 € einmalig)

## Rechtliches
- [x] Privacy Policy (kein Tracking, keine Datenweitergabe)
- [x] Terms of Service
- [ ] IAP in App-Beschreibung kennzeichnen ("Bietet In-App-Kaeufe")
- [ ] Impressum (falls in DE noetig)
