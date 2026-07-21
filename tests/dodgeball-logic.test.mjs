/**
 * Dodgeball — Logik-Tests (TDD RED phase)
 *
 * Testet die reine Spiellogik ohne Browser-Abhaengigkeiten.
 * Node 22 built-in test runner: node --test tests/*.test.mjs
 *
 * Konzept:
 *  - Spieler-Figur am unteren Bildschirmrand (x, y, radius)
 *  - Baelle fliegen von den Raendern herein (vx, vy, radius)
 *  - Spieler bewegt sich nach links/rechts (und hoch/runter)
 *  - Ball trifft Spieler (Distanz < Summe Radien) -> hit +1, Ball entfernt
 *  - Ball verlaesst Bildschirm -> Ball entfernt (kein hit)
 *  - maxHits erreicht -> Game Over
 *  - Score steigt mit ueberlebter Zeit + Close-Call-Bonus
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createDodgeballState,
  spawnBall,
  movePlayer,
  movePlayerBy,
  tickBalls,
  computeSurvivalScore,
  computeCloseCallBonus,
  isGameOver,
  getHits,
  getScore,
  getActiveBalls,
  getPlayer,
} from '../js/dodgeball-logic.js';

/* ---------- createDodgeballState ---------- */

test('createDodgeballState: Startzustand leer, Score 0, gameOver false', () => {
  const state = createDodgeballState({ maxHits: 3 });
  assert.equal(state.score, 0);
  assert.equal(state.gameOver, false);
  assert.equal(state.balls.length, 0);
  assert.equal(state.hits, 0);
  assert.equal(state.maxHits, 3);
});

test('createDodgeballState: Default maxHits ist 3', () => {
  const state = createDodgeballState({});
  assert.equal(state.maxHits, 3);
});

test('createDodgeballState: hat Spieler mit x, y, radius', () => {
  const state = createDodgeballState({ stageWidth: 300, stageHeight: 600, playerRadius: 20 });
  assert.ok(state.player, 'player sollte existieren');
  assert.ok(typeof state.player.x === 'number', 'player.x sollte number sein');
  assert.ok(typeof state.player.y === 'number', 'player.y sollte number sein');
  assert.equal(state.player.radius, 20);
  assert.equal(state.stageWidth, 300);
  assert.equal(state.stageHeight, 600);
});

test('createDodgeballState: Spieler startet zentriert unten', () => {
  const state = createDodgeballState({ stageWidth: 300, stageHeight: 600 });
  assert.ok(Math.abs(state.player.x - 150) < 1, 'x sollte ~150 sein (Mitte)');
  assert.ok(state.player.y > 400, 'y sollte im unteren Bereich sein');
});

/* ---------- spawnBall ---------- */

test('spawnBall: erzeugt einen Ball mit ID, Position und Geschwindigkeit', () => {
  const state = createDodgeballState({ maxHits: 3, stageWidth: 300, stageHeight: 600 });
  const ball = spawnBall(state, 'top', 0.2);
  assert.ok(ball.id > 0, 'Ball sollte id > 0 haben');
  assert.ok(typeof ball.x === 'number');
  assert.ok(typeof ball.y === 'number');
  assert.ok(typeof ball.vx === 'number');
  assert.ok(typeof ball.vy === 'number');
  assert.ok(ball.radius > 0);
  assert.equal(state.balls.length, 1);
});

test('spawnBall: verschiedene Baelle haben verschiedene IDs', () => {
  const state = createDodgeballState({ maxHits: 3, stageWidth: 300, stageHeight: 600 });
  const b1 = spawnBall(state, 'top', 0.2);
  const b2 = spawnBall(state, 'bottom', 0.2);
  assert.notEqual(b1.id, b2.id);
});

test('spawnBall: Ball von oben hat y=0 und vy>0 (bewegt sich nach unten)', () => {
  const state = createDodgeballState({ stageWidth: 300, stageHeight: 600 });
  const ball = spawnBall(state, 'top', 0.3);
  assert.ok(ball.y <= ball.radius, 'y sollte am oberen Rand sein');
  assert.ok(ball.vy > 0, 'vy sollte positiv sein (nach unten)');
});

test('spawnBall: Ball von unten hat y=stageHeight und vy<0 (bewegt sich nach oben)', () => {
  const state = createDodgeballState({ stageWidth: 300, stageHeight: 600 });
  const ball = spawnBall(state, 'bottom', 0.3);
  assert.ok(ball.y >= state.stageHeight - ball.radius, 'y sollte am unteren Rand sein');
  assert.ok(ball.vy < 0, 'vy sollte negativ sein (nach oben)');
});

