/**
 * Color Catch — Paritaets-Test: color-catch-logic.js (ESM) vs color-catch-logic-browser.js (IIFE)
 *
 * Stellt sicher, dass beide Implementierungen identische Ergebnisse liefern.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import * as ESM from '../js/color-catch-logic.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const browserCode = readFileSync(join(__dirname, '..', 'js', 'color-catch-logic-browser.js'), 'utf-8');

// Browser-IIFE in einer Sandbox ausfuehren (window mocken)
const sandbox = { window: {} };
const fn = new Function('window', browserCode + '\nreturn window.ColorCatchLogic;');
const IIFE = fn(sandbox.window);

// Vergleiche alle exportierten Funktionen
const funcs = [
  'createColorCatchState', 'setPlayerColor', 'spawnObject', 'moveBasket',
  'tickObjects', 'getActiveObjects', 'isGameOver', 'getMissedCount',
  'getScore', 'getCombo', 'getBestCombo', 'computeCatchScore', 'computeComboBonus',
];

for (const fnName of funcs) {
  test(`Paritaet ${fnName}: ESM und Browser existieren`, () => {
    assert.equal(typeof ESM[fnName], 'function', `ESM ${fnName} fehlt`);
    assert.equal(typeof IIFE[fnName], 'function', `Browser ${fnName} fehlt`);
  });
}

test('createColorCatchState: identische Defaults', () => {
  const s1 = ESM.createColorCatchState({});
  const s2 = IIFE.createColorCatchState({});
  assert.equal(s1.maxMissed, s2.maxMissed);
  assert.equal(s1.gameOver, s2.gameOver);
  assert.equal(s1.basket.width, s2.basket.width);
  assert.equal(s1.stageWidth, s2.stageWidth);
});

test('setPlayerColor: identisch', () => {
  const s1 = ESM.createColorCatchState({ colors: ['#ff0', '#0ff', '#f0f'] });
  const s2 = IIFE.createColorCatchState({ colors: ['#ff0', '#0ff', '#f0f'] });
  ESM.setPlayerColor(s1, 2);
  IIFE.setPlayerColor(s2, 2);
  assert.equal(s1.playerColor, s2.playerColor);
});

test('moveBasket: identisch (inkl. Klemmen)', () => {
  const s1 = ESM.createColorCatchState({ stageWidth: 300 });
  const s2 = IIFE.createColorCatchState({ stageWidth: 300 });
  ESM.moveBasket(s1, 150);
  IIFE.moveBasket(s2, 150);
  assert.equal(s1.basket.x, s2.basket.x);
  ESM.moveBasket(s1, -50);
  IIFE.moveBasket(s2, -50);
  assert.equal(s1.basket.x, s2.basket.x);
  ESM.moveBasket(s1, 999);
  IIFE.moveBasket(s2, 999);
  assert.equal(s1.basket.x, s2.basket.x);
});

test('spawnObject: gleiche Eigenschaften', () => {
  const s1 = ESM.createColorCatchState({ maxMissed: 5, colors: ['#ff0', '#0ff'] });
  const s2 = IIFE.createColorCatchState({ maxMissed: 5, colors: ['#ff0', '#0ff'] });
  const o1 = ESM.spawnObject(s1, 100, 200, 0);
  const o2 = IIFE.spawnObject(s2, 100, 200, 0);
  assert.equal(o1.x, o2.x);
  assert.equal(o1.y, o2.y);
  assert.equal(o1.color, o2.color);
  assert.equal(o1.radius, o2.radius);
  assert.equal(o1.speed, o2.speed);
});

test('tickObjects: richtige Farbe gefangen -> gleiche Ergebnisse', () => {
  const s1 = ESM.createColorCatchState({ maxMissed: 5, stageWidth: 300, stageHeight: 600, colors: ['#ff0', '#0ff'] });
  const s2 = IIFE.createColorCatchState({ maxMissed: 5, stageWidth: 300, stageHeight: 600, colors: ['#ff0', '#0ff'] });
  s1.basket.x = 100; s1.basket.width = 80;
  s2.basket.x = 100; s2.basket.width = 80;
  const o1 = ESM.spawnObject(s1, 120, 570, 0);
  o1.speed = 0.5;
  const o2 = IIFE.spawnObject(s2, 120, 570, 0);
  o2.speed = 0.5;
  const e1 = ESM.tickObjects(s1, 100, 600, 580);
  const e2 = IIFE.tickObjects(s2, 100, 600, 580);
  assert.equal(ESM.getScore(s1), IIFE.getScore(s2));
  assert.equal(ESM.getCombo(s1), IIFE.getCombo(s2));
  assert.equal(e1.length, e2.length);
  assert.equal(e1[0].type, e2[0].type);
});

test('tickObjects: falsche Farbe gefangen -> gleiche missed', () => {
  const s1 = ESM.createColorCatchState({ maxMissed: 5, stageWidth: 300, stageHeight: 600, colors: ['#ff0', '#0ff'] });
  const s2 = IIFE.createColorCatchState({ maxMissed: 5, stageWidth: 300, stageHeight: 600, colors: ['#ff0', '#0ff'] });
  s1.playerColor = '#ff0'; s1.basket.x = 100; s1.basket.width = 80;
  s2.playerColor = '#ff0'; s2.basket.x = 100; s2.basket.width = 80;
  const o1 = ESM.spawnObject(s1, 120, 570, 1);
  o1.speed = 0.5;
  const o2 = IIFE.spawnObject(s2, 120, 570, 1);
  o2.speed = 0.5;
  ESM.tickObjects(s1, 100, 600, 580);
  IIFE.tickObjects(s2, 100, 600, 580);
  assert.equal(ESM.getMissedCount(s1), IIFE.getMissedCount(s2));
});

test('tickObjects: entkommen -> gleiche Ergebnisse', () => {
  const s1 = ESM.createColorCatchState({ maxMissed: 5, stageWidth: 300, stageHeight: 600, colors: ['#ff0', '#0ff'] });
  const s2 = IIFE.createColorCatchState({ maxMissed: 5, stageWidth: 300, stageHeight: 600, colors: ['#ff0', '#0ff'] });
  s1.playerColor = '#ff0'; s1.basket.x = 200; s1.basket.width = 60;
  s2.playerColor = '#ff0'; s2.basket.x = 200; s2.basket.width = 60;
  const o1 = ESM.spawnObject(s1, 50, 0, 0);
  o1.speed = 1.0;
  const o2 = IIFE.spawnObject(s2, 50, 0, 0);
  o2.speed = 1.0;
  ESM.tickObjects(s1, 1000, 600, 580);
  IIFE.tickObjects(s2, 1000, 600, 580);
  assert.equal(ESM.getMissedCount(s1), IIFE.getMissedCount(s2));
  assert.equal(ESM.isGameOver(s1), IIFE.isGameOver(s2));
});

test('computeCatchScore: identisch', () => {
  for (let c = 0; c <= 10; c++) {
    assert.equal(ESM.computeCatchScore(c), IIFE.computeCatchScore(c));
  }
});

test('computeComboBonus: identisch', () => {
  for (let c = 0; c <= 10; c++) {
    assert.equal(ESM.computeComboBonus(c), IIFE.computeComboBonus(c));
  }
});

test('Sequenz: mehrere Catches und Escapes identisch', () => {
  const s1 = ESM.createColorCatchState({ maxMissed: 3, stageWidth: 300, stageHeight: 600, colors: ['#ff0', '#0ff', '#f0f'] });
  const s2 = IIFE.createColorCatchState({ maxMissed: 3, stageWidth: 300, stageHeight: 600, colors: ['#ff0', '#0ff', '#f0f'] });
  s1.playerColor = '#ff0'; s1.basket.x = 100; s1.basket.width = 80;
  s2.playerColor = '#ff0'; s2.basket.x = 100; s2.basket.width = 80;
  // Catch richtig
  let o1 = ESM.spawnObject(s1, 120, 570, 0); o1.speed = 0.5;
  let o2 = IIFE.spawnObject(s2, 120, 570, 0); o2.speed = 0.5;
  ESM.tickObjects(s1, 100, 600, 580);
  IIFE.tickObjects(s2, 100, 600, 580);
  // Catch richtig
  o1 = ESM.spawnObject(s1, 110, 570, 0); o1.speed = 0.5;
  o2 = IIFE.spawnObject(s2, 110, 570, 0); o2.speed = 0.5;
  ESM.tickObjects(s1, 100, 600, 580);
  IIFE.tickObjects(s2, 100, 600, 580);
  // Escape richtig
  o1 = ESM.spawnObject(s1, 10, 0, 0); o1.speed = 1.0;
  o2 = IIFE.spawnObject(s2, 10, 0, 0); o2.speed = 1.0;
  ESM.tickObjects(s1, 1000, 600, 580);
  IIFE.tickObjects(s2, 1000, 600, 580);
  assert.equal(ESM.getScore(s1), IIFE.getScore(s2));
  assert.equal(ESM.getCombo(s1), IIFE.getCombo(s2));
  assert.equal(ESM.getBestCombo(s1), IIFE.getBestCombo(s2));
  assert.equal(ESM.getMissedCount(s1), IIFE.getMissedCount(s2));
});