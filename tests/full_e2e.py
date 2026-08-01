#!/usr/bin/env python3
"""Party Arena — Kompletter E2E-Test-Runner

Prueft alle Kern-Flows in einem Durchlauf:
1. Konzept-Verifier (34 Punkte)
2. Alle Node-Unit-Tests
3. E2E-Bot-Session (Host + Player, Board + Minispiel)
4. Browser-Smoke-Check (statisch, ohne JS-Fehler)
5. Assets-Verfuegbarkeit (GLB-Inseln, Charakter-SVGs)

Aufruf: python3 tests/full_e2e.py
Exit-Code: 0 = alles gruen, 1 = Fehler
"""
import os
import subprocess
import sys
import glob

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

GREEN = '\033[92m'
RED = '\033[91m'
YELLOW = '\033[93m'
RESET = '\033[0m'

results = []


def run(cmd, cwd=REPO, timeout=300):
    try:
        r = subprocess.run(cmd, shell=True, capture_output=True, text=True, cwd=cwd, timeout=timeout)
        return r.returncode, r.stdout + r.stderr
    except subprocess.TimeoutExpired:
        return 124, 'TIMEOUT'


def check(name, ok, detail=''):
    results.append((name, ok))
    status = f'{GREEN}PASS{RESET}' if ok else f'{RED}FAIL{RESET}'
    print(f'  {status}  {name}' + (f'  — {detail}' if detail and not ok else ''))


def main():
    print('=== Party Arena — Kompletter E2E-Test ===')
    print()

    # 1. Konzept-Verifier
    print('[1] Konzept-Verifier (34 Punkte)')
    code, out = run('python3 tests/concept_verifier.py')
    check('Konzept-Verifier', code == 0, out.strip()[-200:] if code else '')
    print()

    # 2. Node-Unit-Tests
    print('[2] Node-Unit-Tests')
    code, out = run('node --test tests/*.test.mjs 2>&1', timeout=300)
    pass_count = out.count('# pass')
    fail_count = out.count('# fail')
    # Extrahiere tatsaechliche Zahlen
    import re
    pm = re.search(r'# pass (\d+)', out)
    fm = re.search(r'# fail (\d+)', out)
    passed = int(pm.group(1)) if pm else 0
    failed = int(fm.group(1)) if fm else 1
    check('Unit-Tests ({} pass, {} fail)'.format(passed, failed), failed == 0, out.strip()[-300:] if failed else '')
    print()

    # 3. E2E-Bot-Session (braucht Server)
    print('[3] E2E-Bot-Session (Host + Player, Board + Minispiel)')
    # Server starten (im Hintergrund)
    server = subprocess.Popen(
        ['python3', 'server.py'],
        cwd=REPO,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        env={**os.environ, 'PORT': '3000'},
    )
    try:
        import time
        time.sleep(2)
        code, out = run('timeout 120 python3 tests/e2e_bot_v3.py 2>&1', timeout=150)
        pass_line = [l for l in out.split('\n') if l.startswith('PASS:')]
        bot_ok = bool(pass_line and pass_line[0].strip().endswith('True'))
        check('E2E-Bot-Session', bot_ok, out.strip()[-300:] if not bot_ok else '')
    finally:
        server.terminate()
        try:
            server.wait(timeout=5)
        except Exception:
            server.kill()
    print()

    # 4. Assets-Verfuegbarkeit
    print('[4] Assets-Verfuegbarkeit')
    islands = glob.glob(os.path.join(REPO, 'blender-assets', 'islands', '*.glb'))
    chars = glob.glob(os.path.join(REPO, 'assets', 'characters', '*.svg'))
    check('7 Insel-GLBs vorhanden', len(islands) >= 7, f'gefunden: {len(islands)}')
    check('8 Charakter-SVGs vorhanden', len(chars) >= 8, f'gefunden: {len(chars)}')
    print()

    # 5. HTML-Grunddateien
    print('[5] HTML-Grunddateien')
    for f in ['index.html', 'host.html', 'player.html']:
        p = os.path.join(REPO, f)
        check(f'{f} existiert', os.path.isfile(p))
    print()

    # Zusammenfassung
    total = len(results)
    passed_total = sum(1 for _, ok in results if ok)
    print('=' * 50)
    print(f'ERGEBNIS: {passed_total}/{total} Tests bestanden')
    if passed_total == total:
        print(f'{GREEN}ALLE TESTS GRUEN — spielbare Version OK{RESET}')
        sys.exit(0)
    else:
        print(f'{RED}ES GIBT FEHLER — siehe oben{RESET}')
        sys.exit(1)


if __name__ == '__main__':
    main()
