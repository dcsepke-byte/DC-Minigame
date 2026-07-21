/**
 * Dodgeball — Paritaets-Test: dodgeball-logic.js (ESM) vs dodgeball-logic-browser.js (IIFE)
 *
 * Stellt sicher, dass beide Implementierungen identische Ergebnisse liefern.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import * as ESM from '../js/dodgeball-logic.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const browserCode = readFileSync(join(__dirname, '..', 'js', 'dodgeball-logic-browser.js'), 'utf-8');

// Browser-IIFE in einer Sandbox ausfuehren (window mocken)
const sandbox = { window: {} };
const fn = new Function('window', browserCode + '\nreturn window.DodgeballLogic;');
const IIFE = fn(sandbox.window);

// Vergleiche alle exportierten Funktionen
const funcs = [
  'createDodgeballState', 'spawnBall', 'movePlayer', 'movePlayerBy',
  'tickBalls', 'computeSurvivalScore', 'computeCloseCallBonus',
  'isGameOver', 'getHits', 'getScore', 'getActiveBalls', 'getPlayer',
];

for (const fnName of funcs) {
  test(`Paritaet ${fnName}: ESM und Browser existieren`, () => {
    assert.equal(typeof ESM[fnName], 'function', `ESM ${fnName} fehlt`);
    assert.equal(typeof IIFE[fnName], 'function', `Browser ${fnName} fehlt`);
  });
}

test('createDodgeballState: identische Defaults', () => {
  const s1 = ESM.createDodgeballState({});
  const s2 = IIFE.createDodgeballState({});
  assert.equal(s1.maxHits, s2.maxHits);
  assert.equal(s1.gameOver, s2.gameOver);
  assert.equal(s1.stageWidth, s2.stageWidth);
  assert.equal(s1.stageHeight, s2.stageHeight);
  assert.equal(s1.player.radius, s2.player.radius);
  assert.equal(s1.player.x, s2.player.x);
  assert.equal(s1.player.y, s2.player.y);
});

test('movePlayer: identisch (inkl. Klemmen)', () => {
  const s1 = ESM.createDodgeballState({ stageWidth: 300, stageHeight: 600 });
  const s2 = IIFE.createDodgeballState({ stageWidth: 300, stageHeight: 600 });
  ESM.movePlayer(s1, 150, 400);
  IIFE.movePlayer(s2, 150, 400);
  assert.equal(s1.player.x, s2.player.x);
  assert.equal(s1.player.y, s2.player.y);
  ESM.movePlayer(s1, -50, -50);
  IIFE.movePlayer(s2, -50, -50);
  assert.equal(s1.player.x, s2.player.x);
  assert.equal(s1.player.y, s2.player.y);
  ESM.movePlayer(s1, 999, 999);
  IIFE.movePlayer(s2, 999, 999);
  assert.equal(s1.player.x, s2.player.x);
  assert.equal(s1.player.y, s2.player.y);
});

test('movePlayerBy: identisch', () => {
  const s1 = ESM.createDodgeballState({ stageWidth: 300, stageHeight: 600 });
  const s2 = IIFE.createDodgeballState({ stageWidth: 300, stageHeight: 600 });
  ESM.movePlayerBy(s1, 30, -10);
  IIFE.movePlayerBy(s2, 30, -10);
  assert.equal(s1.player.x, s2.player.x);
  assert.equal(s1.player.y, s2.player.y);
});

test('computeSurvivalScore: identisch', () => {
  for (const ms of [0, 100, 500, 1000, 5000, 10000, 30000]) {
    assert.equal(ESM.computeSurvivalScore(ms), IIFE.computeSurvivalScore(ms));
  }
});

test('computeCloseCallBonus: identisch', () => {
  for (const d of [10, 30, 35, 36, 40, 45, 50, 60, 100]) {
    assert.equal(ESM.computeCloseCallBonus(d, 20, 15, 15), IIFE.computeCloseCallBonus(d, 20, 15, 15));
  }
});

test('tickBalls: Treffer -> gleiche Ergebnisse', () => {
  const s1 = ESM.createDodgeballState({ maxHits: 5, stageWidth: 300, stageHeight: 600, playerRadius: 20 });
  const s2 = IIFE.createDodgeballState({ maxHits: 5, stageWidth: 300, stageHeight: 600, playerRadius: 20 });
  ESM.movePlayer(s1, 150, 300);
  IIFE.movePlayer(s2, 150, 300);
  const b1 = ESM.spawnBall(s1, 'left', 0);
  b1.x = 100; b1.y = 300; b1.vx = 0.5; b1.vy = 0; b1.radius = 15;
  const b2 = IIFE.spawnBall(s2, 'left', 0);
  b2.x = 100; b2.y = 300; b2.vx = 0.5; b2.vy = 0; b2.radius = 15;
  const e1 = ESM.tickBalls(s1, 100);
  const e2 = IIFE.tickBalls(s2, 100);
  assert.equal(ESM.getHits(s1), IIFE.getHits(s2));
  assert.equal(ESM.getActiveBalls(s1).length, IIFE.getActiveBalls(s2).length);
  assert.equal(e1.length, e2.length);
  assert.equal(e1[0].type, e2[0].type);
});

test('tickBalls: Escape -> gleiche Ergebnisse', () => {
  const s1 = ESM.createDodgeballState({ maxHits: 5, stageWidth: 300, stageHeight: 600, playerRadius: 20 });
  const s2 = IIFE.createDodgeballState({ maxHits: 5, stageWidth: 300, stageHeight: 600, playerRadius: 20 });
  ESM.movePlayer(s1, 150, 500);
  IIFE.movePlayer(s2, 150, 500);
  const b1 = ESM.spawnBall(s1, 'left', 0);
  b1.x = 0; b1.y = 100; b1.vx = 1.0; b1.vy = 0; b1.radius = 15;
  const b2 = IIFE.spawnBall(s2, 'left', 0);
  b2.x = 0; b2.y = 100; b2.vx = 1.0; b2.vy = 0; b2.radius = 15;
  ESM.tickBalls(s1, 1000);
  IIFE.tickBalls(s2, 1000);
  assert.equal(ESM.getHits(s1), IIFE.getHits(s2));
  assert.equal(ESM.getActiveBalls(s1).length, IIFE.getActiveBalls(s2).length);
  assert.equal(ESM.isGameOver(s1), IIFE.isGameOver(s2));
});

test('tickBalls: Game Over -> identisch', () => {
  const s1 = ESM.createDodgeballState({ maxHits: 2, stageWidth: 300, stageHeight: 600, playerRadius: 20 });
  const s2 = IIFE.createDodgeballState({ maxHits: 2, stageWidth: 300, stageHeight: 600, playerRadius: 20 });
  ESM.movePlayer(s1, 150, 300);
  IIFE.movePlayer(s2, 150, 300);
  for (let i = 0; i < 2; i++) {
    const b1 = ESM.spawnBall(s1, 'left', 0);
    b1.x = 100; b1.y = 300; b1.vx = 0.5; b1.vy = 0; b1.radius = 15;
    const b2 = IIFE.spawnBall(s2, 'left', 0);
    b2.x = 100; b2.y = 300; b2.vx = 0.5; b2.vy = 0; b2.radius = 15;
    ESM.tickBalls(s1, 100);
    IIFE.tickBalls(s2, 100);
  }
  assert.equal(ESM.getHits(s1), IIFE.getHits(s2));
  assert.equal(ESM.isGameOver(s1), IIFE.isGameOver(s2));
});

test('Sequenz: mehrere Treffer und Escapes identisch', () => {
  const s1 = ESM.createDodgeballState({ maxHits: 5, stageWidth: 300, stageHeight: 600, playerRadius: 20 });
  const s2 = IIFE.createDodgeballState({ maxHits: 5, stageWidth: 300, stageHeight: 600, playerRadius: 20 });
  ESM.movePlayer(s1, 150, 300);
  IIFE.movePlayer(s2, 150, 300);
  // Treffer
  let b1 = ESM.spawnBall(s1, 'left', 0); b1.x = 100; b1.y = 300; b1.vx = 0.5; b1.vy = 0; b1.radius = 15;
  let b2 = IIFE.spawnBall(s2, 'left', 0); b2.x = 100; b2.y = 300; b2.vx = 0.5; b2.vy = 0; b2.radius = 15;
  ESM.tickBalls(s1, 100);
  IIFE.tickBalls(s2, 100);
  // Escape
  b1 = ESM.spawnBall(s1, 'left', 0); b1.x = 0; b1.y = 100; b1.vx = 1.0; b1.vy = 0; b1.radius = 15;
  b2 = IIFE.spawnBall(s2, 'left', 0); b2.x = 0; b2.y = 100; b2.vx = 1.0; b2.vy = 0; b2.radius = 15;
  ESM.tickBalls(s1, 1000);
  IIFE.tickBalls(s2, 1000);
  assert.equal(ESM.getHits(s1), IIFE.getHits(s2));
  assert.equal(ESM.getActiveBalls(s1).length, IIFE.getActiveBalls(s2).length);
});