#!/usr/bin/env python3
"""Party Arena — Konzept-Verifier (Sub-Bot)

Prueft die spielbare Version gegen das Spielwelt-Konzept (Aethonia).
Liest den Code + die Konzept-Datei und verifiziert, dass alle
Konzept-Elemente umgesetzt sind. Erzeugt einen Pruefbericht.

Aufruf: python3 tests/concept_verifier.py
Exit-Code: 0 = Konzept erfuellt, 1 = Abweichungen
"""
import os
import re
import sys
import json

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CONCEPT = os.path.join(REPO, '.hermes', 'plans', '2026-07-31_party-arena-concept-review.md')

# --- Konzept-Anforderungen (aus dem Review-Dokument) --------------------
# (Id, Beschreibung, Kategorie, Pruef-Pattern, Dateien)
REQUIREMENTS = [
    # --- Welt ---
    ('W1', 'Welt heisst Aethonia', 'Welt', 'aethonia|Aethonia', ['index.html', 'js/scene3d.js', 'BACKLOG.md', '.hermes/plans']),
    ('W2', '7 Inseln: Sonnenstrand', 'Welt', 'Sonnenstrand|sonnenstrand', ['js/scene3d.js', 'js/asset-loader.js', 'blender-assets']),
    ('W3', '7 Inseln: Zuckerwald', 'Welt', 'Zuckerwald|zuckerwald', ['js/scene3d.js', 'js/asset-loader.js']),
    ('W4', '7 Inseln: Wolkenwerk', 'Welt', 'Wolkenwerk|wolkenwerk', ['js/scene3d.js', 'js/asset-loader.js']),
    ('W5', '7 Inseln: Frostgipfel', 'Welt', 'Frostgipfel|frostgipfel', ['js/scene3d.js', 'js/asset-loader.js']),
    ('W6', '7 Inseln: Dschungeltempel', 'Welt', 'Dschungeltempel|dschungeltempel', ['js/scene3d.js', 'js/asset-loader.js']),
    ('W7', '7 Inseln: Mechanik-Stadt', 'Welt', 'Mechanik-Stadt|mechanikstadt', ['js/scene3d.js', 'js/asset-loader.js']),
    ('W8', '7 Inseln: Sternenzitadelle', 'Welt', 'Sternenzitadelle|sternenzitadelle', ['js/scene3d.js', 'js/asset-loader.js']),
    ('W9', 'Schwebende Inseln (Board-Hoehen)', 'Welt', 'biomeHeightOffset|sky.*1\\.8|Lift', ['js/scene3d.js']),
    ('W10', 'Inseln als 3D-Modelle (GLB)', 'Welt', 'glb|GLB|blender-assets', ['js/asset-loader.js', 'blender-assets']),
    # --- Charaktere ---
    ('C1', '8 Charaktere registriert (AssetLoader)', 'Charaktere', 'brix.*nixie.*pip.*koko.*tiko.*bolt.*bloom.*momo|register.*brix', ['js/asset-loader.js']),
    ('C2', 'Brix (Stein-Golem)', 'Charaktere', 'Brix|brix', ['js/asset-loader.js', 'js/pawn-model-logic.js']),
    ('C3', 'Nixie (Axolotl)', 'Charaktere', 'Nixie|nixie', ['js/asset-loader.js', 'js/pawn-model-logic.js']),
    ('C4', 'Pip (Eichhoernchen)', 'Charaktere', 'Pip|pip', ['js/asset-loader.js', 'js/pawn-model-logic.js']),
    ('C5', 'Koko (Panda)', 'Charaktere', 'Koko|koko', ['js/asset-loader.js', 'js/pawn-model-logic.js']),
    ('C6', 'Tiko (Vogel)', 'Charaktere', 'Tiko|tiko', ['js/asset-loader.js', 'js/pawn-model-logic.js']),
    ('C7', 'Bolt (Roboter)', 'Charaktere', 'Bolt|bolt', ['js/asset-loader.js', 'js/pawn-model-logic.js']),
    ('C8', 'Bloom (Kaktus)', 'Charaktere', 'Bloom|bloom', ['js/asset-loader.js', 'js/pawn-model-logic.js']),
    ('C9', 'Momo (Waschbaer)', 'Charaktere', 'Momo|momo', ['js/asset-loader.js', 'js/pawn-model-logic.js']),
    ('C10', 'Charaktere im Figure-Picker', 'Charaktere', 'ARENIANS|HOST_ARENIANS', ['js/player.js', 'js/host.js']),
    ('C11', 'Charakter-Silhouetten in 3D (Varianten)', 'Charaktere', 'VARIANTS|golem.*box|raccoon', ['js/pawn-model-logic.js']),
    # --- Minispiele ---
    ('M1', 'Mindestens 8 hochwertige Minispiele', 'Minispiele', 'towerstack|bubblepop|ninjaslash|colorcatch|dodgeball|bouncesurvival|rhythmtap|quickdraw|coindash|tileflip', ['js/games.js']),
    ('M2', 'Action-Mix = 10 Kernspiele', 'Minispiele', 'Action Mix|action', ['js/game-mix-logic.js', 'js/host.js']),
    ('M3', 'Minispiel-Vertrag (State-Machine)', 'Minispiele', 'start.*countdown.*gameplay.*timer.*winner.*reward.*exit', ['js/minigame-contract.js']),
    ('M4', 'Alle Spiele durch sessionWrap geschuetzt', 'Minispiele', 'sessionWrap', ['js/games.js']),
    # --- Meta ---
    ('P1', 'Shop mit Charakteren', 'Meta', 'shop|Shop', ['js/player.js']),
    ('P2', 'Sternen-Waehrung', 'Meta', 'stars|Sterne|Sterne', ['js/meta-progression-logic.js']),
    ('P3', 'XP/Level-System', 'Meta', 'xp|level|Level', ['js/meta-progression-logic.js']),
    ('P4', 'Achievements', 'Meta', 'achievement|Achievement', ['js/meta-progression-logic.js']),
    # --- Mainmenu ---
    ('H1', 'Hauptmenue mit Aethonia-Branding', 'Mainmenu', 'Aethonia', ['index.html']),
    ('H2', 'Welt-Inselband im Menue', 'Mainmenu', 'world-island-band|island-chip', ['index.html', 'css/styles.css']),
    # --- Architektur ---
    ('A1', 'Asset-Loader existiert', 'Architektur', 'AssetLoader|asset-loader', ['js/asset-loader.js']),
    ('A2', 'GLTF/GLB-Unterstuetzung', 'Architektur', 'GLTFLoader|loadGLTF|\.glb', ['js/asset-loader.js']),
    ('A3', 'Modular: Logik getrennt von UI', 'Architektur', '-logic', ['js/']),
]