test('spawnBall: Ball von links hat x=0 und vx>0', () => {
  const state = createDodgeballState({ stageWidth: 300, stageHeight: 600 });
  const ball = spawnBall(state, 'left', 0.3);
  assert.ok(ball.x <= ball.radius, 'x sollte am linken Rand sein');
  assert.ok(ball.vx > 0, 'vx sollte positiv sein (nach rechts)');
});

test('spawnBall: Ball von rechts hat x=stageWidth und vx<0', () => {
  const state = createDodgeballState({ stageWidth: 300, stageHeight: 600 });
  const ball = spawnBall(state, 'right', 0.3);
  assert.ok(ball.x >= state.stageWidth - ball.radius, 'x sollte am rechten Rand sein');
  assert.ok(ball.vx < 0, 'vx sollte negativ sein (nach links)');
});

/* ---------- movePlayer ---------- */

test('movePlayer: setzt x und y des Spielers', () => {
  const state = createDodgeballState({ stageWidth: 300, stageHeight: 600 });
  movePlayer(state, 100, 400);
  assert.equal(state.player.x, 100);
  assert.equal(state.player.y, 400);
});

test('movePlayer: klemmt x an Buehnenbreite', () => {
  const state = createDodgeballState({ stageWidth: 300, stageHeight: 600, playerRadius: 20 });
  movePlayer(state, -50, 300);
  assert.ok(state.player.x >= state.player.radius, 'x sollte >= radius sein');
  movePlayer(state, 999, 300);
  assert.ok(state.player.x <= state.stageWidth - state.player.radius, 'x sollte <= stageWidth - radius sein');
});

test('movePlayer: klemmt y an Buehnenhoehe', () => {
  const state = createDodgeballState({ stageWidth: 300, stageHeight: 600, playerRadius: 20 });
  movePlayer(state, 150, -50);
  assert.ok(state.player.y >= state.player.radius, 'y sollte >= radius sein');
  movePlayer(state, 150, 999);
  assert.ok(state.player.y <= state.stageHeight - state.player.radius, 'y sollte <= stageHeight - radius sein');
});

/* ---------- movePlayerBy ---------- */

test('movePlayerBy: bewegt Spieler um Delta', () => {
  const state = createDodgeballState({ stageWidth: 300, stageHeight: 600 });
  const startX = state.player.x;
  movePlayerBy(state, 30, 0);
  assert.equal(state.player.x, startX + 30);
});

test('movePlayerBy: klemmt an Buehnenraender', () => {
  const state = createDodgeballState({ stageWidth: 300, stageHeight: 600, playerRadius: 20 });
  movePlayer(state, 10, 300);
  movePlayerBy(state, -100, 0);
  assert.ok(state.player.x >= state.player.radius);
});

/* ---------- tickBalls: Bewegung ---------- */

test('tickBalls: Ball bewegt sich entsprechend vx*vy*dt', () => {
  const state = createDodgeballState({ stageWidth: 300, stageHeight: 600 });
  const ball = spawnBall(state, 'left', 0);
  ball.x = 100; ball.y = 100; ball.vx = 0.1; ball.vy = 0;
  tickBalls(state, 1000);
  assert.ok(ball.x > 100, 'x sollte sich vergroessert haben');
  assert.equal(Math.round(ball.x), 200);
});

/* ---------- tickBalls: Kollision ---------- */

test('tickBalls: Ball trifft Spieler -> hit +1, Ball entfernt', () => {
  const state = createDodgeballState({ maxHits: 3, stageWidth: 300, stageHeight: 600, playerRadius: 20 });
  movePlayer(state, 150, 300);
  const ball = spawnBall(state, 'left', 0);
  ball.x = 100; ball.y = 300; ball.vx = 0.5; ball.vy = 0; ball.radius = 15;
  // dt=100 -> ball bewegt sich um 50 px -> x=150, genau auf Spieler
  const events = tickBalls(state, 100);
  assert.equal(state.hits, 1, 'hit sollte 1 sein');
  assert.equal(state.balls.length, 0, 'Ball sollte entfernt sein');
  assert.ok(events.some(e => e.type === 'hit'), 'sollte hit Event haben');
});

