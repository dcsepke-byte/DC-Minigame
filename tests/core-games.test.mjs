/* games-1: Qualitäts-Registry — Validierung der 8 hochwertigen Kernspiele
   Prüft, dass die Kernspiele den Minispiel-Vertrag erfüllen (id/name/play)
   und in der games.js-Liste registriert sind. */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const src = readFileSync(new URL('../js/games.js', import.meta.url), 'utf8');

/* Die 8 hochwertigen Kernspiele (Action Mix, TDD-Logik vorhanden) */
const CORE_GAMES = [
  { id: 'towerstack',    name: 'Tower Stack' },
  { id: 'bubblepop',     name: 'Bubble Pop' },
  { id: 'ninjaslash',    name: 'Ninja Slash' },
  { id: 'colorcatch',    name: 'Color Catch' },
  { id: 'dodgeball',     name: 'Dodgeball' },
  { id: 'bouncesurvival', name: 'Bounce Survival' },
  { id: 'rhythmtap',     name: 'Rhythm Tap' },
  { id: 'quickdraw',     name: 'Quick Draw Duel' },
  { id: 'coindash',      name: 'Coin Dash' },
  { id: 'tileflip',      name: 'Tile Flip' },
];

test('8 Kernspiele sind in der games.js-Liste registriert', () => {
  for (const g of CORE_GAMES) {
    assert.match(src, new RegExp(`id: '${g.id}'`), `Spiel ${g.id} fehlt in Liste`);
  }
});

test('Jedes Kernspiel hat id, name, desc, rules und play', () => {
  for (const g of CORE_GAMES) {
    const re = new RegExp(`\\{ id: '${g.id}', name: '[^']+', icon: '[^']+', desc: '[^']+',\\s*rules: '[^']+',\\s*play: sessionWrap\\(game[^)]+, '${g.id}'\\) \\}`);
    assert.match(src, re, `Vertrag fuer ${g.id} unvollstaendig`);
  }
});

test('Kernspiele sind durch den Session-Wrapper geschuetzt', () => {
  for (const g of CORE_GAMES) {
    assert.match(src, new RegExp(`sessionWrap\\(game[^)]+, '${g.id}'\\)`), `${g.id} ohne sessionWrap`);
  }
});

test('Alle Spiele in der Liste haben eine play-Funktion', () => {
  // Jeder Listeneintrag muss play: sessionWrap(...) haben
  const entries = src.match(/\{ id: '[^']+',[\s\S]*?play: sessionWrap\([^)]+\) \}/g) || [];
  assert.ok(entries.length >= 40, `Zu wenige valide Spiel-Eintraege: ${entries.length}`);
});

test('Kein Spiel referenziert eine fehlende game-Funktion', () => {
  // Alle sessionWrap(gameX, 'id') muessen eine gameX Funktion besitzen
  const used = [...src.matchAll(/sessionWrap\((game\w+),/g)].map(m => m[1]);
  for (const fn of used) {
    assert.match(src, new RegExp(`function ${fn}\\(`), `game-Funktion ${fn} fehlt`);
  }
});
