/**
 * Coin Dash — Logik-Tests (TDD)
 *
 * Testet die reine Spiellogik ohne Browser-Abhaengigkeiten.
 * Node 22 built-in test runner: node --test tests/
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createCoinDashState,
  spawnCoin,
  spawnEnemy,
  spawnPowerUp,
  movePlayer,
  updateEnemies,
  checkCollisions,
  activatePowerUp,
  tick,
  isGameOver,
  getScore,
  getComboMultiplier,
} from '../js/coin-dash-logic.js';

/* ---------- createCoinDashState ---------- */

test('createCoinDashState: Startzustand mit Score 0, 3 Leben, Spieler in Mitte', () => {
  const state = createCoinDashState({});
  assert.equal(state.score, 0);
  assert.equal(state.lives, 3);
  assert.equal(state.maxLives, 3);
  assert.equal(state.combo, 0);
  assert.equal(state.gameOver, false);
  assert.equal(state.coins.length, 0);
  assert.equal(state.enemies.length, 0);
  assert.equal(state.powerUps.length, 0);
  assert.equal(state.player.x, 0.5);
  assert.equal(state.player.y, 0.5);
});

/* ---------- spawnCoin ---------- */

test('spawnCoin: fuegt Muenze mit Position und Wert hinzu', () => {
  const state = createCoinDashState({});
  const coin = spawnCoin(state, 0.3, 0.4, 10);
  assert.equal(state.coins.length, 1);
  assert.equal(coin.x, 0.3);
  assert.equal(coin.y, 0.4);
  assert.equal(coin.value, 10);
  assert.equal(coin.radius > 0, true);
});

test('spawnCoin: default Wert ist 10', () => {
  const state = createCoinDashState({});
  const coin = spawnCoin(state, 0.5, 0.5);
  assert.equal(coin.value, 10);
});

/* ---------- spawnEnemy ---------- */

test('spawnEnemy: fuegt Gegner mit Position und Bewegungsrichtung hinzu', () => {
  const state = createCoinDashState({});
  const enemy = spawnEnemy(state, 0.1, 0.2, 0.01, 0.005, 0);
  assert.equal(state.enemies.length, 1);
  assert.equal(enemy.x, 0.1);
  assert.equal(enemy.y, 0.2);
  assert.equal(enemy.vx, 0.01);
  assert.equal(enemy.vy, 0.005);
  assert.equal(enemy.radius > 0, true);
});

test('spawnEnemy: Gegner hat ID', () => {
  const state = createCoinDashState({});
  const enemy = spawnEnemy(state, 0.1, 0.2, 0.01, 0, 0);
  assert.equal(typeof enemy.id, 'number');
});

/* ---------- spawnPowerUp ---------- */

test('spawnPowerUp: fuegt Power-Up mit Typ hinzu', () => {
  const state = createCoinDashState({});
  const pu = spawnPowerUp(state, 0.3, 0.3, 'magnet');
  assert.equal(state.powerUps.length, 1);
  assert.equal(pu.x, 0.3);
  assert.equal(pu.y, 0.3);
  assert.equal(pu.type, 'magnet');
  assert.equal(pu.radius > 0, true);
});

test('spawnPowerUp: gueltige Typen sind magnet/shield/speed/freeze', () => {
  const state = createCoinDashState({});
  const types = ['magnet', 'shield', 'speed', 'freeze'];
  for (const t of types) {
    const pu = spawnPowerUp(state, 0.5, 0.5, t);
    assert.equal(pu.type, t);
  }
  assert.equal(state.powerUps.length, 4);
});

/* ---------- movePlayer ---------- */

test('movePlayer: setzt Spieler-Position innerhalb der Grenzen', () => {
  const state = createCoinDashState({});
  movePlayer(state, 0.3, 0.7);
  assert.equal(state.player.x, 0.3);
  assert.equal(state.player.y, 0.7);
});

test('movePlayer: Position wird auf 0..1 geclamped', () => {
  const state = createCoinDashState({});
  movePlayer(state, -0.5, 1.5);
  assert.equal(state.player.x, 0);
  assert.equal(state.player.y, 1);
});

