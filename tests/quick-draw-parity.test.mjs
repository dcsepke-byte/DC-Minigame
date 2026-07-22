/**
 * Quick Draw Duel — Paritaets-Test: ESM vs Browser-IIFE
 *
 * Stellt sicher, dass beide Implementierungen identische Ergebnisse liefern.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import * as ESM from '../js/quick-draw-logic.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const browserCode = readFileSync(join(__dirname, '..', 'js', 'quick-draw-logic-browser.js'), 'utf-8');

// Browser-IIFE in einer Sandbox ausfuehren (window mocken)
const sandbox = { window: {} };
const fn = new Function('window', browserCode + '\nreturn window.QuickDrawLogic;');
const IIFE = fn(sandbox.window);

const funcs = [
  'createQuickDrawState', 'startRound', 'fireSignal', 'playerTap',
  'computeReactionScore', 'isRoundOver', 'isGameOver',
  'getRound', 'getScore', 'getMisses', 'getFouls', 'getPhase',
  'getSignalTime', 'getReactionTime', 'getMaxRounds',
];

for (const fnName of funcs) {
  test(`Paritaet ${fnName}: ESM und Browser existieren`, () => {
    assert.equal(typeof ESM[fnName], 'function', `ESM ${fnName} fehlt`);
    assert.equal(typeof IIFE[fnName], 'function', `Browser ${fnName} fehlt`);
  });
}

test('createQuickDrawState: identische Defaults', () => {
  const s1 = ESM.createQuickDrawState({});
  const s2 = IIFE.createQuickDrawState({});
  assert.equal(s1.maxRounds, s2.maxRounds);
  assert.equal(s1.gameOver, s2.gameOver);
  assert.equal(s1.phase, s2.phase);
  assert.equal(s1.round, s2.round);
  assert.equal(s1.score, s2.score);
});

test('startRound: identisch', () => {
  const s1 = ESM.createQuickDrawState({ maxRounds: 3 });
  const s2 = IIFE.createQuickDrawState({ maxRounds: 3 });
  ESM.startRound(s1);
  IIFE.startRound(s2);
  assert.equal(s1.round, s2.round);
  assert.equal(s1.phase, s2.phase);
  assert.equal(s1.signalTime, s2.signalTime);
});

test('fireSignal: identisch', () => {
  const s1 = ESM.createQuickDrawState({ maxRounds: 3 });
  const s2 = IIFE.createQuickDrawState({ maxRounds: 3 });
  ESM.startRound(s1);
  IIFE.startRound(s2);
  ESM.fireSignal(s1, 5000);
  IIFE.fireSignal(s2, 5000);
  assert.equal(s1.phase, s2.phase);
  assert.equal(s1.signalTime, s2.signalTime);
});

test('playerTap: Foul -> identisch', () => {
  const s1 = ESM.createQuickDrawState({ maxRounds: 3 });
  const s2 = IIFE.createQuickDrawState({ maxRounds: 3 });
  ESM.startRound(s1);
  IIFE.startRound(s2);
  ESM.playerTap(s1, 500);
  IIFE.playerTap(s2, 500);
  assert.equal(s1.fouls, s2.fouls);
  assert.equal(s1.phase, s2.phase);
  assert.equal(s1.score, s2.score);
});

test('playerTap: Reaktion -> identisch', () => {
  const s1 = ESM.createQuickDrawState({ maxRounds: 3 });
  const s2 = IIFE.createQuickDrawState({ maxRounds: 3 });
  ESM.startRound(s1);
  IIFE.startRound(s2);
  ESM.fireSignal(s1, 1000);
  IIFE.fireSignal(s2, 1000);
  ESM.playerTap(s1, 1300);
  IIFE.playerTap(s2, 1300);
  assert.equal(s1.reactionTime, s2.reactionTime);
  assert.equal(s1.score, s2.score);
  assert.equal(s1.phase, s2.phase);
});

test('playerTap: Miss (>2000ms) -> identisch', () => {
  const s1 = ESM.createQuickDrawState({ maxRounds: 3 });
  const s2 = IIFE.createQuickDrawState({ maxRounds: 3 });
  ESM.startRound(s1);
  IIFE.startRound(s2);
  ESM.fireSignal(s1, 1000);
  IIFE.fireSignal(s2, 1000);
  ESM.playerTap(s1, 3500);
  IIFE.playerTap(s2, 3500);
  assert.equal(s1.misses, s2.misses);
  assert.equal(s1.score, s2.score);
});

test('isRoundOver / isGameOver: identisch', () => {
  const s1 = ESM.createQuickDrawState({ maxRounds: 2 });
  const s2 = IIFE.createQuickDrawState({ maxRounds: 2 });
  for (let i = 0; i < 2; i++) {
    ESM.startRound(s1);
    IIFE.startRound(s2);
    ESM.fireSignal(s1, 1000 + i * 1000);
    IIFE.fireSignal(s2, 1000 + i * 1000);
    ESM.playerTap(s1, 1200 + i * 1000);
    IIFE.playerTap(s2, 1200 + i * 1000);
  }
  assert.equal(ESM.isRoundOver(s1), IIFE.isRoundOver(s2));
  assert.equal(ESM.isGameOver(s1), IIFE.isGameOver(s2));
  assert.equal(ESM.getScore(s1), IIFE.getScore(s2));
});

test('computeReactionScore: identisch', () => {
  for (const ms of [0, -100, 100, 150, 300, 500, 1000, 2000, 2500, 3000]) {
    assert.equal(ESM.computeReactionScore(ms), IIFE.computeReactionScore(ms), `ms=${ms}`);
  }
});