def read_files(paths):
    """Liest Dateien (falls vorhanden) und liefert Inhalt als String."""
    contents = {}
    for p in paths:
        full = os.path.join(REPO, p)
        if os.path.isdir(full):
            # Verzeichnis: alle Dateien rekursiv
            for root, _, files in os.walk(full):
                for f in files:
                    fp = os.path.join(root, f)
                    if f.endswith(('.py', '.js', '.html', '.css', '.md', '.json')):
                        try:
                            with open(fp, 'r', encoding='utf-8', errors='ignore') as fh:
                                contents[os.path.relpath(fp, REPO)] = fh.read()
                        except Exception:
                            pass
        elif os.path.isfile(full):
            try:
                with open(full, 'r', encoding='utf-8', errors='ignore') as fh:
                    contents[p] = fh.read()
            except Exception:
                pass
    return contents


def check(contents, pattern, files):
    """Prueft, ob Pattern in mindestens einer Datei vorkommt.
    Verzeichnis-Eintraege (z.B. 'js/') werden auf alle Unterdateien expandiert."""
    combined_parts = []
    for f in files:
        if f in contents:
            combined_parts.append(contents[f])
        elif f.endswith('/'):
            prefix = f
            combined_parts.extend(v for k, v in contents.items() if k.startswith(prefix))
    combined = '\n'.join(combined_parts)
    return bool(re.search(pattern, combined, re.IGNORECASE))


def main():
    contents = read_files([p for _, _, _, _, files in REQUIREMENTS for p in files])
    results = []
    passed = 0
    for rid, desc, cat, pattern, files in REQUIREMENTS:
        ok = check(contents, pattern, files)
        results.append({'id': rid, 'desc': desc, 'cat': cat, 'ok': ok})
        if ok:
            passed += 1

    total = len(results)
    # Bericht erzeugen
    report = {
        'datum': '2026-08-01',
        'passed': passed,
        'total': total,
        'konzept_erfuellt': passed == total,
        'checks': results,
        'zusammenfassung': f'{passed}/{total} Konzept-Punkte erfuellt',
    }
    out_path = os.path.join(REPO, 'VERIFICATION_CONCEPT.md')
    with open(out_path, 'w', encoding='utf-8') as fh:
        fh.write('# Party Arena — Konzept-Verifikation\n\n')
        fh.write(f'**Datum:** 2026-08-01\n')
        fh.write(f'**Ergebnis:** {passed}/{total} Konzept-Punkte erfuellt\n\n')
        fh.write('| ID | Kategorie | Pruefung | Status |\n')
        fh.write('|---|---|---|---|\n')
        for r in results:
            status = '✅' if r['ok'] else '❌'
            fh.write(f"| {r['id']} | {r['cat']} | {r['desc']} | {status} |\n")
        fh.write('\n*Generiert vom Konzept-Verifier (Sub-Bot)*\n')

    print(json.dumps(report, ensure_ascii=False, indent=2))
    sys.exit(0 if passed == total else 1)


if __name__ == '__main__':
    main()
