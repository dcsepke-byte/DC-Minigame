/**
 * Color Catch — Logik-Tests (TDD RED phase)
 *
 * Testet die reine Spiellogik ohne Browser-Abhaengigkeiten.
 * Node 22 built-in test runner: node --test tests/*.test.mjs
 *
 * Konzept:
 *  - Ein Korb am unteren Bildschirmrand (x-Position, Breite)
 *  - Farb-Objekte fallen von oben nach unten (y nimmt zu)
 *  - Spieler hat eine Zielfarbe (wechselt periodisch)
 *  - Objekt im Korb auffangen (y erreicht Korb-Hoehe, x in Korb):
 *      richtige Farbe -> Score + Combo
 *      falsche Farbe  -> missed +1, Combo-Reset
 *  - Objekt am Korb vorbei (y > stageH):
 *      richtige Farbe entkommen -> missed +1, Combo-Reset
 *      falsche Farbe entkommen  -> kein missed
 *  - maxMissed erreicht -> Game Over
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createColorCatchState,
  setPlayerColor,
  spawnObject,
  moveBasket,
  tickObjects,
  getActiveObjects,
  isGameOver,
  getMissedCount,
  getScore,
  getCombo,
  getBestCombo,
  computeCatchScore,
  computeComboBonus,
} from '../js/color-catch-logic.js';

/* ---------- createColorCatchState ---------- */

test('createColorCatchState: Startzustand leer, Score 0, gameOver false', () => {
  const state = createColorCatchState({ maxMissed: 5 });
  assert.equal(state.score, 0);
  assert.equal(state.gameOver, false);
  assert.equal(state.objects.length, 0);
  assert.equal(state.combo, 0);
  assert.equal(state.maxMissed, 5);
  assert.equal(state.missed, 0);
});

test('createColorCatchState: benutzerdefinierte maxMissed', () => {
  const state = createColorCatchState({ maxMissed: 3 });
  assert.equal(state.maxMissed, 3);
});

test('createColorCatchState: Default maxMissed ist 5', () => {
  const state = createColorCatchState({});
  assert.equal(state.maxMissed, 5);
});

test('createColorCatchState: hat Korb mit x, width und stageWidth/stageHeight', () => {
  const state = createColorCatchState({ stageWidth: 300, stageHeight: 500 });
  assert.ok(state.basket, 'basket sollte existieren');
  assert.ok(typeof state.basket.x === 'number', 'basket.x sollte number sein');
  assert.ok(typeof state.basket.width === 'number', 'basket.width sollte number sein');
  assert.equal(state.stageWidth, 300);
  assert.equal(state.stageHeight, 500);
});

test('createColorCatchState: hat Farben und playerColor', () => {
  const state = createColorCatchState({ colors: ['#ff0', '#0ff', '#f0f'] });
  assert.ok(Array.isArray(state.colors), 'colors sollte Array sein');
  assert.ok(state.colors.length >= 2, 'mindestens 2 Farben');
  assert.equal(state.playerColor, state.colors[0]);
});

/* ---------- setPlayerColor ---------- */

test('setPlayerColor: setzt Farbe anhand Index', () => {
  const state = createColorCatchState({ colors: ['#ff0', '#0ff', '#f0f'] });
  setPlayerColor(state, 1);
  assert.equal(state.playerColor, '#0ff');
});

test('setPlayerColor: negativer Index ignoriert', () => {
  const state = createColorCatchState({ colors: ['#ff0', '#0ff'] });
  setPlayerColor(state, -1);
  assert.equal(state.playerColor, '#ff0');
});

test('setPlayerColor: Index ausserhalb ignoriert', () => {
  const state = createColorCatchState({ colors: ['#ff0', '#0ff'] });
  setPlayerColor(state, 99);
  assert.equal(state.playerColor, '#ff0');
});

/* ---------- spawnObject ---------- */

test('spawnObject: erzeugt ein Objekt mit ID, Position und Farbe', () => {
  const state = createColorCatchState({ maxMissed: 5, colors: ['#ff0', '#0ff'] });
  const obj = spawnObject(state, 100, 0, 0);
  assert.equal(obj.x, 100);
  assert.equal(obj.y, 0);
  assert.ok(obj.id > 0, 'Objekt sollte id > 0 haben');
  assert.equal(obj.color, '#ff0');
  assert.equal(state.objects.length, 1);
});

