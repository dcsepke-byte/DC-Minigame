/**
 * Ninja Slash — Paritaets-Test: ninja-slash-logic.js (ESM) vs ninja-slash-logic-browser.js (IIFE)
 *
 * Stellt sicher, dass beide Implementierungen identische Ergebnisse liefern.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import * as ESM from '../js/ninja-slash-logic.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const browserCode = readFileSync(join(__dirname, '..', 'js', 'ninja-slash-logic-browser.js'), 'utf-8');

// Browser-IIFE in einer Sandbox ausfuehren (window mocken)
const sandbox = { window: {} };
const fn = new Function('window', browserCode + '\nreturn window.NinjaSlashLogic;');
const IIFE = fn(sandbox.window);

// Vergleiche alle exportierten Funktionen
const funcs = [
  'createNinjaState', 'spawnObject', 'slashObject', 'tickObjects',
  'getActiveObjects', 'isGameOver', 'getMissedCount', 'getScore',
  'getCombo', 'computeComboBonus', 'setPlayerColor',
];

for (const fnName of funcs) {
  test(`Paritaet ${fnName}: ESM und Browser identisch`, () => {
    assert.equal(typeof ESM[fnName], 'function', `ESM ${fnName} fehlt`);
    assert.equal(typeof IIFE[fnName], 'function', `Browser ${fnName} fehlt`);
  });
}

test('FRUIT_TYPES: ESM und Browser identisch', () => {
  assert.ok(ESM.FRUIT_TYPES, 'ESM FRUIT_TYPES fehlt');
  assert.ok(IIFE.FRUIT_TYPES, 'Browser FRUIT_TYPES fehlt');
  assert.equal(ESM.FRUIT_TYPES.length, IIFE.FRUIT_TYPES.length);
  for (let i = 0; i < ESM.FRUIT_TYPES.length; i++) {
    assert.deepEqual(ESM.FRUIT_TYPES[i], IIFE.FRUIT_TYPES[i]);
  }
});

test('createNinjaState: identische Defaults', () => {
  const s1 = ESM.createNinjaState({});
  const s2 = IIFE.createNinjaState({});
  assert.equal(s1.maxMissed, s2.maxMissed);
  assert.equal(s1.gravity, s2.gravity);
  assert.equal(s1.gameOver, s2.gameOver);
});

test('spawnObject + slashObject: gleiche Ergebnisse', () => {
  const s1 = ESM.createNinjaState({ maxMissed: 5 });
  const s2 = IIFE.createNinjaState({ maxMissed: 5 });

  const o1 = ESM.spawnObject(s1, 100, 300, 'watermelon', { vx: 0.1, vy: -0.5 });
  const o2 = IIFE.spawnObject(s2, 100, 300, 'watermelon', { vx: 0.1, vy: -0.5 });
  assert.equal(o1.x, o2.x);
  assert.equal(o1.y, o2.y);
  assert.equal(o1.isBomb, o2.isBomb);
  assert.equal(o1.points, o2.points);

  const r1 = ESM.slashObject(s1, o1.id);
  const r2 = IIFE.slashObject(s2, o2.id);
  assert.equal(r1.hit, r2.hit);
  assert.equal(r1.points, r2.points);
  assert.equal(r1.combo, r2.combo);
});

test('tickObjects: gleiche Physik', () => {
  const s1 = ESM.createNinjaState({ maxMissed: 5 });
  const s2 = IIFE.createNinjaState({ maxMissed: 5 });

  ESM.spawnObject(s1, 100, 300, 'apple', { vx: 0.05, vy: -0.4 });
  IIFE.spawnObject(s2, 100, 300, 'apple', { vx: 0.05, vy: -0.4 });

  const e1 = ESM.tickObjects(s1, 500, 600);
  const e2 = IIFE.tickObjects(s2, 500, 600);

  assert.equal(s1.objects[0].x, s2.objects[0].x);
  assert.equal(s1.objects[0].y, s2.objects[0].y);
  assert.equal(s1.objects[0].vy, s2.objects[0].vy);
  assert.equal(e1.length, e2.length);
});

test('tickObjects: Frucht entkommen → gleiche missed-Counter', () => {
  const s1 = ESM.createNinjaState({ maxMissed: 3 });
  const s2 = IIFE.createNinjaState({ maxMissed: 3 });

  ESM.spawnObject(s1, 100, 500, 'watermelon', { vx: 0, vy: 1.0 });
  IIFE.spawnObject(s2, 100, 500, 'watermelon', { vx: 0, vy: 1.0 });

  ESM.tickObjects(s1, 1000, 600);
  IIFE.tickObjects(s2, 1000, 600);

  assert.equal(ESM.getMissedCount(s1), IIFE.getMissedCount(s2));
  assert.equal(ESM.isGameOver(s1), IIFE.isGameOver(s2));
});

test('slashObject: Bombe → beide Game Over', () => {
  const s1 = ESM.createNinjaState({ maxMissed: 5 });
  const s2 = IIFE.createNinjaState({ maxMissed: 5 });

  const o1 = ESM.spawnObject(s1, 50, 300, 'bomb');
  const o2 = IIFE.spawnObject(s2, 50, 300, 'bomb');

  ESM.slashObject(s1, o1.id);
  IIFE.slashObject(s2, o2.id);

  assert.equal(ESM.isGameOver(s1), IIFE.isGameOver(s2));
  assert.equal(ESM.isGameOver(s1), true);
});

test('computeComboBonus: identisch', () => {
  for (let c = 0; c <= 10; c++) {
    assert.equal(ESM.computeComboBonus(c), IIFE.computeComboBonus(c));
  }
});