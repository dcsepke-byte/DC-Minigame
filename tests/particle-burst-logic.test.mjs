/**
 * Particle Burst — Logik-Tests (TDD RED phase)
 *
 * Testet die reine Partikel-Logik ohne Browser/Three.js.
 * Node 22 built-in test runner: node --test tests/
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createBurst,
  updateBurst,
  particleAlive,
  aliveCount,
  BURST_TYPES,
} from '../js/particle-burst-logic.js';

/* ---------- createBurst ---------- */

test('createBurst: erzeugt Array mit geforderter Anzahl Partikel', () => {
  const burst = createBurst({ x: 0, y: 1, z: 0, count: 20 });
  assert.equal(burst.length, 20);
});

test('createBurst: jeder Partikel hat Position, Geschwindigkeit und Leben', () => {
  const burst = createBurst({ x: 5, y: 2, z: 3, count: 1 });
  const p = burst[0];
  assert.ok(typeof p.x === 'number');
  assert.ok(typeof p.y === 'number');
  assert.ok(typeof p.z === 'number');
  assert.ok(typeof p.vx === 'number');
  assert.ok(typeof p.vy === 'number');
  assert.ok(typeof p.vz === 'number');
  assert.ok(typeof p.life === 'number');
  assert.ok(p.life > 0);
});

test('createBurst: Partikel starten an Ursprungsposition', () => {
  const burst = createBurst({ x: 10, y: 5, z: -3, count: 5 });
  for (const p of burst) {
    assert.equal(p.x, 10);
    assert.equal(p.y, 5);
    assert.equal(p.z, -3);
  }
});

test('createBurst: Farbe wird an Partikel weitergegeben', () => {
  const burst = createBurst({ x: 0, y: 0, z: 0, count: 3, color: '#ff6b6b' });
  for (const p of burst) {
    assert.equal(p.color, '#ff6b6b');
  }
});

test('createBurst: Standard-Farbe goldgelb wenn keine angegeben', () => {
  const burst = createBurst({ x: 0, y: 0, z: 0, count: 1 });
  assert.equal(burst[0].color, '#ffe66d');
});

test('createBurst: count=0 erzeugt leeres Array', () => {
  const burst = createBurst({ x: 0, y: 0, z: 0, count: 0 });
  assert.equal(burst.length, 0);
});

test('createBurst: negative count erzeugt leeres Array', () => {
  const burst = createBurst({ x: 0, y: 0, z: 0, count: -5 });
  assert.equal(burst.length, 0);
});

test('createBurst: Speed beeinflusst Geschwindigkeitsbetrag', () => {
  const slow = createBurst({ x: 0, y: 0, z: 0, count: 50, speed: 1 });
  const fast = createBurst({ x: 0, y: 0, z: 0, count: 50, speed: 10 });
  let slowMax = 0, fastMax = 0;
  for (const p of slow) slowMax = Math.max(slowMax, Math.hypot(p.vx, p.vy, p.vz));
  for (const p of fast) fastMax = Math.max(fastMax, Math.hypot(p.vx, p.vy, p.vz));
  assert.ok(fastMax > slowMax, `fast (${fastMax}) sollte groesser sein als slow (${slowMax})`);
});

test('createBurst: Leben im gueltigen Bereich', () => {
  const burst = createBurst({ x: 0, y: 0, z: 0, count: 10, life: 2.0 });
  for (const p of burst) {
    assert.ok(p.life > 0 && p.life <= 2.0, `life ${p.life} sollte in (0, 2.0] liegen`);
  }
});

test('createBurst: Standard-Leben wenn nicht angegeben', () => {
  const burst = createBurst({ x: 0, y: 0, z: 0, count: 1 });
  assert.ok(burst[0].life > 0 && burst[0].life <= 1.5);
});

/* ---------- BURST_TYPES ---------- */