test('spawnObject: verschiedene Objekte haben verschiedene IDs', () => {
  const state = createColorCatchState({ maxMissed: 5, colors: ['#ff0', '#0ff'] });
  const o1 = spawnObject(state, 0, 0, 0);
  const o2 = spawnObject(state, 10, 10, 1);
  assert.notEqual(o1.id, o2.id);
});

test('spawnObject: colorIdx ausserhalb wrappt', () => {
  const state = createColorCatchState({ maxMissed: 5, colors: ['#ff0', '#0ff', '#f0f'] });
  const obj = spawnObject(state, 50, 0, 5); // 5 % 3 = 2
  assert.equal(obj.color, '#f0f');
});

/* ---------- moveBasket ---------- */

test('moveBasket: setzt x-Position des Korbs', () => {
  const state = createColorCatchState({ stageWidth: 300 });
  moveBasket(state, 150);
  assert.equal(state.basket.x, 150);
});

test('moveBasket: klemmt x an Buehnenbreite', () => {
  const state = createColorCatchState({ stageWidth: 300 });
  moveBasket(state, -50);
  assert.ok(state.basket.x >= 0, 'x sollte >= 0 sein');
  moveBasket(state, 999);
  assert.ok(state.basket.x <= state.stageWidth - state.basket.width, 'x sollte <= stageWidth - width sein');
});

/* ---------- computeCatchScore ---------- */

test('computeCatchScore: Basispunkte fuer Catch > 0', () => {
  assert.ok(computeCatchScore(1) > 0, 'Combo 1 sollte Punkte geben');
});

test('computeCatchScore: hoeherer Combo gibt mehr Punkte', () => {
  assert.ok(computeCatchScore(5) > computeCatchScore(1), 'Combo 5 sollte mehr Punkte als Combo 1 geben');
});

test('computeCatchScore: Combo 0 gibt 0 Punkte', () => {
  assert.equal(computeCatchScore(0), 0);
});

/* ---------- computeComboBonus ---------- */

test('computeComboBonus: Combo 0 oder 1 -> 0 Bonus', () => {
  assert.equal(computeComboBonus(0), 0);
  assert.equal(computeComboBonus(1), 0);
});

test('computeComboBonus: Combo >= 2 -> positiver Bonus', () => {
  assert.ok(computeComboBonus(2) > 0, 'Combo 2 sollte Bonus > 0 haben');
  assert.ok(computeComboBonus(5) > computeComboBonus(2), 'hoeherer Combo sollte mehr Bonus geben');
});

/* ---------- tickObjects: Bewegung ---------- */

test('tickObjects: Objekt bewegt sich nach unten (y nimmt zu)', () => {
  const state = createColorCatchState({ maxMissed: 5, stageWidth: 300, stageHeight: 600 });
  const obj = spawnObject(state, 100, 0, 0);
  obj.speed = 0.1; // px/ms
  tickObjects(state, 1000, 600, 580);
  assert.ok(obj.y > 0, `y sollte > 0 sein: ${obj.y}`);
});

/* ---------- tickObjects: Catch richtige Farbe ---------- */

test('tickObjects: richtige Farbe im Korb gefangen -> Score + Combo', () => {
  const state = createColorCatchState({ maxMissed: 5, stageWidth: 300, stageHeight: 600, colors: ['#ff0', '#0ff'] });
  state.basket.x = 100;
  state.basket.width = 80;
  // Objekt direkt ueber dem Korb, richtige Farbe
  const obj = spawnObject(state, 120, 0, 0);
  obj.speed = 0.5; // schnell fallen
  // Korb-Y = stageHeight - basketYOffset (z.B. 580)
  // Objekt auf y=570, dt=100 -> y=620, ueber Korb-Y
  tickObjects(state, 100, 600, 580);
  assert.equal(state.combo, 1, 'Combo sollte 1 sein nach Catch');
  assert.ok(state.score > 0, 'Score sollte > 0 sein nach Catch');
  assert.equal(state.objects.length, 0, 'Objekt sollte entfernt sein');
});

test('tickObjects: richtige Farbe gefangen -> bestCombo aktualisiert', () => {
  const state = createColorCatchState({ maxMissed: 5, stageWidth: 300, stageHeight: 600, colors: ['#ff0', '#0ff'] });
  state.basket.x = 100;
  state.basket.width = 80;
  const obj = spawnObject(state, 120, 0, 0);
  obj.speed = 0.5;
  tickObjects(state, 100, 600, 580);
  assert.equal(state.bestCombo, 1);
});

/* ---------- tickObjects: Catch falsche Farbe ---------- */