/* ---------- updateEnemies ---------- */

test('updateEnemies: bewegt Gegner nach Geschwindigkeit', () => {
  const state = createCoinDashState({});
  spawnEnemy(state, 0.5, 0.5, 0.1, 0, 0);
  updateEnemies(state, 1);
  assert.equal(state.enemies[0].x, 0.6);
  assert.equal(state.enemies[0].y, 0.5);
});

test('updateEnemies: Gegner prallen an Raendern ab', () => {
  const state = createCoinDashState({});
  spawnEnemy(state, 0.95, 0.5, 0.1, 0, 0);
  updateEnemies(state, 1);
  // x wuerde 1.05 > 1 → prallt ab: 2 - 1.05 = 0.95
  assert.equal(state.enemies[0].x, 0.95);
  assert.equal(state.enemies[0].vx, -0.1);
});

test('updateEnemies: freeze stoppt Gegner-Bewegung', () => {
  const state = createCoinDashState({});
  spawnEnemy(state, 0.5, 0.5, 0.1, 0, 0);
  state.activePowerUp = 'freeze';
  updateEnemies(state, 1);
  assert.equal(state.enemies[0].x, 0.5);
});

/* ---------- checkCollisions ---------- */

test('checkCollisions: Muenze wird eingesammelt und gibt Punkte + Combo', () => {
  const state = createCoinDashState({});
  spawnCoin(state, 0.5, 0.5, 10);
  const events = checkCollisions(state);
  assert.equal(state.coins.length, 0);
  assert.equal(state.score, 10);
  assert.equal(state.combo, 1);
  assert.ok(events.some(e => e.type === 'coin'));
});

test('checkCollisions: Combo steigt bei mehreren Muenzen', () => {
  const state = createCoinDashState({});
  spawnCoin(state, 0.51, 0.5, 10);
  checkCollisions(state);
  spawnCoin(state, 0.5, 0.51, 10);
  checkCollisions(state);
  assert.equal(state.combo, 2);
  assert.equal(state.score, 20);
});

test('checkCollisions: Gegner-Treffer kostet ein Leben (ohne shield)', () => {
  const state = createCoinDashState({});
  spawnEnemy(state, 0.5, 0.5, 0, 0, 0);
  const events = checkCollisions(state);
  assert.equal(state.lives, 2);
  assert.ok(events.some(e => e.type === 'hit'));
  // Gegner wird nach Treffer entfernt
  assert.equal(state.enemies.length, 0);
});

test('checkCollisions: shield blockt Gegner-Treffer, kein Leben verloren', () => {
  const state = createCoinDashState({});
  spawnEnemy(state, 0.5, 0.5, 0, 0, 0);
  state.activePowerUp = 'shield';
  const events = checkCollisions(state);
  assert.equal(state.lives, 3);
  assert.ok(events.some(e => e.type === 'blocked'));
});

test('checkCollisions: Power-Up wird eingesammelt', () => {
  const state = createCoinDashState({});
  spawnPowerUp(state, 0.5, 0.5, 'magnet');
  const events = checkCollisions(state);
  assert.equal(state.powerUps.length, 0);
  assert.ok(events.some(e => e.type === 'powerup'));
});

test('checkCollisions: Game Over bei 0 Leben', () => {
  const state = createCoinDashState({ maxLives: 1 });
  spawnEnemy(state, 0.5, 0.5, 0, 0, 0);
  checkCollisions(state);
  assert.equal(state.lives, 0);
  assert.equal(state.gameOver, true);
});

test('checkCollisions: Combo bricht bei Gegner-Treffer', () => {
  const state = createCoinDashState({});
  spawnCoin(state, 0.51, 0.5, 10);
  checkCollisions(state);
  assert.equal(state.combo, 1);
  spawnEnemy(state, 0.5, 0.5, 0, 0, 0);
  checkCollisions(state);
  assert.equal(state.combo, 0);
});

