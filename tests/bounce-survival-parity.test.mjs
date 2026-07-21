/**
 * Bounce Survival — Paritaets-Test: ESM vs Browser-IIFE
 *
 * Stellt sicher, dass beide Implementierungen identische Ergebnisse liefern.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import * as ESM from '../js/bounce-survival-logic.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const browserCode = readFileSync(join(__dirname, '..', 'js', 'bounce-survival-logic-browser.js'), 'utf-8');

// Browser-IIFE in einer Sandbox ausfuehren (window mocken)
const sandbox = { window: {} };
const fn = new Function('window', browserCode + '\nreturn window.BounceSurvivalLogic;');
const IIFE = fn(sandbox.window);

const funcs = [
  'createBounceSurvivalState', 'movePaddle', 'tickBall', 'resetBall',
  'increaseSpeed', 'computeSurvivalScore', 'computeBounceBonus',
  'isGameOver', 'getMisses', 'getScore', 'getBall', 'getPaddle', 'getBounces',
];

for (const fnName of funcs) {
  test(`Paritaet ${fnName}: ESM und Browser existieren`, () => {
    assert.equal(typeof ESM[fnName], 'function', `ESM ${fnName} fehlt`);
    assert.equal(typeof IIFE[fnName], 'function', `Browser ${fnName} fehlt`);
  });
}

test('createBounceSurvivalState: identische Defaults', () => {
  const s1 = ESM.createBounceSurvivalState({});
  const s2 = IIFE.createBounceSurvivalState({});
  assert.equal(s1.maxMisses, s2.maxMisses);
  assert.equal(s1.gameOver, s2.gameOver);
  assert.equal(s1.stageWidth, s2.stageWidth);
  assert.equal(s1.stageHeight, s2.stageHeight);
  assert.equal(s1.ball.radius, s2.ball.radius);
  assert.equal(s1.paddle.width, s2.paddle.width);
  assert.equal(s1.paddle.height, s2.paddle.height);
  assert.equal(s1.paddle.y, s2.paddle.y);
});

test('movePaddle: identisch (inkl. Klemmen)', () => {
  const s1 = ESM.createBounceSurvivalState({ stageWidth: 300, stageHeight: 600 });
  const s2 = IIFE.createBounceSurvivalState({ stageWidth: 300, stageHeight: 600 });
  ESM.movePaddle(s1, 150);
  IIFE.movePaddle(s2, 150);
  assert.equal(s1.paddle.x, s2.paddle.x);
  ESM.movePaddle(s1, -50);
  IIFE.movePaddle(s2, -50);
  assert.equal(s1.paddle.x, s2.paddle.x);
  ESM.movePaddle(s1, 999);
  IIFE.movePaddle(s2, 999);
  assert.equal(s1.paddle.x, s2.paddle.x);
});

test('tickBall: Paddle-Treffer -> gleiche Ergebnisse', () => {
  const s1 = ESM.createBounceSurvivalState({ maxMisses: 5, stageWidth: 300, stageHeight: 600, ballRadius: 10, paddleWidth: 80 });
  const s2 = IIFE.createBounceSurvivalState({ maxMisses: 5, stageWidth: 300, stageHeight: 600, ballRadius: 10, paddleWidth: 80 });
  ESM.movePaddle(s1, 150);
  IIFE.movePaddle(s2, 150);
  s1.ball.x = 150; s1.ball.y = 546; s1.ball.vx = 0; s1.ball.vy = 0.2;
  s2.ball.x = 150; s2.ball.y = 546; s2.ball.vx = 0; s2.ball.vy = 0.2;
  ESM.tickBalls ? null : null;
  const e1 = ESM.tickBall(s1, 100);
  const e2 = IIFE.tickBall(s2, 100);
  assert.equal(ESM.getBounces(s1), IIFE.getBounces(s2));
  assert.equal(e1.length, e2.length);
  assert.equal(e1[0].type, e2[0].type);
  assert.equal(s1.ball.vy < 0, s2.ball.vy < 0);
});

test('tickBall: Wand-Kollision -> gleiche Ergebnisse', () => {
  const s1 = ESM.createBounceSurvivalState({ stageWidth: 300, stageHeight: 600, ballRadius: 10 });
  const s2 = IIFE.createBounceSurvivalState({ stageWidth: 300, stageHeight: 600, ballRadius: 10 });
  s1.ball.x = 5; s1.ball.y = 100; s1.ball.vx = -0.2; s1.ball.vy = 0.1;
  s2.ball.x = 5; s2.ball.y = 100; s2.ball.vx = -0.2; s2.ball.vy = 0.1;
  ESM.tickBall(s1, 100);
  IIFE.tickBall(s2, 100);
  assert.equal(s1.ball.vx > 0, s2.ball.vx > 0);
  assert.equal(s1.ball.x, s2.ball.x);
});

test('tickBall: Miss -> gleiche Ergebnisse', () => {
  const s1 = ESM.createBounceSurvivalState({ maxMisses: 3, stageWidth: 300, stageHeight: 600, ballRadius: 10, paddleWidth: 80 });
  const s2 = IIFE.createBounceSurvivalState({ maxMisses: 3, stageWidth: 300, stageHeight: 600, ballRadius: 10, paddleWidth: 80 });
  ESM.movePaddle(s1, 50);
  IIFE.movePaddle(s2, 50);
  s1.ball.x = 250; s1.ball.y = 590; s1.ball.vx = 0; s1.ball.vy = 0.2;
  s2.ball.x = 250; s2.ball.y = 590; s2.ball.vx = 0; s2.ball.vy = 0.2;
  ESM.tickBall(s1, 100);
  IIFE.tickBall(s2, 100);
  assert.equal(ESM.getMisses(s1), IIFE.getMisses(s2));
});

test('tickBall: Game Over -> identisch', () => {
  const s1 = ESM.createBounceSurvivalState({ maxMisses: 2, stageWidth: 300, stageHeight: 600, ballRadius: 10, paddleWidth: 80 });
  const s2 = IIFE.createBounceSurvivalState({ maxMisses: 2, stageWidth: 300, stageHeight: 600, ballRadius: 10, paddleWidth: 80 });
  ESM.movePaddle(s1, 50);
  IIFE.movePaddle(s2, 50);
  for (var i = 0; i < 2; i++) {
    s1.ball.x = 250; s1.ball.y = 590; s1.ball.vx = 0; s1.ball.vy = 0.2;
    s2.ball.x = 250; s2.ball.y = 590; s2.ball.vx = 0; s2.ball.vy = 0.2;
    ESM.tickBall(s1, 100);
    IIFE.tickBall(s2, 100);
  }
  assert.equal(ESM.getMisses(s1), IIFE.getMisses(s2));
  assert.equal(ESM.isGameOver(s1), IIFE.isGameOver(s2));
});

test('increaseSpeed: identisch', () => {
  const s1 = ESM.createBounceSurvivalState({ stageWidth: 300, stageHeight: 600 });
  const s2 = IIFE.createBounceSurvivalState({ stageWidth: 300, stageHeight: 600 });
  s1.ball.vx = 0.1; s1.ball.vy = 0.2;
  s2.ball.vx = 0.1; s2.ball.vy = 0.2;
  ESM.increaseSpeed(s1, 1.5);
  IIFE.increaseSpeed(s2, 1.5);
  assert.equal(s1.ball.vx, s2.ball.vx);
  assert.equal(s1.ball.vy, s2.ball.vy);
});

test('computeSurvivalScore: identisch', () => {
  for (const ms of [0, 100, 500, 1000, 5000, 10000, 30000]) {
    assert.equal(ESM.computeSurvivalScore(ms), IIFE.computeSurvivalScore(ms));
  }
});

test('computeBounceBonus: identisch', () => {
  for (const b of [0, 1, 5, 10, 20, 50]) {
    assert.equal(ESM.computeBounceBonus(b), IIFE.computeBounceBonus(b));
  }
});