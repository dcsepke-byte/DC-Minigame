/**
 * Minigame HUD Consolidation — einheitliche Stage-HUD/Combo-Stile (games-1, Skill 15a)
 *
 * Die HUD/Score/Timer/Combo-Bausteine der 9 Spiele (tower, bubble, ninja, cc,
 * db, bs, qd, rt, cd) sind in css/styles.css konsolidiert:
 *   - gemeinsamer Gruppen-Selektor .tower-hud, .bubble-hud, ... (SHARED MINIGAME HUD)
 *   - gemeinsamer Combo-Keyframe @keyframes mg-combo-pop
 *   - KEINE per-Spiel-Definitionen mehr (kein ".db-hud {", kein "bp-combo-pop")
 *
 * Dieser statische Test verhindert Rueckfall in die Duplikat-Wueste:
 * Erlaubt sind nur die Overrides (".tower-hud { gap: 24px; }" etc.) und
 * Spiele mit eigenem HUD-Layout (tf-*, lf-*, target-hud, play-hud).
 *
 * Node 22 built-in test runner: node --test tests/minigame-hud-consolidation.test.mjs
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../css/styles.css', import.meta.url), 'utf8');

const CONSOLIDATED = [
  'tower-hud', 'bubble-hud', 'ninja-hud', 'cc-hud', 'db-hud',
  'bs-hud', 'qd-hud', 'rt-hud', 'cd-hud',
];
const SCORES = [
  'tower-score', 'bubble-score', 'ninja-score', 'cc-score', 'db-score',
  'bs-score', 'qd-score', 'rt-score', 'cd-score',
];
const TIMERS = ['db-timer', 'bs-timer', 'rt-timer', 'cd-timer'];
const COMBOS = ['bubble-combo', 'ninja-combo', 'cc-combo', 'db-combo', 'bs-combo'];

test('gemeinsamer SHARED MINIGAME HUD Block existiert', () => {
  assert.ok(css.includes('SHARED MINIGAME HUD'), 'Kommentar-Block fehlt');
  assert.ok(css.includes('@keyframes mg-combo-pop'), 'gemeinsamer Combo-Keyframe fehlt');
});

for (const cls of [...CONSOLIDATED, ...SCORES, ...TIMERS, ...COMBOS]) {
  test(`keine eigene Definition mehr: .${cls} {`, () => {
    /* Erlaubt: Gruppen-Selektor (".db-hud, .bs-hud {"), Override ("db-hud { gap: ... }")
       sowie .show-Varianten. Verboten: eigenstaendiger Block mit Layout-Eigenschaften.
       Nur Zeilenanfaenge matchen — der Gruppen-Selektor beginnt nicht mit der Klasse. */
    const blockRe = new RegExp(`^\\s*\\.${cls}\\s*\\{[^}]*position[^}]*\\}`, 'gm');
    const matches = [...css.matchAll(blockRe)].map((m) => m[0].slice(0, 80));
    assert.deepEqual(
      matches,
      [],
      `Eigenstaendiger Block fuer .${cls} gefunden (Layout-Eigenschaft position):\\n  ` +
        matches.join('\\n  ')
    );
  });
}

test('keine alten per-Spiel-Combo-Keyframes mehr', () => {
  const oldKeys = ['bp-combo-pop', 'ns-combo-pop', 'cc-combo-pop', 'db-combo-pop', 'bs-combo-pop'];
  const present = oldKeys.filter((k) => css.includes(k));
  assert.deepEqual(present, [], 'Alte per-Spiel-Keyframes noch vorhanden: ' + present.join(', '));
});

test('Combo .show-Klassen zeigen auf mg-combo-pop', () => {
  /* Die .show-Regel ist EIN Gruppen-Selektor fuer alle 5 Combos. */
  const showRe = /\.(?:bubble|ninja|cc|db|bs)-combo\.show\s*\{[^}]*\}/g;
  const matches = [...css.matchAll(showRe)].map((m) => m[0]);
  assert.ok(matches.length >= 1, 'Keine .show-Regel fuer Combo-Klassen gefunden');
  const allInOne = matches.every((m) => m.includes('mg-combo-pop'));
  assert.ok(allInOne, 'Combo .show nutzt nicht mg-combo-pop: ' + matches.map((m) => m.slice(0, 60)).join(' | '));
});
