/**
 * Bubble Pop — Paritaetstest: ESM-Logik vs Browser-IIFE-Logik
 *
 * Stellt sicher, dass beide Implementierungen identische Ergebnisse liefern.
 * Node 22 built-in test runner: node --test tests/
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as ESM from '../js/bubble-pop-logic.js';

// Browser-IIFE in einem Mini-Window-Kontext laden
import fs from 'node:fs';
import vm from 'node:vm';

const code = fs.readFileSync(new URL('../js/bubble-pop-logic-browser.js', import.meta.url), 'utf-8');
const sandbox = { window: {}, Math: globalThis.Math, console };
vm.createContext(sandbox);
vm.runInContext(code, sandbox);
const IIFE = sandbox.window.BubblePopLogic;

test('Paritaet: createBubbleState gleiche Struktur', () => {
  const esmState = ESM.createBubbleState({ colors: ['#a', '#b'], maxMissed: 3 });
  const iifeState = IIFE.createBubbleState({ colors: ['#a', '#b'], maxMissed: 3 });
  assert.deepEqual(iifeState.colors, esmState.colors);
  assert.equal(iifeState.maxMissed, esmState.maxMissed);
  assert.equal(iifeState.score, esmState.score);
  assert.equal(iifeState.gameOver, esmState.gameOver);
  assert.equal(iifeState.bubbles.length, esmState.bubbles.length);
});

test('Paritaet: setPlayerColor gleiche Farbe', () => {
  const esmState = ESM.createBubbleState({ colors: ['#a', '#b', '#c'] });
  const iifeState = IIFE.createBubbleState({ colors: ['#a', '#b', '#c'] });
  ESM.setPlayerColor(esmState, 2);
  IIFE.setPlayerColor(iifeState, 2);
  assert.equal(iifeState.playerColor, esmState.playerColor);
});

test('Paritaet: popBubble korrekte Blase gleiche Score', () => {
  const esmState = ESM.createBubbleState({ colors: ['#a', '#b'] });
  const iifeState = IIFE.createBubbleState({ colors: ['#a', '#b'] });
  ESM.setPlayerColor(esmState, 0);
  IIFE.setPlayerColor(iifeState, 0);
  const eb = ESM.spawnBubble(esmState, 50, 100, 0);
  const ib = IIFE.spawnBubble(iifeState, 50, 100, 0);
  const er = ESM.popBubble(esmState, eb.id);
  const ir = IIFE.popBubble(iifeState, ib.id);
  assert.equal(ir.correct, er.correct);
  assert.equal(ir.score, er.score);
  assert.equal(iifeState.score, esmState.score);
  assert.equal(iifeState.combo, esmState.combo);
});

test('Paritaet: popBubble falsche Blase gleiche missed', () => {
  const esmState = ESM.createBubbleState({ colors: ['#a', '#b'] });
  const iifeState = IIFE.createBubbleState({ colors: ['#a', '#b'] });
  ESM.setPlayerColor(esmState, 0);
  IIFE.setPlayerColor(iifeState, 0);
  const eb = ESM.spawnBubble(esmState, 50, 100, 1);
  const ib = IIFE.spawnBubble(iifeState, 50, 100, 1);
  ESM.popBubble(esmState, eb.id);
  IIFE.popBubble(iifeState, ib.id);
  assert.equal(iifeState.missed, esmState.missed);
  assert.equal(iifeState.combo, esmState.combo);
});

test('Paritaet: computeScore gleiche Werte', () => {
  for (const c of [0, 1, 2, 5, 10, 20]) {
    assert.equal(IIFE.computeScore(c), ESM.computeScore(c), `computeScore(${c})`);
  }
});

test('Paritaet: computeChainBonus gleiche Werte', () => {
  for (const n of [1, 2, 3, 5, 10]) {
    assert.equal(IIFE.computeChainBonus(n), ESM.computeChainBonus(n), `computeChainBonus(${n})`);
  }
});

test('Paritaet: tickBubbles gleiche escaped-Events', () => {
  const esmState = ESM.createBubbleState({ colors: ['#a'] });
  const iifeState = IIFE.createBubbleState({ colors: ['#a'] });
  ESM.setPlayerColor(esmState, 0);
  IIFE.setPlayerColor(iifeState, 0);
  ESM.spawnBubble(esmState, 100, 10, 0);
  IIFE.spawnBubble(iifeState, 100, 10, 0);
  const eEvents = ESM.tickBubbles(esmState, 1000, 600);
  const iEvents = IIFE.tickBubbles(iifeState, 1000, 600);
  assert.equal(iEvents.length, eEvents.length);
  assert.equal(iifeState.missed, esmState.missed);
  assert.equal(iifeState.gameOver, esmState.gameOver);
});