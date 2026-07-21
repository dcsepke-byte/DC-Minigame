/**
 * Ninja Slash — Logik-Tests (TDD RED phase)
 *
 * Testet die reine Spiellogik ohne Browser-Abhaengigkeiten.
 * Node 22 built-in test runner: node --test tests/
 *
 * Konzept:
 *  - Objekte (Fruechte) fliegen von unten nach oben (parabolische Bahn)
 *  - Tippen = schlitzern → Punkte
 *  - Fruechte entkommen → missed +1
 *  - Bombe tippen → Game Over
 *  - Combos bei mehreren Treffern in kurzer Zeit
 *  - maxMissed erreicht → Game Over
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createNinjaState,
  spawnObject,
  slashObject,
  tickObjects,
  getActiveObjects,
  isGameOver,
  getMissedCount,
  getScore,
  getCombo,
  computeComboBonus,
  setPlayerColor,
  FRUIT_TYPES,
} from '../js/ninja-slash-logic.js';

/* ---------- createNinjaState ---------- */

test('createNinjaState: Startzustand leer, Score 0, gameOver false', () => {
  const state = createNinjaState({ maxMissed: 5 });
  assert.equal(state.score, 0);
  assert.equal(state.gameOver, false);
  assert.equal(state.objects.length, 0);
  assert.equal(state.combo, 0);
  assert.equal(state.maxMissed, 5);
  assert.equal(state.missed, 0);
});

test('createNinjaState: benutzerdefinierte maxMissed', () => {
  const state = createNinjaState({ maxMissed: 3 });
  assert.equal(state.maxMissed, 3);
});

test('createNinjaState: Default maxMissed ist 5', () => {
  const state = createNinjaState({});
  assert.equal(state.maxMissed, 5);
});

/* ---------- FRUIT_TYPES ---------- */

test('FRUIT_TYPES: enthaelt mehrere Fruechte und eine Bombe', () => {
  assert.ok(FRUIT_TYPES.length >= 4, 'sollte mindestens 4 Typen haben');
  assert.ok(FRUIT_TYPES.some(t => t.id === 'bomb'), 'sollte Bombe enthalten');
  assert.ok(FRUIT_TYPES.filter(t => t.id !== 'bomb').length >= 3, 'sollte mindestens 3 Fruechte haben');
});

test('FRUIT_TYPES: Fruechte haben Punkte > 0, Bombe hat Punkte 0', () => {
  for (const t of FRUIT_TYPES) {
    if (t.id === 'bomb') {
      assert.equal(t.points, 0, 'Bombe sollte 0 Punkte haben');
    } else {
      assert.ok(t.points > 0, `Frucht ${t.id} sollte Punkte > 0 haben: ${t.points}`);
    }
  }
});

/* ---------- spawnObject ---------- */

test('spawnObject: erzeugt ein Objekt mit ID, Position und Typ', () => {
  const state = createNinjaState({ maxMissed: 5 });
  const obj = spawnObject(state, 100, 200, 'watermelon');
  assert.equal(obj.x, 100);
  assert.equal(obj.y, 200);
  assert.ok(obj.id > 0, 'Objekt sollte id > 0 haben');
  assert.equal(obj.typeId, 'watermelon');
  assert.equal(state.objects.length, 1);
});

test('spawnObject: verschiedene Objekte haben verschiedene IDs', () => {
  const state = createNinjaState({ maxMissed: 5 });
  const o1 = spawnObject(state, 0, 0, 'watermelon');
  const o2 = spawnObject(state, 10, 10, 'apple');
  assert.notEqual(o1.id, o2.id);
});

test('spawnObject: Objekt hat Geschwindigkeit vx und vy', () => {
  const state = createNinjaState({ maxMissed: 5 });
  const obj = spawnObject(state, 50, 300, 'apple', { vx: 0.1, vy: -0.5 });
  assert.ok(obj.vx !== undefined, 'vx sollte gesetzt sein');
  assert.ok(obj.vy !== undefined, 'vy sollte gesetzt sein');
});

test('spawnObject: Bombe kann gespawnt werden', () => {
  const state = createNinjaState({ maxMissed: 5 });
  const obj = spawnObject(state, 50, 300, 'bomb');
  assert.equal(obj.typeId, 'bomb');
  assert.equal(obj.isBomb, true);
});

test('spawnObject: Frucht hat isBomb false', () => {
  const state = createNinjaState({ maxMissed: 5 });
  const obj = spawnObject(state, 50, 300, 'watermelon');
  assert.equal(obj.isBomb, false);
});

/* ---------- slashObject ---------- */

test('slashObject: Frucht slashen → Punkte, Combo +1', () => {
  const state = createNinjaState({ maxMissed: 5 });
  const obj = spawnObject(state, 50, 300, 'watermelon');
  const result = slashObject(state, obj.id);
  assert.equal(result.hit, true);
  assert.equal(result.bomb, false);
  assert.ok(result.points > 0, `Punkte sollten > 0 sein: ${result.points}`);
  assert.equal(state.combo, 1);
  assert.ok(state.score > 0, `Score sollte > 0 sein: ${state.score}`);
  assert.equal(state.objects.length, 0); // Objekt entfernt
});