test('tickObjects: falsche Farbe im Korb gefangen -> missed +1, Combo-Reset', () => {
  const state = createColorCatchState({ maxMissed: 5, stageWidth: 300, stageHeight: 600, colors: ['#ff0', '#0ff'] });
  state.playerColor = '#ff0';
  state.basket.x = 100;
  state.basket.width = 80;
  const obj = spawnObject(state, 120, 0, 1); // falsche Farbe (#0ff)
  obj.speed = 0.5;
  tickObjects(state, 100, 600, 580);
  assert.equal(state.missed, 1, 'falsche Farbe im Korb -> missed +1');
  assert.equal(state.combo, 0, 'Combo sollte reset sein');
});

/* ---------- tickObjects: Objekt am Korb vorbei ---------- */

test('tickObjects: richtige Farbe entkommen (am Korb vorbei) -> missed +1', () => {
  const state = createColorCatchState({ maxMissed: 5, stageWidth: 300, stageHeight: 600, colors: ['#ff0', '#0ff'] });
  state.playerColor = '#ff0';
  state.basket.x = 200; // Korb weit rechts
  state.basket.width = 60;
  const obj = spawnObject(state, 50, 0, 0); // richtige Farbe links, vorbei
  obj.speed = 1.0; // schnell
  tickObjects(state, 1000, 600, 580);
  assert.equal(state.missed, 1, 'richtige Farbe entkommen -> missed +1');
  assert.equal(state.combo, 0, 'Combo sollte reset sein');
});

test('tickObjects: falsche Farbe entkommen -> kein missed', () => {
  const state = createColorCatchState({ maxMissed: 5, stageWidth: 300, stageHeight: 600, colors: ['#ff0', '#0ff'] });
  state.playerColor = '#ff0';
  state.basket.x = 200;
  state.basket.width = 60;
  const obj = spawnObject(state, 50, 0, 1); // falsche Farbe (#0ff)
  obj.speed = 1.0;
  tickObjects(state, 1000, 600, 580);
  assert.equal(state.missed, 0, 'falsche Farbe entkommen -> kein missed');
});

/* ---------- tickObjects: Game Over ---------- */

test('tickObjects: maxMissed erreicht -> Game Over', () => {
  const state = createColorCatchState({ maxMissed: 2, stageWidth: 300, stageHeight: 600, colors: ['#ff0', '#0ff'] });
  state.playerColor = '#ff0';
  state.basket.x = 200; // weit weg
  state.basket.width = 60;
  for (let i = 0; i < 2; i++) {
    const obj = spawnObject(state, 50, 0, 0); // richtige Farbe, entkommt
    obj.speed = 1.0;
    tickObjects(state, 1000, 600, 580);
  }
  assert.equal(state.missed, 2);
  assert.equal(state.gameOver, true);
});

test('tickObjects: game over -> keine weiteren Updates', () => {
  const state = createColorCatchState({ maxMissed: 1, stageWidth: 300, stageHeight: 600, colors: ['#ff0', '#0ff'] });
  state.gameOver = true;
  const obj = spawnObject(state, 100, 0, 0);
  obj.speed = 0.5;
  const yBefore = obj.y;
  const events = tickObjects(state, 1000, 600, 580);
  assert.equal(obj.y, yBefore, 'Bei game over sollte nichts bewegt werden');
  assert.equal(events.length, 0);
});

/* ---------- tickObjects: Events ---------- */

test('tickObjects: gibt Events zurueck (caught/escaped)', () => {
  const state = createColorCatchState({ maxMissed: 5, stageWidth: 300, stageHeight: 600, colors: ['#ff0', '#0ff'] });
  state.playerColor = '#ff0';
  state.basket.x = 100;
  state.basket.width = 80;
  const obj = spawnObject(state, 120, 0, 0);
  obj.speed = 0.5;
  const events = tickObjects(state, 100, 600, 580);
  assert.ok(Array.isArray(events), 'sollte Array von Events sein');
  assert.ok(events.some(e => e.type === 'caught'), 'sollte caught Event haben');
});

test('tickObjects: entkommenes Objekt gibt escaped Event', () => {
  const state = createColorCatchState({ maxMissed: 5, stageWidth: 300, stageHeight: 600, colors: ['#ff0', '#0ff'] });
  state.playerColor = '#ff0';
  state.basket.x = 200;
  state.basket.width = 60;
  const obj = spawnObject(state, 50, 0, 0);
  obj.speed = 1.0;
  const events = tickObjects(state, 1000, 600, 580);
  assert.ok(events.some(e => e.type === 'escaped'), 'sollte escaped Event haben');
});

