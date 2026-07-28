# Notion Sync – Offener Punkt

Datum: 2026-07-28

## Problem
`ntn` (Notion CLI) braucht jetzt `NOTION_WORKSPACE_ID`. Ohne Workspace-ID kann ich weder die Aufgaben-DB noch die Wissensdatenbank aktualisieren.

Fehlermeldung:
```
error: No workspace selected.
  hint: Run `ntn login` first, or set NOTION_WORKSPACE_ID.
```

## Was Danny tun muss
1. Entweder einmalig `ntn login` im Terminal durchführen (interaktiv)
2. Oder die Notion Workspace-ID bereitstellen, damit ich sie in die Env-Config schreiben kann

## Heutiger Stand ohne Notion
Party Arena Phase-1 weitgehend abgeschlossen:
- Capacitor Android/iOS Wrapper
- PWA Icons + Manifest
- Settings-Menü + i18n
- Diff-basierte Board-Updates
- js/shared.js Refactor
- Neues Minispiel Lava-Boden
- Alles auf `main` gepusht
- E2E-Test morgen

## Nächster Schritt
Sobald Notion-Workspace-ID verfügbar: Aufgaben-DB + Wissensdatenbank nachholen.
