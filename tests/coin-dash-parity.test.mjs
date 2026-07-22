/**
 * Paritaets-Test: coin-dash-logic.js (ESM) vs coin-dash-logic-browser.js (IIFE)
 *
 * Stellt sicher dass beide Implementierungen identische Ergebnisse liefern.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as ESM from '../js/coin-dash-logic.js';

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const browserCode = readFileSync(join(__dirname, '..', 'js', 'coin-dash-logic-browser.js'), 'utf-8');

const window = {};
const sandbox = { window, Math, console };
const vm = await import('node:vm');
const ctx = vm.createContext(sandbox);
vm.runInContext(browserCode, ctx);
const IIFE = window.CoinDashLogic;

const cases = [
  ['getComboMultiplier', [0]],
  ['getComboMultiplier', [4]],
  ['getComboMultiplier', [5]],
  ['getComboMultiplier', [10]],
  ['getComboMultiplier', [20]],
  ['getComboMultiplier', [50]],
];

for (const [fn, args] of cases) {
  test(`Paritaet: ${fn}(${args.map(a => JSON.stringify(a)).join(', ')})`, () => {
    const esmResult = ESM[fn](...args);
    const iifeResult = IIFE[fn](...args);
    assert.equal(JSON.stringify(esmResult), JSON.stringify(iifeResult));
  });
}

// State-basierte Paritaetstests
test('Paritaet: createCoinDashState identisch', () => {
  const esmState = ESM.createCoinDashState({ maxLives: 3 });
  const iifeState = IIFE.createCoinDashState({ maxLives: 3 });
  assert.equal(JSON.stringify(esmState), JSON.stringify(iifeState));
});

test('Paritaet: spawnCoin + checkCollisions Sequenz', () => {
  const esmState = ESM.createCoinDashState({});
  const iifeState = IIFE.createCoinDashState({});

  const coins = [[0.5, 0.5, 10], [0.51, 0.5, 10], [0.5, 0.51, 10]];
  for (const [x, y, v] of coins) {
    ESM.spawnCoin(esmState, x, y, v);
    IIFE.spawnCoin(iifeState, x, y, v);
  }
  const esmEvents = ESM.checkCollisions(esmState);
  const iifeEvents = IIFE.checkCollisions(iifeState);
  assert.equal(JSON.stringify(esmEvents), JSON.stringify(iifeEvents));
  assert.equal(JSON.stringify(esmState), JSON.stringify(iifeState));
});

test('Paritaet: spawnEnemy + updateEnemies + checkCollisions Sequenz', () => {
  const esmState = ESM.createCoinDashState({ maxLives: 3 });
  const iifeState = IIFE.createCoinDashState({ maxLives: 3 });

  ESM.spawnEnemy(esmState, 0.3, 0.3, 0.1, 0.05, 0);
  IIFE.spawnEnemy(iifeState, 0.3, 0.3, 0.1, 0.05, 0);

  ESM.updateEnemies(esmState, 1);
  IIFE.updateEnemies(iifeState, 1);

  ESM.movePlayer(esmState, 0.4, 0.35);
  IIFE.movePlayer(iifeState, 0.4, 0.35);

  const esmEvents = ESM.checkCollisions(esmState);
  const iifeEvents = IIFE.checkCollisions(iifeState);
  assert.equal(JSON.stringify(esmEvents), JSON.stringify(iifeEvents));
  assert.equal(JSON.stringify(esmState), JSON.stringify(iifeState));
});

test('Paritaet: spawnPowerUp + activatePowerUp + tick Sequenz', () => {
  const esmState = ESM.createCoinDashState({});
  const iifeState = IIFE.createCoinDashState({});

  ESM.spawnPowerUp(esmState, 0.5, 0.5, 'magnet');
  IIFE.spawnPowerUp(iifeState, 0.5, 0.5, 'magnet');

  ESM.checkCollisions(esmState);
  IIFE.checkCollisions(iifeState);

  assert.equal(esmState.activePowerUp, iifeState.activePowerUp);
  assert.equal(esmState.powerUpTimer, iifeState.powerUpTimer);

  ESM.tick(esmState, 1);
  IIFE.tick(iifeState, 1);

  assert.equal(JSON.stringify(esmState), JSON.stringify(iifeState));
});