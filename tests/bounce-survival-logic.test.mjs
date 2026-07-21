/**
 * Bounce Survival — Logik-Tests (TDD)
 *
 * Testet die reine Spiellogik ohne Browser-Abhaengigkeiten.
 * Node 22 built-in test runner: node --test tests/bounce-survival-logic.test.mjs
 *
 * Konzept:
 *  - Ball springt im Spielfeld (Wande oben/links/rechts)
 *  - Paddle unten, bewegt sich nur horizontal
 *  - Ball prallt am Paddle ab (Winkel abhaengig vom Trefferpunkt)
 *  - Ball faellt unter Paddle -> miss +1, Ball wird resettet
 *  - maxMisses erreicht -> Game Over
 *  - Geschwindigkeit steigt mit der Zeit
 *  - Score = Survival-Zeit + Bounce-Bonus
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createBounceSurvivalState,
  movePaddle,
  tickBall,
  resetBall,
  computeSurvivalScore,
  computeBounceBonus,
  increaseSpeed,
  isGameOver,
  getMisses,
  getScore,
  getBall,
  getPaddle,
  getBounces,
} from '../js/bounce-survival-logic.js';

/* ---------- createBounceSurvivalState ---------- */

test('createBounceSurvivalState: Startzustand leer, Score 0, gameOver false', () => {
  const state = createBounceSurvivalState({ maxMisses: 3 });
  assert.equal(state.score, 0);
  assert.equal(state.gameOver, false);
  assert.equal(state.misses, 0);
  assert.equal(state.maxMisses, 3);
  assert.equal(state.bounces, 0);
});

test('createBounceSurvivalState: Default maxMisses ist 3', () => {
  const state = createBounceSurvivalState({});
  assert.equal(state.maxMisses, 3);
});

test('createBounceSurvivalState: hat Ball mit x, y, vx, vy, radius', () => {
  const state = createBounceSurvivalState({ stageWidth: 300, stageHeight: 600, ballRadius: 10 });
  assert.ok(state.ball, 'ball sollte existieren');
  assert.ok(typeof state.ball.x === 'number');
  assert.ok(typeof state.ball.y === 'number');
  assert.ok(typeof state.ball.vx === 'number');
  assert.ok(typeof state.ball.vy === 'number');
  assert.equal(state.ball.radius, 10);
});

test('createBounceSurvivalState: Ball startet in der Mitte', () => {
  const state = createBounceSurvivalState({ stageWidth: 300, stageHeight: 600 });
  assert.ok(Math.abs(state.ball.x - 150) < 1, 'x sollte ~150 (Mitte) sein');
  assert.ok(state.ball.y > 0 && state.ball.y < 600, 'y sollte im Spielfeld sein');
});

test('createBounceSurvivalState: Ball bewegt sich nach unten (vy > 0)', () => {
  const state = createBounceSurvivalState({ stageWidth: 300, stageHeight: 600 });
  assert.ok(state.ball.vy > 0, 'vy sollte positiv sein (nach unten)');
});

test('createBounceSurvivalState: hat Paddle mit x, y, width, height', () => {
  const state = createBounceSurvivalState({ stageWidth: 300, stageHeight: 600, paddleWidth: 80 });
  assert.ok(state.paddle, 'paddle sollte existieren');
  assert.ok(typeof state.paddle.x === 'number');
  assert.ok(typeof state.paddle.y === 'number');
  assert.equal(state.paddle.width, 80);
  assert.ok(state.paddle.height > 0);
});

test('createBounceSurvivalState: Paddle startet zentriert unten', () => {
  const state = createBounceSurvivalState({ stageWidth: 300, stageHeight: 600, paddleWidth: 80 });
  assert.ok(Math.abs(state.paddle.x - 150) < 1, 'x sollte ~150 (Mitte) sein');
  assert.ok(state.paddle.y > 500, 'y sollte unten sein');
});

/* ---------- movePaddle ---------- */

test('movePaddle: setzt x-Zentrum des Paddles', () => {
  const state = createBounceSurvivalState({ stageWidth: 300, stageHeight: 600, paddleWidth: 80 });
  movePaddle(state, 100);
  assert.equal(state.paddle.x, 100);
});

test('movePaddle: klemmt links an Radius', () => {
  const state = createBounceSurvivalState({ stageWidth: 300, stageHeight: 600, paddleWidth: 80 });
  movePaddle(state, -50);
  assert.equal(state.paddle.x, 40); // width/2 = 40
});

test('movePaddle: klemmt rechts an stageWidth - width/2', () => {
  const state = createBounceSurvivalState({ stageWidth: 300, stageHeight: 600, paddleWidth: 80 });
  movePaddle(state, 999);
  assert.equal(state.paddle.x, 260); // 300 - 40 = 260
});

/* ---------- tickBall: Wand-Kollisionen ---------- */

test('tickBall: Ball bewegt sich entsprechend vx*vy*dt', () => {
  const state = createBounceSurvivalState({ stageWidth: 300, stageHeight: 600 });
  state.ball.x = 100; state.ball.y = 100; state.ball.vx = 0.1; state.ball.vy = 0.05;
  tickBall(state, 1000);
  assert.ok(state.ball.x > 100, 'x sollte sich vergroessert haben');
  assert.ok(state.ball.y > 100, 'y sollte sich vergroessert haben');
});