/* ---------- Combo-Reset nach Fehlschlag ---------- */

test('tickObjects: Combo reset nach falscher Farbe im Korb', () => {
  const state = createColorCatchState({ maxMissed: 5, stageWidth: 300, stageHeight: 600, colors: ['#ff0', '#0ff'] });
  state.playerColor = '#ff0';
  state.basket.x = 100;
  state.basket.width = 80;
  // Erst richtig fangen
  const o1 = spawnObject(state, 120, 0, 0);
  o1.speed = 0.5;
  tickObjects(state, 100, 600, 580);
  assert.equal(state.combo, 1);
  // Dann falsche Farbe
  const o2 = spawnObject(state, 120, 0, 1);
  o2.speed = 0.5;
  tickObjects(state, 100, 600, 580);
  assert.equal(state.combo, 0, 'Combo sollte nach falscher Farbe reset sein');
});

/* ---------- getActiveObjects / isGameOver / getMissedCount / getScore / getCombo ---------- */

test('getActiveObjects: gibt aktive Objekte zurueck', () => {
  const state = createColorCatchState({ maxMissed: 5, colors: ['#ff0', '#0ff'] });
  spawnObject(state, 10, 0, 0);
  spawnObject(state, 20, 0, 1);
  assert.equal(getActiveObjects(state).length, 2);
});

test('isGameOver: false am Anfang, true nach maxMissed', () => {
  const state = createColorCatchState({ maxMissed: 1, stageWidth: 300, stageHeight: 600, colors: ['#ff0', '#0ff'] });
  assert.equal(isGameOver(state), false);
  state.playerColor = '#ff0';
  state.basket.x = 200;
  state.basket.width = 60;
  const obj = spawnObject(state, 50, 0, 0);
  obj.speed = 1.0;
  tickObjects(state, 1000, 600, 580);
  assert.equal(isGameOver(state), true);
});

test('getMissedCount: gibt Anzahl verpasster/falscher Objekte zurueck', () => {
  const state = createColorCatchState({ maxMissed: 5, colors: ['#ff0', '#0ff'] });
  assert.equal(getMissedCount(state), 0);
});

test('getScore: gibt aktuellen Score zurueck', () => {
  const state = createColorCatchState({ maxMissed: 5, stageWidth: 300, stageHeight: 600, colors: ['#ff0', '#0ff'] });
  assert.equal(getScore(state), 0);
  state.basket.x = 100;
  state.basket.width = 80;
  const obj = spawnObject(state, 120, 0, 0);
  obj.speed = 0.5;
  tickObjects(state, 100, 600, 580);
  assert.ok(getScore(state) > 0);
});

test('getCombo: gibt aktuellen Combo zurueck', () => {
  const state = createColorCatchState({ maxMissed: 5, colors: ['#ff0', '#0ff'] });
  assert.equal(getCombo(state), 0);
});

test('getBestCombo: gibt besten Combo zurueck', () => {
  const state = createColorCatchState({ maxMissed: 5, stageWidth: 300, stageHeight: 600, colors: ['#ff0', '#0ff'] });
  assert.equal(getBestCombo(state), 0);
  state.basket.x = 100;
  state.basket.width = 80;
  const o1 = spawnObject(state, 120, 0, 0);
  o1.speed = 0.5;
  tickObjects(state, 100, 600, 580);
  const o2 = spawnObject(state, 120, 0, 0);
  o2.speed = 0.5;
  tickObjects(state, 100, 600, 580);
  assert.equal(getBestCombo(state), 2);
});

/* ---------- mehrere Objekte gleichzeitig ---------- */

test('tickObjects: mehrere Objekte gleichzeitig bewegen und fangen', () => {
  const state = createColorCatchState({ maxMissed: 5, stageWidth: 400, stageHeight: 600, colors: ['#ff0', '#0ff', '#f0f'] });
  state.playerColor = '#ff0';
  state.basket.x = 150;
  state.basket.width = 100;
  // Zwei richtige im Korb, eine falsche daneben
  const o1 = spawnObject(state, 160, 0, 0); // richtig, im Korb
  o1.speed = 0.5;
  const o2 = spawnObject(state, 200, 0, 0); // richtig, im Korb
  o2.speed = 0.5;
  const o3 = spawnObject(state, 10, 0, 1); // falsch, vorbei
  o3.speed = 0.5;
  tickObjects(state, 100, 600, 580);
  assert.equal(state.combo, 2, 'zwei richtige gefangen -> Combo 2');
  assert.equal(state.missed, 0, 'falsche entkommen -> kein missed');
});