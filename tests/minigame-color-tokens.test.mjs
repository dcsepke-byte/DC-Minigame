/**
 * Minigame Color Tokens — Design-Token-Konvention (games-1, Skill 15a)
 *
 * Feedback-/UI-Farben in games.js (FX.toast, showCombo, showFeedback,
 * style.color-Zuweisungen) muessen die semantischen Design-Tokens nutzen:
 *   #ff4d6d -> var(--bad)   (Fehler)
 *   #2bffb9 -> var(--good)  (Erfolg)
 *   #ffd34e -> var(--gold)  (Perfekt/Combo)
 *
 * Erlaubt bleiben: Canvas-fillStyle (kann kein var()), Farb-Paletten-Arrays,
 * hex:-Farbdaten (Spiel-Logik), dynamische Farben.
 *
 * Statischer Test auf Quelltext-Ebene (games.js ist Browser-IIFE mit DOM).
 * Node 22 built-in test runner: node --test tests/minigame-color-tokens.test.mjs
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const src = readFileSync(new URL('../js/games.js', import.meta.url), 'utf8');

const SEMANTIC = {
  '#ff4d6d': '--bad',
  '#2bffb9': '--good',
  '#ffd34e': '--gold',
};

for (const [hex, token] of Object.entries(SEMANTIC)) {
  test(`Feedback-Farben nutzen var(${token}) statt hartem ${hex}`, () => {
    /* Matcht nur Feedback-/UI-Kontexte: toast(..., 'hex'), showCombo(...),
       showFeedback(...) und style.color-Zuweisungen. Nicht: fillStyle,
       Farb-Arrays, hex:-Daten. */
    const re = new RegExp(
      `(?:FX\\.toast\\([^)]*|showCombo\\([^)]*|showFeedback\\([^)]*|style\\.color[^;]*)\\s*'${hex}'`,
      'g'
    );
    const matches = [...src.matchAll(re)].map((m) => m[0].trim());
    assert.deepEqual(
      matches,
      [],
      `Harte Farbe ${hex} in Feedback/UI-Kontext (nutze var(${token})):\n  ` + matches.join('\n  ')
    );
  });
}

test('kein hartes semantisches Hex in comboEl.style.color', () => {
  const re = /comboEl\.style\.color[^;]*'#(?:ff4d6d|2bffb9|ffd34e)'/g;
  const matches = [...src.matchAll(re)].map((m) => m[0].trim());
  assert.deepEqual(matches, [], 'Combo-Farben muessen var(--gold)/var(--good) nutzen:\n  ' + matches.join('\n  '));
});