test('tickBall: Ball prallt links ab (vx kehrt um)', () => {
  const state = createBounceSurvivalState({ stageWidth: 300, stageHeight: 600, ballRadius: 10 });
  state.ball.x = 5; state.ball.y = 100; state.ball.vx = -0.2; state.ball.vy = 0.1;
  tickBall(state, 100); // bewegt sich 20px nach links -> x < 0 -> prallt ab
  assert.ok(state.ball.vx > 0, 'vx sollte positiv sein (prallt nach rechts)');
});

test('tickBall: Ball prallt rechts ab (vx kehrt um)', () => {
  const state = createBounceSurvivalState({ stageWidth: 300, stageHeight: 600, ballRadius: 10 });
  state.ball.x = 295; state.ball.y = 100; state.ball.vx = 0.2; state.ball.vy = 0.1;
  tickBall(state, 100); // bewegt sich 20px nach rechts -> x > 300 -> prallt ab
  assert.ok(state.ball.vx < 0, 'vx sollte negativ sein (prallt nach links)');
});

test('tickBall: Ball prallt oben ab (vy kehrt um)', () => {
  const state = createBounceSurvivalState({ stageWidth: 300, stageHeight: 600, ballRadius: 10 });
  state.ball.x = 150; state.ball.y = 5; state.ball.vx = 0; state.ball.vy = -0.2;
  tickBall(state, 100); // bewegt sich 20px nach oben -> y < 0 -> prallt ab
  assert.ok(state.ball.vy > 0, 'vy sollte positiv sein (prallt nach unten)');
});

test('tickBall: Wand-Kollision gibt bounce Event zurueck', () => {
  const state = createBounceSurvivalState({ stageWidth: 300, stageHeight: 600, ballRadius: 10 });
  state.ball.x = 5; state.ball.y = 100; state.ball.vx = -0.2; state.ball.vy = 0.1;
  const events = tickBall(state, 100);
  assert.ok(events.some(e => e.type === 'wall'), 'sollte wall Event haben');
});

/* ---------- tickBall: Paddle-Kollision ---------- */

test('tickBall: Ball prallt am Paddle ab (vy kehrt um, bounces +1)', () => {
  const state = createBounceSurvivalState({ stageWidth: 300, stageHeight: 600, ballRadius: 10, paddleWidth: 80 });
  movePaddle(state, 150);
  state.ball.x = 150; state.ball.y = 546; state.ball.vx = 0; state.ball.vy = 0.2;
  // Paddle bei y=560, height=14, Ball bei y=546, radius=10
  // dt=100 -> Ball bewegt sich 20px -> y=566, prallt am Paddle ab
  const events = tickBall(state, 100);
  assert.ok(state.ball.vy < 0, 'vy sollte negativ sein (prallt nach oben)');
  assert.equal(state.bounces, 1, 'bounces sollte 1 sein');
  assert.ok(events.some(e => e.type === 'paddle'), 'sollte paddle Event haben');
});

test('tickBall: Ball trifft Paddle am linken Rand -> vx wird negativ', () => {
  const state = createBounceSurvivalState({ stageWidth: 300, stageHeight: 600, ballRadius: 10, paddleWidth: 80 });
  movePaddle(state, 150);
  state.ball.x = 120; state.ball.y = 546; state.ball.vx = 0; state.ball.vy = 0.2;
  // Trefferpunkt links der Mitte -> vx wird negativ (nach links)
  tickBall(state, 100);
  assert.ok(state.ball.vx < 0, 'vx sollte negativ sein (linker Treffer -> nach links)');
});

test('tickBall: Ball trifft Paddle am rechten Rand -> vx wird positiv', () => {
  const state = createBounceSurvivalState({ stageWidth: 300, stageHeight: 600, ballRadius: 10, paddleWidth: 80 });
  movePaddle(state, 150);
  state.ball.x = 180; state.ball.y = 546; state.ball.vx = 0; state.ball.vy = 0.2;
  // Trefferpunkt rechts der Mitte -> vx wird positiv (nach rechts)
  tickBall(state, 100);
  assert.ok(state.ball.vx > 0, 'vx sollte positiv sein (rechter Treffer -> nach rechts)');
});

test('tickBall: Ball trifft Paddle in der Mitte -> vx bleibt 0', () => {
  const state = createBounceSurvivalState({ stageWidth: 300, stageHeight: 600, ballRadius: 10, paddleWidth: 80 });
  movePaddle(state, 150);
  state.ball.x = 150; state.ball.y = 546; state.ball.vx = 0; state.ball.vy = 0.2;
  tickBall(state, 100);
  assert.ok(Math.abs(state.ball.vx) < 0.01, 'vx sollte ~0 bleiben (Mitteltreffer)');
});

/* ---------- tickBall: Miss / Game Over ---------- */