test('tickBalls: Ball verfehlt Spieler -> kein hit, Ball bleibt', () => {
  const state = createDodgeballState({ maxHits: 3, stageWidth: 300, stageHeight: 600, playerRadius: 20 });
  movePlayer(state, 150, 300);
  const ball = spawnBall(state, 'left', 0);
  ball.x = 0; ball.y = 100; ball.vx = 0.5; ball.vy = 0; ball.radius = 15;
  // Ball bewegt sich auf y=100, Spieler ist auf y=300 -> kein Treffer
  tickBalls(state, 100);
  assert.equal(state.hits, 0, 'kein hit bei Vorbeiflug');
  assert.equal(state.balls.length, 1, 'Ball sollte noch da sein');
});

test('tickBalls: Ball verlaesst Bildschirm -> Ball entfernt, kein hit', () => {
  const state = createDodgeballState({ maxHits: 3, stageWidth: 300, stageHeight: 600, playerRadius: 20 });
  movePlayer(state, 150, 500); // Spieler weit weg
  const ball = spawnBall(state, 'left', 0);
  ball.x = 0; ball.y = 100; ball.vx = 1.0; ball.vy = 0; ball.radius = 15;
  // Ball bewegt sich mit 1.0 px/ms, dt=1000 -> 1000px, verlaesst Bildschirm (width=300)
  const events = tickBalls(state, 1000);
  assert.equal(state.hits, 0, 'kein hit');
  assert.equal(state.balls.length, 0, 'Ball sollte entfernt sein');
  assert.ok(events.some(e => e.type === 'escaped'), 'sollte escaped Event haben');
});

/* ---------- tickBalls: Game Over ---------- */

test('tickBalls: maxHits erreicht -> Game Over', () => {
  const state = createDodgeballState({ maxHits: 2, stageWidth: 300, stageHeight: 600, playerRadius: 20 });
  movePlayer(state, 150, 300);
  for (let i = 0; i < 2; i++) {
    const ball = spawnBall(state, 'left', 0);
    ball.x = 100; ball.y = 300; ball.vx = 0.5; ball.vy = 0; ball.radius = 15;
    tickBalls(state, 100);
  }
  assert.equal(state.hits, 2);
  assert.equal(state.gameOver, true);
});

test('tickBalls: game over -> keine weiteren Updates', () => {
  const state = createDodgeballState({ maxHits: 1, stageWidth: 300, stageHeight: 600, playerRadius: 20 });
  state.gameOver = true;
  const ball = spawnBall(state, 'left', 0);
  ball.x = 100; ball.y = 100; ball.vx = 0.5; ball.vy = 0; ball.radius = 15;
  const xBefore = ball.x;
  const events = tickBalls(state, 1000);
  assert.equal(ball.x, xBefore, 'Bei game over sollte nichts bewegt werden');
  assert.equal(events.length, 0);
});

/* ---------- tickBalls: Events ---------- */

test('tickBalls: gibt Events zurueck (hit/escaped)', () => {
  const state = createDodgeballState({ maxHits: 5, stageWidth: 300, stageHeight: 600, playerRadius: 20 });
  movePlayer(state, 150, 300);
  const ball = spawnBall(state, 'left', 0);
  ball.x = 100; ball.y = 300; ball.vx = 0.5; ball.vy = 0; ball.radius = 15;
  const events = tickBalls(state, 100);
  assert.ok(Array.isArray(events), 'sollte Array von Events sein');
  assert.ok(events.some(e => e.type === 'hit'), 'sollte hit Event haben');
});

/* ---------- tickBalls: mehrere Baelle gleichzeitig ---------- */

test('tickBalls: mehrere Baelle gleichzeitig bewegen', () => {
  const state = createDodgeballState({ maxHits: 5, stageWidth: 400, stageHeight: 600, playerRadius: 20 });
  movePlayer(state, 200, 500);
  const b1 = spawnBall(state, 'left', 0);
  b1.x = 0; b1.y = 100; b1.vx = 0.1; b1.vy = 0; b1.radius = 15;
  const b2 = spawnBall(state, 'top', 0);
  b2.x = 200; b2.y = 0; b2.vx = 0; b2.vy = 0.1; b2.radius = 15;
  tickBalls(state, 1000);
  assert.ok(b1.x > 0, 'b1 sollte sich bewegt haben');
  assert.ok(b2.y > 0, 'b2 sollte sich bewegt haben');
  assert.equal(state.balls.length, 2);
});

