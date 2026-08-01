/**
 * Game Mix Paritaetstest (ESM vs Browser-IIFE)
 *
 * Stellt sicher dass beide Versionen identische Ergebnisse liefern.
 */
import { test } from 'node:test';
import assert from 'node:assert';
import * as ESM from '../js/game-mix-logic.js';

// Browser-IIFE laden
import { readFileSync } from 'fs';
import { join } from 'path';
import vm from 'vm';

const browserCode = readFileSync(join(process.cwd(), 'js/game-mix-logic-browser.js'), 'utf8');
const sandbox = { window: {}, Math, JSON, Object, console };
vm.createContext(sandbox);
vm.runInContext(browserCode, sandbox);
const IIFE = sandbox.window.GameMixLogic;

const SAMPLE_GAMES = [
  { id: 'reaction', name: 'Reaktion' },
  { id: 'towerstack', name: 'Tower Stack' },
  { id: 'math', name: 'Blitz-Rechnen' },
  { id: 'coindash', name: 'Coin Dash' },
  { id: 'bubblepop', name: 'Bubble Pop' },
  { id: 'quizduel', name: 'Quiz Duell' },
];

test('Paritaet: getGameMix identisch fuer action-Spiele', () => {
  for (const g of SAMPLE_GAMES) {
    assert.equal(ESM.getGameMix(g.id), IIFE.getGameMix(g.id));
  }
});

test('Paritaet: getGameMix identisch fuer unbekannte IDs', () => {
  assert.equal(ESM.getGameMix('xyz'), IIFE.getGameMix('xyz'));
});

test('Paritaet: groupGamesByMix identisch', () => {
  const a = ESM.groupGamesByMix(SAMPLE_GAMES);
  const b = IIFE.groupGamesByMix(SAMPLE_GAMES);
  assert.deepEqual(a.action.map(g => g.id), b.action.map(g => g.id));
  assert.deepEqual(a.classic.map(g => g.id), b.classic.map(g => g.id));
});

test('Paritaet: getMixLabel identisch', () => {
  assert.equal(ESM.getMixLabel('action'), IIFE.getMixLabel('action'));
  assert.equal(ESM.getMixLabel('classic'), IIFE.getMixLabel('classic'));
});

test('Paritaet: MIXES identisch', () => {
  assert.deepEqual(ESM.MIXES, IIFE.MIXES);
});