test('tickBall: Ball faellt unter Paddle -> miss +1', () => {
  const state = createBounceSurvivalState({ maxMisses: 3, stageWidth: 300, stageHeight: 600, ballRadius: 10, paddleWidth: 80 });
  movePaddle(state, 50); // Paddle ganz links
  state.ball.x = 250; state.ball.y = 590; state.ball.vx = 0; state.ball.vy = 0.2;
  // Ball faellt rechts am Paddle vorbei
  tickBall(state, 100);
  assert.equal(state.misses, 1, 'miss sollte 1 sein');
});

test('tickBall: miss gibt miss Event zurueck', () => {
  const state = createBounceSurvivalState({ maxMisses: 3, stageWidth: 300, stageHeight: 600, ballRadius: 10, paddleWidth: 80 });
  movePaddle(state, 50);
  state.ball.x = 250; state.ball.y = 590; state.ball.vx = 0; state.ball.vy = 0.2;
  const events = tickBall(state, 100);
  assert.ok(events.some(e => e.type === 'miss'), 'sollte miss Event haben');
});

test('tickBall: Ball nach miss wird resettet (neue Position, vy positiv)', () => {
  const state = createBounceSurvivalState({ maxMisses: 3, stageWidth: 300, stageHeight: 600, ballRadius: 10, paddleWidth: 80 });
  movePaddle(state, 50);
  state.ball.x = 250; state.ball.y = 590; state.ball.vx = 0; state.ball.vy = 0.2;
  tickBall(state, 100);
  assert.ok(state.ball.y < 590, 'Ball sollte resettet sein (hoeher)');
  assert.ok(state.ball.vy > 0, 'Ball sollte nach unten fliegen');
});

test('tickBall: maxMisses erreicht -> Game Over', () => {
  const state = createBounceSurvivalState({ maxMisses: 2, stageWidth: 300, stageHeight: 600, ballRadius: 10, paddleWidth: 80 });
  movePaddle(state, 50); // Paddle ganz links
  for (let i = 0; i < 2; i++) {
    state.ball.x = 250; state.ball.y = 590; state.ball.vx = 0; state.ball.vy = 0.2;
    tickBall(state, 100);
  }
  assert.equal(state.misses, 2);
  assert.equal(state.gameOver, true, 'Game Over nach 2 misses');
});

test('tickBall: game over -> keine weiteren Updates', () => {
  const state = createBounceSurvivalState({ maxMisses: 1, stageWidth: 300, stageHeight: 600, ballRadius: 10 });
  state.gameOver = true;
  state.ball.x = 100; state.ball.y = 100; state.ball.vx = 0.1; state.ball.vy = 0.1;
  const xBefore = state.ball.x;
  const yBefore = state.ball.y;
  const events = tickBall(state, 1000);
  assert.equal(state.ball.x, xBefore, 'Bei game over sollte nichts bewegt werden');
  assert.equal(state.ball.y, yBefore);
  assert.equal(events.length, 0);
});

/* ---------- increaseSpeed ---------- */

test('increaseSpeed: erhoeht Ballgeschwindigkeit um Faktor', () => {
  const state = createBounceSurvivalState({ stageWidth: 300, stageHeight: 600, ballSpeed: 0.2 });
  state.ball.vx = 0.1; state.ball.vy = 0.2;
  increaseSpeed(state, 1.1);
  assert.ok(state.ball.vx > 0.1, 'vx sollte groesser sein');
  assert.ok(state.ball.vy > 0.2, 'vy sollte groesser sein');
});

test('increaseSpeed: behaelt Richtung bei (vx Vorzeichen)', () => {
  const state = createBounceSurvivalState({ stageWidth: 300, stageHeight: 600 });
  state.ball.vx = -0.1; state.ball.vy = 0.2;
  increaseSpeed(state, 1.5);
  assert.ok(state.ball.vx < 0, 'vx sollte negativ bleiben');
  assert.ok(Math.abs(state.ball.vx) > 0.1, 'Betrag sollte groesser sein');
});

/* ---------- computeSurvivalScore ---------- */

test('computeSurvivalScore: 0 ms -> 0 Punkte', () => {
  assert.equal(computeSurvivalScore(0), 0);
});

test('computeSurvivalScore: positive Zeit -> positive Punkte', () => {
  assert.ok(computeSurvivalScore(1000) > 0, '1000ms sollte Punkte geben');
});

test('computeSurvivalScore: laengere Zeit -> mehr Punkte', () => {
  assert.ok(computeSurvivalScore(10000) > computeSurvivalScore(5000), '10s sollten mehr Punkte als 5s geben');
});

/* ---------- computeBounceBonus ---------- */

test('computeBounceBonus: 0 Bounces -> 0 Bonus', () => {
  assert.equal(computeBounceBonus(0), 0);
});

test('computeBounceBonus: positive Bounces -> positive Bonus', () => {
  assert.ok(computeBounceBonus(5) > 0, '5 Bounces sollten Bonus geben');
});

test('computeBounceBonus: mehr Bounces -> mehr Bonus', () => {
  assert.ok(computeBounceBonus(10) > computeBounceBonus(5), '10 Bounces sollten mehr Bonus als 5 geben');
});