test('tickBalls: zwei Treffer in einem Tick', () => {
  const state = createDodgeballState({ maxHits: 5, stageWidth: 300, stageHeight: 600, playerRadius: 20 });
  movePlayer(state, 150, 300);
  const b1 = spawnBall(state, 'left', 0);
  b1.x = 100; b1.y = 300; b1.vx = 0.5; b1.vy = 0; b1.radius = 15;
  const b2 = spawnBall(state, 'right', 0);
  b2.x = 200; b2.y = 300; b2.vx = -0.5; b2.vy = 0; b2.radius = 15;
  tickBalls(state, 100);
  assert.equal(state.hits, 2, 'zwei Treffer in einem Tick');
  assert.equal(state.balls.length, 0);
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

/* ---------- computeCloseCallBonus ---------- */

test('computeCloseCallBonus: Distanz > Threshold -> 0 Bonus', () => {
  // Threshold ist Summe der Radien + 15 px Toleranz
  assert.equal(computeCloseCallBonus(100, 20, 15, 50), 0);
});

test('computeCloseCallBonus: Distanz innerhalb Toleranz -> positiver Bonus', () => {
  const dist = 20 + 15 + 5; // gerade innerhalb Toleranz
  assert.ok(computeCloseCallBonus(dist, 20, 15, 40) > 0, 'sollte Bonus geben');
});

test('computeCloseCallBonus: Distanz = exakt Kollision -> hoechster Bonus', () => {
  const closeBonus = computeCloseCallBonus(35, 20, 15, 40); // genau Beruehrung
  const farBonus = computeCloseCallBonus(45, 20, 15, 40); // knapp vorbei
  assert.ok(closeBonus >= farBonus, 'naher Vorbeiflug sollte mindestens so viel Bonus geben');
});

/* ---------- Getter ---------- */

test('isGameOver: false am Anfang, true nach maxHits', () => {
  const state = createDodgeballState({ maxHits: 1, stageWidth: 300, stageHeight: 600, playerRadius: 20 });
  assert.equal(isGameOver(state), false);
  movePlayer(state, 150, 300);
  const ball = spawnBall(state, 'left', 0);
  ball.x = 100; ball.y = 300; ball.vx = 0.5; ball.vy = 0; ball.radius = 15;
  tickBalls(state, 100);
  assert.equal(isGameOver(state), true);
});

test('getHits: gibt Anzahl Treffer zurueck', () => {
  const state = createDodgeballState({ maxHits: 5 });
  assert.equal(getHits(state), 0);
});

test('getScore: gibt aktuellen Score zurueck', () => {
  const state = createDodgeballState({ maxHits: 5 });
  assert.equal(getScore(state), 0);
});

test('getActiveBalls: gibt aktive Baelle zurueck', () => {
  const state = createDodgeballState({ maxHits: 5, stageWidth: 300, stageHeight: 600 });
  spawnBall(state, 'top', 0.2);
  spawnBall(state, 'bottom', 0.2);
  assert.equal(getActiveBalls(state).length, 2);
});

test('getPlayer: gibt Spieler-Objekt zurueck', () => {
  const state = createDodgeballState({ stageWidth: 300, stageHeight: 600 });
  const p = getPlayer(state);
  assert.ok(p.x !== undefined);
  assert.ok(p.y !== undefined);
  assert.ok(p.radius !== undefined);
});

/* ---------- tickBalls: Close-Call Detection ---------- */

test('tickBalls: Ball knapp vorbei gibt close-call Event', () => {
  const state = createDodgeballState({ maxHits: 5, stageWidth: 300, stageHeight: 600, playerRadius: 20 });
  movePlayer(state, 150, 300);
  const ball = spawnBall(state, 'left', 0);
  // Ball fliegt knapp ueber Spieler hinweg (y etwas versetzt)
  ball.x = 100; ball.y = 260; ball.vx = 0.5; ball.vy = 0; ball.radius = 15;
  // Spieler bei (150, 300) radius 20, Ball bei (150, 260) radius 15
  // Distanz = 40, Summe Radien = 35 -> Close Call (innerhalb 35+15=50)
  const events = tickBalls(state, 100);
  assert.ok(events.some(e => e.type === 'closecall'), 'sollte closecall Event haben');
});

test('tickBalls: Ball weit vorbei gibt kein close-call Event', () => {
  const state = createDodgeballState({ maxHits: 5, stageWidth: 300, stageHeight: 600, playerRadius: 20 });
  movePlayer(state, 150, 500);
  const ball = spawnBall(state, 'left', 0);
  ball.x = 0; ball.y = 100; ball.vx = 0.5; ball.vy = 0; ball.radius = 15;
  const events = tickBalls(state, 100);
  assert.ok(!events.some(e => e.type === 'closecall'), 'sollte kein closecall haben');
});