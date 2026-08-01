/**
 * Minigame Registry — sessionWrap-Konvention (arch-2 Schritt 2)
 *
 * Alle Spiele in games.js Registry muessen durch den Session-Adapter laufen:
 *   play: sessionWrap(gameX, 'xid')
 * - Jeder Eintrag hat ein id
 * - Jeder Eintrag nutzt sessionWrap (kein rohes play: gameX)
 * - Die sessionWrap-ID matcht die Eintrags-ID
 * - Die gewrappte Funktion existiert als gameX-Deklaration
 *
 * Statischer Test auf Quelltext-Ebene (games.js ist Browser-IIFE mit DOM).
 * Node 22 built-in test runner: node --test tests/minigame-registry.test.mjs
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const src = readFileSync(new URL('../js/games.js', import.meta.url), 'utf8');

function registryEntries() {
  const m = src.match(/const list = \[([\s\S]*?)\n  \];/);
  assert.ok(m, 'Registry `const list` nicht gefunden');
  return m[1].split(/\n    \{ id: /).slice(1);
}

test('jeder Registry-Eintrag hat eine id', () => {
  const entries = registryEntries();
  assert.ok(entries.length >= 20, `Zu wenige Eintraege: ${entries.length}`);
  for (const entry of entries) {
    const idMatch = entry.match(/^'([a-z0-9]+)'/);
    assert.ok(idMatch, `Eintrag ohne id: ${entry.slice(0, 60)}`);
    assert.ok(idMatch[1].length > 0);
  }
});

test('jeder Registry-Eintrag nutzt sessionWrap', () => {
  for (const entry of registryEntries()) {
    const id = entry.match(/^'([a-z0-9]+)'/)[1];
    const wrap = entry.match(/play: sessionWrap\(game\w+, '([a-z0-9]+)'\)/);
    assert.ok(wrap, `Spiel '${id}' ist NICHT auf sessionWrap umgestellt (rohes play?)`);
    assert.equal(wrap[1], id, `sessionWrap-ID mismatch fuer '${id}'`);
  }
});

test('jede gewrappte play-Funktion existiert als Deklaration', () => {
  const fnNames = new Set([...src.matchAll(/function (game\w+)\(/g)].map(m => m[1]));
  const wrapped = [...src.matchAll(/play: sessionWrap\((game\w+),/g)].map(m => m[1]);
  assert.ok(wrapped.length >= 20, `Zu wenige sessionWrap-Aufrufe: ${wrapped.length}`);
  for (const fn of wrapped) {
    assert.ok(fnNames.has(fn), `Unbekannte Funktion ${fn}`);
  }
});