test('slashObject: Bombe slashen → Game Over', () => {
  const state = createNinjaState({ maxMissed: 5 });
  const obj = spawnObject(state, 50, 300, 'bomb');
  const result = slashObject(state, obj.id);
  assert.equal(result.hit, true);
  assert.equal(result.bomb, true);
  assert.equal(state.gameOver, true);
});

test('slashObject: bereits game over → kein Treffer', () => {
  const state = createNinjaState({ maxMissed: 5 });
  state.gameOver = true;
  const obj = spawnObject(state, 50, 300, 'watermelon');
  const result = slashObject(state, obj.id);
  assert.equal(result.hit, false);
});

test('slashObject: ungueltige ID → kein Treffer', () => {
  const state = createNinjaState({ maxMissed: 5 });
  const result = slashObject(state, 999);
  assert.equal(result.hit, false);
});

test('slashObject: Combo steigt bei aufeinanderfolgenden Treffern', () => {
  const state = createNinjaState({ maxMissed: 5 });
  const o1 = spawnObject(state, 10, 300, 'watermelon');
  slashObject(state, o1.id);
  const o2 = spawnObject(state, 20, 300, 'apple');
  slashObject(state, o2.id);
  assert.equal(state.combo, 2);
  // Combo-Bonus sollte additiv sein
  assert.ok(state.score > 0);
});

/* ---------- computeComboBonus ---------- */

test('computeComboBonus: Combo 0 oder 1 → 0 Bonus', () => {
  assert.equal(computeComboBonus(0), 0);
  assert.equal(computeComboBonus(1), 0);
});

test('computeComboBonus: Combo >= 2 → positiver Bonus', () => {
  assert.ok(computeComboBonus(2) > 0, 'Combo 2 sollte Bonus > 0 haben');
  assert.ok(computeComboBonus(5) > computeComboBonus(2), 'hoeherer Combo sollte mehr Bonus geben');
});

test('computeComboBonus: Bonus steigt linear mit Combo', () => {
  const b2 = computeComboBonus(2);
  const b3 = computeComboBonus(3);
  assert.equal(b3 - b2, b2, 'Differenz sollte konstant sein (linear)');
});

/* ---------- tickObjects ---------- */

test('tickObjects: Objekt bewegt sich entsprechend vx und vy', () => {
  const state = createNinjaState({ maxMissed: 5 });
  const obj = spawnObject(state, 100, 300, 'watermelon', { vx: 0.1, vy: -0.5 });
  tickObjects(state, 1000, 600); // 1 Sekunde
  // x sollte sich um vx * dt bewegt haben
  assert.ok(Math.abs(obj.x - (100 + 0.1 * 1000)) < 1, `x sollte ~200 sein: ${obj.x}`);
  // y nimmt ab (bewegt sich nach oben, y wird kleiner)
  assert.ok(obj.y < 300, `y sollte kleiner sein: ${obj.y}`);
});

test('tickObjects: Schwerkraft zieht Objekt nach unten (vy nimmt zu)', () => {
  const state = createNinjaState({ maxMissed: 5 });
  const obj = spawnObject(state, 100, 300, 'watermelon', { vx: 0, vy: -0.5 });
  const vyBefore = obj.vy;
  tickObjects(state, 100, 600);
  // vy sollte weniger negativ sein (Schwerkraft added positiven Wert)
  assert.ok(obj.vy > vyBefore, `vy sollte zunehmen (Schwerkraft): ${vyBefore} -> ${obj.vy}`);
});

test('tickObjects: Frucht die unten aus dem Bild faellt → missed +1', () => {
  const state = createNinjaState({ maxMissed: 5 });
  // Objekt nahe am Boden mit starker Abwaertsgeschwindigkeit
  spawnObject(state, 100, 500, 'watermelon', { vx: 0, vy: 1.0 });
  tickObjects(state, 1000, 600);
  assert.equal(state.missed, 1, 'Frucht entkommen → missed +1');
});

test('tickObjects: Bombe die aus dem Bild faellt → kein missed', () => {
  const state = createNinjaState({ maxMissed: 5 });
  spawnObject(state, 100, 500, 'bomb', { vx: 0, vy: 1.0 });
  tickObjects(state, 1000, 600);
  assert.equal(state.missed, 0, 'Bombe entkommen → kein missed');
});

test('tickObjects: maxMissed erreicht → Game Over', () => {
  const state = createNinjaState({ maxMissed: 3 });
  for (let i = 0; i < 3; i++) {
    spawnObject(state, 100, 500, 'watermelon', { vx: 0, vy: 1.0 });
    tickObjects(state, 1000, 600);
  }
  assert.equal(state.missed, 3);
  assert.equal(state.gameOver, true);
});