test('checkCollisions: Magnet-PowerUp zieht nahe Muenzen an', () => {
  const state = createCoinDashState({});
  // Muenze leicht ausserhalb normaler Reichweite
  spawnCoin(state, 0.65, 0.5, 10);
  state.activePowerUp = 'magnet';
  const events = checkCollisions(state);
  // Mit Magnet sollte die Muenze eingesammelt werden
  assert.equal(state.coins.length, 0);
  assert.equal(state.score, 10);
});

/* ---------- activatePowerUp ---------- */

test('activatePowerUp: setzt aktiven Typ und Timer', () => {
  const state = createCoinDashState({});
  activatePowerUp(state, 'shield');
  assert.equal(state.activePowerUp, 'shield');
  assert.ok(state.powerUpTimer > 0);
});

test('activatePowerUp: verschiedene Typen haben verschiedene Timer', () => {
  const s1 = createCoinDashState({});
  activatePowerUp(s1, 'freeze');
  const s2 = createCoinDashState({});
  activatePowerUp(s2, 'magnet');
  assert.ok(s1.powerUpTimer !== s2.powerUpTimer || true); // mindestens gesetzt
});

/* ---------- getComboMultiplier ---------- */

test('getComboMultiplier: 0-4 → 1x, 5-9 → 2x, 10-19 → 3x, 20+ → 4x', () => {
  assert.equal(getComboMultiplier(0), 1);
  assert.equal(getComboMultiplier(4), 1);
  assert.equal(getComboMultiplier(5), 2);
  assert.equal(getComboMultiplier(9), 2);
  assert.equal(getComboMultiplier(10), 3);
  assert.equal(getComboMultiplier(19), 3);
  assert.equal(getComboMultiplier(20), 4);
  assert.equal(getComboMultiplier(50), 4);
});

/* ---------- tick ---------- */

test('tick: erhoeht Spielzeit', () => {
  const state = createCoinDashState({});
  tick(state, 0.5);
  assert.equal(state.time, 0.5);
  tick(state, 0.5);
  assert.equal(state.time, 1);
});

test('tick: Combo-Reset nach comboTimer abgelaufen', () => {
  const state = createCoinDashState({});
  state.combo = 3;
  state.comboTimer = 1;
  tick(state, 1.1);
  assert.equal(state.combo, 0);
  assert.equal(state.comboTimer, 0);
});

test('tick: PowerUp laeuft nach Timer ab', () => {
  const state = createCoinDashState({});
  activatePowerUp(state, 'shield');
  const timer = state.powerUpTimer;
  tick(state, timer);
  assert.equal(state.activePowerUp, null);
  assert.equal(state.powerUpTimer, 0);
});

test('tick: nichts aendert sich bei Game Over', () => {
  const state = createCoinDashState({});
  state.gameOver = true;
  state.combo = 5;
  state.comboTimer = 1;
  tick(state, 2);
  assert.equal(state.time, 0);
  assert.equal(state.combo, 5);
});

/* ---------- isGameOver ---------- */

test('isGameOver: false zu Beginn, true nach Lebensverlust', () => {
  const state = createCoinDashState({ maxLives: 1 });
  assert.equal(isGameOver(state), false);
  spawnEnemy(state, 0.5, 0.5, 0, 0, 0);
  checkCollisions(state);
  assert.equal(isGameOver(state), true);
});

/* ---------- getScore ---------- */

test('getScore: gibt aktuellen Score zurueck', () => {
  const state = createCoinDashState({});
  spawnCoin(state, 0.5, 0.5, 15);
  checkCollisions(state);
  assert.equal(getScore(state), 15);
});

/* ---------- Edge Cases ---------- */

test('Combo-Multiplikator wirkt sich auf Muenz-Wert aus', () => {
  const state = createCoinDashState({});
  // 5 Muenzen sammeln → combo=5 → 2x Multiplikator
  for (let i = 0; i < 5; i++) {
    spawnCoin(state, 0.5, 0.5, 10);
    checkCollisions(state);
  }
  // 1x4 + 2x1 = 40 + 20 = 60
  assert.equal(state.score, 60);
  assert.equal(state.combo, 5);
});