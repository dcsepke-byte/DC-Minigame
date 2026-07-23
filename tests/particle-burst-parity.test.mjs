/**
 * Paritaets-Test: particle-burst-logic.js (ESM) vs particle-burst-logic-browser.js (IIFE)
 *
 * Stellt sicher dass beide Implementierungen identische Ergebnisse liefern.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as ESM from '../js/particle-burst-logic.js';

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const browserCode = readFileSync(join(__dirname, '..', 'js', 'particle-burst-logic-browser.js'), 'utf-8');

const window = {};
const sandbox = { window, Math, console, Date };
const vm = await import('node:vm');
const ctx = vm.createContext(sandbox);
vm.runInContext(browserCode, ctx);
const IIFE = window.ParticleBurstLogic;

/* ---------- BURST_TYPES Paritaet ---------- */

test('Paritaet: BURST_TYPES gleiche Schluessel', () => {
  const esmKeys = Object.keys(ESM.BURST_TYPES).sort();
  const iifeKeys = Object.keys(IIFE.BURST_TYPES).sort();
  assert.deepEqual(esmKeys, iifeKeys);
});

for (const [name, t] of Object.entries(ESM.BURST_TYPES)) {
  test(`Paritaet: BURST_TYPES.${name} gleiche Werte`, () => {
    const iifeT = IIFE.BURST_TYPES[name];
    assert.equal(iifeT.count, t.count);
    assert.equal(iifeT.speed, t.speed);
    assert.equal(iifeT.life, t.life);
    assert.equal(iifeT.gravity, t.gravity);
    assert.equal(iifeT.color, t.color);
  });
}

/* ---------- createBurst Paritaet ---------- */

test('Paritaet: createBurst mit seed erzeugt identische Partikel', () => {
  const esmBurst = ESM.createBurst({ x: 1, y: 2, z: 3, count: 15, speed: 7, life: 1.5, gravity: 4, color: '#ff6b6b', seed: 42 });
  const iifeBurst = IIFE.createBurst({ x: 1, y: 2, z: 3, count: 15, speed: 7, life: 1.5, gravity: 4, color: '#ff6b6b', seed: 42 });
  assert.equal(esmBurst.length, iifeBurst.length);
  for (let i = 0; i < esmBurst.length; i++) {
    assert.equal(esmBurst[i].x, iifeBurst[i].x);
    assert.equal(esmBurst[i].y, iifeBurst[i].y);
    assert.equal(esmBurst[i].z, iifeBurst[i].z);
    assert.equal(esmBurst[i].vx, iifeBurst[i].vx);
    assert.equal(esmBurst[i].vy, iifeBurst[i].vy);
    assert.equal(esmBurst[i].vz, iifeBurst[i].vz);
    assert.equal(esmBurst[i].life, iifeBurst[i].life);
    assert.equal(esmBurst[i].maxLife, iifeBurst[i].maxLife);
    assert.equal(esmBurst[i].gravity, iifeBurst[i].gravity);
    assert.equal(esmBurst[i].color, iifeBurst[i].color);
  }
});

test('Paritaet: createBurst mit type=star', () => {
  const esmBurst = ESM.createBurst({ x: 0, y: 0, z: 0, type: 'star', seed: 100 });
  const iifeBurst = IIFE.createBurst({ x: 0, y: 0, z: 0, type: 'star', seed: 100 });
  assert.equal(esmBurst.length, iifeBurst.length);
  for (let i = 0; i < esmBurst.length; i++) {
    assert.equal(esmBurst[i].vx, iifeBurst[i].vx);
    assert.equal(esmBurst[i].vy, iifeBurst[i].vy);
    assert.equal(esmBurst[i].vz, iifeBurst[i].vz);
    assert.equal(esmBurst[i].color, iifeBurst[i].color);
    assert.equal(esmBurst[i].gravity, iifeBurst[i].gravity);
  }
});

test('Paritaet: createBurst count=0', () => {
  const esmBurst = ESM.createBurst({ x: 0, y: 0, z: 0, count: 0 });
  const iifeBurst = IIFE.createBurst({ x: 0, y: 0, z: 0, count: 0 });
  assert.equal(esmBurst.length, 0);
  assert.equal(iifeBurst.length, 0);
});