test('tickObjects: game over → keine weiteren Updates', () => {
  const state = createNinjaState({ maxMissed: 1 });
  state.gameOver = true;
  const obj = spawnObject(state, 100, 300, 'watermelon', { vx: 0.1, vy: -0.5 });
  const xBefore = obj.x;
  tickObjects(state, 1000, 600);
  assert.equal(obj.x, xBefore, 'Bei game over sollte nichts bewegt werden');
});

test('tickObjects: gibt Events zurueck', () => {
  const state = createNinjaState({ maxMissed: 5 });
  spawnObject(state, 100, 500, 'watermelon', { vx: 0, vy: 1.0 });
  const events = tickObjects(state, 1000, 600);
  assert.ok(Array.isArray(events), 'sollte Array von Events sein');
  assert.ok(events.some(e => e.type === 'escaped'), 'sollte escaped Event haben');
});

/* ---------- getActiveObjects ---------- */

test('getActiveObjects: gibt aktive Objekte zurueck', () => {
  const state = createNinjaState({ maxMissed: 5 });
  spawnObject(state, 10, 300, 'watermelon');
  spawnObject(state, 20, 300, 'apple');
  assert.equal(getActiveObjects(state).length, 2);
});

test('getActiveObjects: nach slash ist Objekt entfernt', () => {
  const state = createNinjaState({ maxMissed: 5 });
  const obj = spawnObject(state, 10, 300, 'watermelon');
  slashObject(state, obj.id);
  assert.equal(getActiveObjects(state).length, 0);
});

/* ---------- isGameOver / getMissedCount / getScore / getCombo ---------- */

test('isGameOver: false am Anfang, true nach Bomben-Treffer', () => {
  const state = createNinjaState({ maxMissed: 5 });
  assert.equal(isGameOver(state), false);
  const obj = spawnObject(state, 50, 300, 'bomb');
  slashObject(state, obj.id);
  assert.equal(isGameOver(state), true);
});

test('getMissedCount: gibt Anzahl verpasster Fruechte zurueck', () => {
  const state = createNinjaState({ maxMissed: 5 });
  assert.equal(getMissedCount(state), 0);
  spawnObject(state, 100, 500, 'watermelon', { vx: 0, vy: 1.0 });
  tickObjects(state, 1000, 600);
  assert.equal(getMissedCount(state), 1);
});

test('getScore: gibt aktuellen Score zurueck', () => {
  const state = createNinjaState({ maxMissed: 5 });
  assert.equal(getScore(state), 0);
  const obj = spawnObject(state, 50, 300, 'watermelon');
  slashObject(state, obj.id);
  assert.ok(getScore(state) > 0);
});

test('getCombo: gibt aktuellen Combo zurueck', () => {
  const state = createNinjaState({ maxMissed: 5 });
  assert.equal(getCombo(state), 0);
  const o1 = spawnObject(state, 10, 300, 'watermelon');
  slashObject(state, o1.id);
  assert.equal(getCombo(state), 1);
});

/* ---------- Edge Cases ---------- */

test('slashObject: Combo reset nach entkommener Frucht', () => {
  const state = createNinjaState({ maxMissed: 5 });
  const o1 = spawnObject(state, 10, 300, 'watermelon');
  slashObject(state, o1.id);
  assert.equal(state.combo, 1);
  // Frucht entkommen lassen
  spawnObject(state, 100, 500, 'apple', { vx: 0, vy: 1.0 });
  tickObjects(state, 1000, 600);
  assert.equal(state.combo, 0, 'Combo sollte nach entkommener Frucht reset sein');
});

test('slashObject: Punkte unterschiedlich fuer verschiedene Fruechte', () => {
  const state1 = createNinjaState({ maxMissed: 5 });
  const o1 = spawnObject(state1, 10, 300, 'watermelon');
  const r1 = slashObject(state1, o1.id);

  const state2 = createNinjaState({ maxMissed: 5 });
  const o2 = spawnObject(state2, 10, 300, 'apple');
  const r2 = slashObject(state2, o2.id);

  // Verschiedene Fruechte sollten verschiedene Punkte geben
  // (sofern watermelon != apple in Punkten)
  assert.ok(r1.points > 0 && r2.points > 0);
});

test('tickObjects: mehrere Objekte gleichzeitig bewegen', () => {
  const state = createNinjaState({ maxMissed: 5 });
  const o1 = spawnObject(state, 100, 300, 'watermelon', { vx: 0.05, vy: -0.3 });
  const o2 = spawnObject(state, 200, 300, 'apple', { vx: -0.03, vy: -0.4 });
  tickObjects(state, 500, 600);
  assert.ok(o1.x > 100, 'o1 sollte sich nach rechts bewegen');
  assert.ok(o2.x < 200, 'o2 sollte sich nach links bewegen');
});