test('BURST_TYPES: enthaelt coin, star, duel, dice, move', () => {
  assert.ok(BURST_TYPES.coin, 'coin fehlt');
  assert.ok(BURST_TYPES.star, 'star fehlt');
  assert.ok(BURST_TYPES.duel, 'duel fehlt');
  assert.ok(BURST_TYPES.dice, 'dice fehlt');
  assert.ok(BURST_TYPES.move, 'move fehlt');
});

test('BURST_TYPES: jeder Typ hat count, speed, life, gravity, color', () => {
  for (const [name, t] of Object.entries(BURST_TYPES)) {
    assert.ok(typeof t.count === 'number', `${name}: count fehlt`);
    assert.ok(typeof t.speed === 'number', `${name}: speed fehlt`);
    assert.ok(typeof t.life === 'number', `${name}: life fehlt`);
    assert.ok(typeof t.gravity === 'number', `${name}: gravity fehlt`);
    assert.ok(typeof t.color === 'string', `${name}: color fehlt`);
  }
});

test('BURST_TYPES: star hat mehr Partikel als move', () => {
  assert.ok(BURST_TYPES.star.count > BURST_TYPES.move.count,
    `star (${BURST_TYPES.star.count}) sollte mehr Partikel haben als move (${BURST_TYPES.move.count})`);
});

test('BURST_TYPES: duel hat rote Farbe', () => {
  assert.equal(BURST_TYPES.duel.color, '#ff6b6b');
});

test('BURST_TYPES: coin hat goldgelbe Farbe', () => {
  assert.equal(BURST_TYPES.coin.color, '#ffe66d');
});

test('createBurst mit type: nutzt Typ-Parameter', () => {
  const burst = createBurst({ x: 0, y: 0, z: 0, type: 'star' });
  assert.equal(burst.length, BURST_TYPES.star.count);
  for (const p of burst) {
    assert.equal(p.color, BURST_TYPES.star.color);
    assert.ok(p.gravity === BURST_TYPES.star.gravity);
  }
});

/* ---------- particleAlive ---------- */

test('particleAlive: true bei life > 0', () => {
  assert.equal(particleAlive({ life: 1.0 }), true);
});

test('particleAlive: false bei life <= 0', () => {
  assert.equal(particleAlive({ life: 0 }), false);
  assert.equal(particleAlive({ life: -0.5 }), false);
});

/* ---------- aliveCount ---------- */

test('aliveCount: zaehlt nur lebende Partikel', () => {
  const burst = [
    { life: 1.0 }, { life: 0.5 }, { life: 0 }, { life: -0.1 }, { life: 2.0 },
  ];
  assert.equal(aliveCount(burst), 3);
});

test('aliveCount: leeres Array → 0', () => {
  assert.equal(aliveCount([]), 0);
});

/* ---------- updateBurst ---------- */

test('updateBurst: reduziert Leben aller Partikel', () => {
  const burst = createBurst({ x: 0, y: 0, z: 0, count: 5, life: 2.0 });
  const before = burst.map(p => p.life);
  updateBurst(burst, 0.5);
  for (let i = 0; i < burst.length; i++) {
    assert.ok(burst[i].life < before[i], `Partikel ${i}: life sollte sinken`);
  }
});

test('updateBurst: tote Partikel werden life=0 (nicht entfernt)', () => {
  const burst = createBurst({ x: 0, y: 0, z: 0, count: 3, life: 0.5 });
  updateBurst(burst, 1.0);
  for (const p of burst) {
    assert.ok(p.life <= 0, `life sollte <= 0 sein, ist ${p.life}`);
  }
  assert.equal(burst.length, 3); // Array-Laenge bleibt, nur life=0
});

test('updateBurst: Gravitation zieht vy nach unten', () => {
  const burst = createBurst({ x: 0, y: 0, z: 0, count: 10, speed: 0, gravity: 9.8 });
  const vyBefore = burst.map(p => p.vy);
  updateBurst(burst, 1.0);
  for (let i = 0; i < burst.length; i++) {
    assert.ok(burst[i].vy < vyBefore[i],
      `vy sollte sinken: ${burst[i].vy} < ${vyBefore[i]}`);
  }
});