test('Paritaet: createBurst negative count', () => {
  const esmBurst = ESM.createBurst({ x: 0, y: 0, z: 0, count: -10 });
  const iifeBurst = IIFE.createBurst({ x: 0, y: 0, z: 0, count: -10 });
  assert.equal(esmBurst.length, 0);
  assert.equal(iifeBurst.length, 0);
});

/* ---------- particleAlive Paritaet ---------- */

for (const life of [1.0, 0.5, 0, -0.5]) {
  test(`Paritaet: particleAlive mit life=${life}`, () => {
    assert.equal(ESM.particleAlive({ life }), IIFE.particleAlive({ life }));
  });
}

/* ---------- aliveCount Paritaet ---------- */

test('Paritaet: aliveCount gemischtes Array', () => {
  const burst = [{ life: 1 }, { life: 0 }, { life: -0.5 }, { life: 2 }];
  assert.equal(ESM.aliveCount(burst), IIFE.aliveCount(burst));
});

test('Paritaet: aliveCount leeres Array', () => {
  assert.equal(ESM.aliveCount([]), IIFE.aliveCount([]));
});

/* ---------- updateBurst Paritaet ---------- */

test('Paritaet: updateBurst mit seed', () => {
  const esmBurst = ESM.createBurst({ x: 0, y: 0, z: 0, count: 20, speed: 5, life: 2.0, gravity: 3.0, seed: 7 });
  const iifeBurst = IIFE.createBurst({ x: 0, y: 0, z: 0, count: 20, speed: 5, life: 2.0, gravity: 3.0, seed: 7 });
  const esmAlive = ESM.updateBurst(esmBurst, 0.5);
  const iifeAlive = IIFE.updateBurst(iifeBurst, 0.5);
  assert.equal(esmAlive, iifeAlive);
  for (let i = 0; i < esmBurst.length; i++) {
    assert.equal(esmBurst[i].x, iifeBurst[i].x);
    assert.equal(esmBurst[i].y, iifeBurst[i].y);
    assert.equal(esmBurst[i].z, iifeBurst[i].z);
    assert.equal(esmBurst[i].vx, iifeBurst[i].vx);
    assert.equal(esmBurst[i].vy, iifeBurst[i].vy);
    assert.equal(esmBurst[i].vz, iifeBurst[i].vz);
    assert.equal(esmBurst[i].life, iifeBurst[i].life);
  }
});

test('Paritaet: updateBurst mit drag', () => {
  const esmBurst = ESM.createBurst({ x: 0, y: 0, z: 0, count: 10, speed: 5, gravity: 0, seed: 99 });
  const iifeBurst = IIFE.createBurst({ x: 0, y: 0, z: 0, count: 10, speed: 5, gravity: 0, seed: 99 });
  ESM.updateBurst(esmBurst, 1.0, { drag: 0.5 });
  IIFE.updateBurst(iifeBurst, 1.0, { drag: 0.5 });
  for (let i = 0; i < esmBurst.length; i++) {
    assert.equal(esmBurst[i].vx, iifeBurst[i].vx);
    assert.equal(esmBurst[i].vy, iifeBurst[i].vy);
    assert.equal(esmBurst[i].vz, iifeBurst[i].vz);
  }
});

test('Paritaet: updateBurst nach langer Zeit → alle tot', () => {
  const esmBurst = ESM.createBurst({ x: 0, y: 0, z: 0, count: 5, life: 1.0, seed: 3 });
  const iifeBurst = IIFE.createBurst({ x: 0, y: 0, z: 0, count: 5, life: 1.0, seed: 3 });
  const esmAlive = ESM.updateBurst(esmBurst, 10.0);
  const iifeAlive = IIFE.updateBurst(iifeBurst, 10.0);
  assert.equal(esmAlive, 0);
  assert.equal(iifeAlive, 0);
});

test('Paritaet: updateBurst leeres Array', () => {
  assert.equal(ESM.updateBurst([], 0.5), IIFE.updateBurst([], 0.5));
});