test('updateBurst: Position aktualisiert sich um Geschwindigkeit * delta', () => {
  const burst = createBurst({ x: 0, y: 0, z: 0, count: 1, speed: 0, gravity: 0 });
  burst[0].vx = 10;
  burst[0].vy = 5;
  burst[0].vz = -3;
  updateBurst(burst, 0.1);
  assert.ok(Math.abs(burst[0].x - 1.0) < 0.01, `x sollte ~1.0 sein, ist ${burst[0].x}`);
  assert.ok(Math.abs(burst[0].y - 0.5) < 0.01, `y sollte ~0.5 sein, ist ${burst[0].y}`);
  assert.ok(Math.abs(burst[0].z - (-0.3)) < 0.01, `z sollte ~-0.3 sein, ist ${burst[0].z}`);
});

test('updateBurst: Drag reduziert Geschwindigkeit', () => {
  const burst = createBurst({ x: 0, y: 0, z: 0, count: 1, speed: 5, gravity: 0 });
  const speedBefore = Math.hypot(burst[0].vx, burst[0].vy, burst[0].vz);
  updateBurst(burst, 1.0, { drag: 0.5 });
  const speedAfter = Math.hypot(burst[0].vx, burst[0].vy, burst[0].vz);
  assert.ok(speedAfter < speedBefore, `Drag sollte Geschwindigkeit reduzieren: ${speedAfter} < ${speedBefore}`);
});

test('updateBurst: gibt Anzahl lebender Partikel zurueck', () => {
  const burst = createBurst({ x: 0, y: 0, z: 0, count: 10, life: 1.0 });
  const alive = updateBurst(burst, 0.5);
  assert.equal(alive, 10);
});

test('updateBurst: nach langer Zeit sind alle tot', () => {
  const burst = createBurst({ x: 0, y: 0, z: 0, count: 5, life: 1.0 });
  const alive = updateBurst(burst, 10.0);
  assert.equal(alive, 0);
});

test('updateBurst: leeres Array → 0', () => {
  assert.equal(updateBurst([], 0.5), 0);
});

/* ---------- Edge Cases ---------- */

test('createBurst: deterministisch mit seed', () => {
  const a = createBurst({ x: 0, y: 0, z: 0, count: 10, seed: 42 });
  const b = createBurst({ x: 0, y: 0, z: 0, count: 10, seed: 42 });
  for (let i = 0; i < a.length; i++) {
    assert.equal(a[i].vx, b[i].vx);
    assert.equal(a[i].vy, b[i].vy);
    assert.equal(a[i].vz, b[i].vz);
    assert.equal(a[i].life, b[i].life);
  }
});

test('createBurst: verschiedene seeds ergeben verschiedene Partikel', () => {
  const a = createBurst({ x: 0, y: 0, z: 0, count: 20, seed: 1 });
  const b = createBurst({ x: 0, y: 0, z: 0, count: 20, seed: 2 });
  let diff = false;
  for (let i = 0; i < a.length; i++) {
    if (a[i].vx !== b[i].vx || a[i].vy !== b[i].vy) { diff = true; break; }
  }
  assert.ok(diff, 'Verschiedene seeds sollten verschiedene Geschwindigkeiten ergeben');
});

test('updateBurst: life wird nicht negativ bei sehr grossem delta', () => {
  const burst = createBurst({ x: 0, y: 0, z: 0, count: 3, life: 1.0 });
  updateBurst(burst, 100.0);
  for (const p of burst) {
    assert.ok(p.life <= 0, `life sollte <= 0 sein: ${p.life}`);
    assert.ok(p.life >= -100, `life sollte nicht extrem negativ sein: ${p.life}`);
  }
});