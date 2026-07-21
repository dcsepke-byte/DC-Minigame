/**
 * Bubble Pop — Logik-Tests (TDD RED phase)
 *
 * Testet die reine Spiellogik ohne Browser-Abhaengigkeiten.
 * Node 22 built-in test runner: node --test tests/
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createBubbleState,
  spawnBubble,
  popBubble,
  computeScore,
  computeChainBonus,
  tickBubbles,
  getActiveBubbles,
  isGameOver,
  getMissedCount,
  setPlayerColor,
} from '../js/bubble-pop-logic.js';

/* ---------- createBubbleState ---------- */

test('createBubbleState: Startzustand leer, Score 0, gameOver false', () => {
  const state = createBubbleState({ colors: ['#ff0', '#0ff', '#f0f'] });
  assert.equal(state.score, 0);
  assert.equal(state.gameOver, false);
  assert.equal(state.bubbles.length, 0);
  assert.equal(state.combo, 0);
  assert.equal(state.maxMissed, 5);
  assert.equal(state.missed, 0);
});

test('createBubbleState: benutzerdefinierte maxMissed', () => {
  const state = createBubbleState({ colors: ['#ff0'], maxMissed: 3 });
  assert.equal(state.maxMissed, 3);
});

/* ---------- setPlayerColor ---------- */

test('setPlayerColor: setzt die Spielerfarbe aus dem Pool', () => {
  const colors = ['#ff0000', '#00ff00', '#0000ff'];
  const state = createBubbleState({ colors });
  setPlayerColor(state, 1);
  assert.equal(state.playerColor, '#00ff00');
});

test('setPlayerColor: wechselt die Farbe bei erneutem Aufruf', () => {
  const colors = ['#ff0000', '#00ff00', '#0000ff'];
  const state = createBubbleState({ colors });
  setPlayerColor(state, 0);
  setPlayerColor(state, 2);
  assert.equal(state.playerColor, '#0000ff');
});

/* ---------- spawnBubble ---------- */

test('spawnBubble: erzeugt eine Blase mit Farbe aus dem Pool', () => {
  const colors = ['#ff0000', '#00ff00'];
  const state = createBubbleState({ colors });
  const bubble = spawnBubble(state, 100, 200, 0);
  assert.equal(bubble.x, 100);
  assert.equal(bubble.y, 200);
  assert.ok(colors.includes(bubble.color), `Farbe ${bubble.color} sollte im Pool sein`);
  assert.ok(bubble.id > 0, 'Blase sollte eine id > 0 haben');
  assert.equal(state.bubbles.length, 1);
});

test('spawnBubble: verschiedene Blasen haben verschiedene IDs', () => {
  const state = createBubbleState({ colors: ['#ff0000'] });
  const b1 = spawnBubble(state, 0, 0, 0);
  const b2 = spawnBubble(state, 10, 10, 0);
  assert.notEqual(b1.id, b2.id);
});

/* ---------- popBubble ---------- */

test('popBubble: richtige Farbe → Score steigt, Combo +1', () => {
  const state = createBubbleState({ colors: ['#ff0000', '#00ff00'] });
  setPlayerColor(state, 0);
  const b = spawnBubble(state, 50, 100, 0); // Farbe 0 = '#ff0000' = playerColor
  const result = popBubble(state, b.id);
  assert.equal(result.correct, true);
  assert.equal(state.combo, 1);
  assert.ok(state.score > 0, `Score sollte > 0 sein: ${state.score}`);
  assert.equal(state.bubbles.length, 0); // Blase entfernt
});

test('popBubble: falsche Farbe → Combo reset, missed +1', () => {
  const state = createBubbleState({ colors: ['#ff0000', '#00ff00'] });
  setPlayerColor(state, 0);
  const b = spawnBubble(state, 50, 100, 1); // Farbe 1 = falsch
  const result = popBubble(state, b.id);
  assert.equal(result.correct, false);
  assert.equal(state.combo, 0);
  assert.equal(state.missed, 1);
  assert.equal(state.bubbles.length, 0); // Blase trotzdem entfernt
});

test('popBubble: 5 falsche Farben → Game Over', () => {
  const state = createBubbleState({ colors: ['#ff0000', '#00ff00'], maxMissed: 5 });
  setPlayerColor(state, 0);
  for (let i = 0; i < 5; i++) {
    const b = spawnBubble(state, 50, 100, 1); // falsche Farbe
    popBubble(state, b.id);
  }
  assert.equal(state.gameOver, true);
  assert.equal(state.missed, 5);
});

test('popBubble: nicht existierende Blase → ignoriert', () => {
  const state = createBubbleState({ colors: ['#ff0000'] });
  setPlayerColor(state, 0);
  const result = popBubble(state, 9999);
  assert.equal(result.correct, false);
  assert.equal(state.score, 0);
});

test('popBubble: nach Game Over werden weitere Versuche ignoriert', () => {
  const state = createBubbleState({ colors: ['#ff0000', '#00ff00'], maxMissed: 1 });
  setPlayerColor(state, 0);
  const wrong = spawnBubble(state, 0, 0, 1);
  popBubble(state, wrong.id); // missed=1 → gameOver
  assert.equal(state.gameOver, true);
  const b = spawnBubble(state, 50, 100, 0);
  const result = popBubble(state, b.id);
  assert.equal(result.correct, false);
  assert.equal(state.score, 0);
});

/* ---------- computeScore ---------- */

test('computeScore: Basis-Punkte fuer einzelne Blase', () => {
  const pts = computeScore(1); // Combo 1
  assert.ok(pts > 0, `Basis-Punkte sollten > 0 sein: ${pts}`);
});

test('computeScore: hoeherer Combo gibt mehr Punkte', () => {
  const low = computeScore(1);
  const high = computeScore(5);
  assert.ok(high > low, `Combo 5 (${high}) sollte mehr sein als Combo 1 (${low})`);
});

test('computeScore: Combo 0 gibt 0 Punkte', () => {
  assert.equal(computeScore(0), 0);
});

/* ---------- computeChainBonus ---------- */

test('computeChainBonus: 2 benachbarte gleiche Blasen → Bonus', () => {
  const bonus = computeChainBonus(2);
  assert.ok(bonus > 0, `Ketten-Bonus fuer 2 sollte > 0 sein: ${bonus}`);
});

test('computeChainBonus: 1 Blase → kein Bonus', () => {
  assert.equal(computeChainBonus(1), 0);
});

test('computeChainBonus: mehr Blasen → mehr Bonus', () => {
  const b2 = computeChainBonus(2);
  const b4 = computeChainBonus(4);
  assert.ok(b4 > b2, `Bonus fuer 4 (${b4}) sollte > 2 (${b2}) sein`);
});

/* ---------- tickBubbles ---------- */

test('tickBubbles: Blasen bewegen sich nach oben (y nimmt ab)', () => {
  const state = createBubbleState({ colors: ['#ff0000'] });
  spawnBubble(state, 100, 300, 0);
  const dt = 16; // ms
  const events = tickBubbles(state, dt, 600); // stageH=600
  assert.ok(state.bubbles[0].y < 300, `y sollte sinken: ${state.bubbles[0].y}`);
  assert.ok(Array.isArray(events), 'tickBubbles sollte Events zurueckgeben');
});

test('tickBubbles: Blase verlaesst oberen Rand → "escaped" Event', () => {
  const state = createBubbleState({ colors: ['#ff0000'] });
  spawnBubble(state, 100, 10, 0); // nah am oberen Rand
  const events = tickBubbles(state, 1000, 600); // dt gross genug zum Entkommen
  const escaped = events.find(e => e.type === 'escaped');
  assert.ok(escaped, 'Sollte ein escaped-Event geben');
  assert.equal(state.bubbles.length, 0, 'Blase sollte entfernt werden');
});

test('tickBubbles: Spielerfarbe entkommen → missed +1', () => {
  const state = createBubbleState({ colors: ['#ff0000', '#00ff00'], maxMissed: 5 });
  setPlayerColor(state, 0);
  spawnBubble(state, 100, 10, 0); // playerColor entkommen
  const events = tickBubbles(state, 1000, 600);
  assert.equal(state.missed, 1, 'Entkommene Spielerfarbe sollte missed erhoehen');
});

test('tickBubbles: falsche Farbe entkommen → kein missed', () => {
  const state = createBubbleState({ colors: ['#ff0000', '#00ff00'], maxMissed: 5 });
  setPlayerColor(state, 0);
  spawnBubble(state, 100, 10, 1); // falsche Farbe entkommen
  const events = tickBubbles(state, 1000, 600);
  assert.equal(state.missed, 0, 'Falsche Farbe entkommen sollte kein missed erhoehen');
});

test('tickBubbles: maxMissed erreicht → Game Over', () => {
  const state = createBubbleState({ colors: ['#ff0000'], maxMissed: 2 });
  setPlayerColor(state, 0);
  spawnBubble(state, 100, 10, 0);
  tickBubbles(state, 1000, 600); // missed=1
  spawnBubble(state, 100, 10, 0);
  tickBubbles(state, 1000, 600); // missed=2
  assert.equal(state.gameOver, true);
});

/* ---------- getActiveBubbles ---------- */

test('getActiveBubbles: gibt aktuelle Blasen-Liste zurueck', () => {
  const state = createBubbleState({ colors: ['#ff0000'] });
  spawnBubble(state, 10, 20, 0);
  spawnBubble(state, 30, 40, 0);
  const list = getActiveBubbles(state);
  assert.equal(list.length, 2);
});

/* ---------- isGameOver / getMissedCount ---------- */

test('isGameOver: false zu Beginn', () => {
  const state = createBubbleState({ colors: ['#ff0000'] });
  assert.equal(isGameOver(state), false);
});

test('getMissedCount: 0 zu Beginn', () => {
  const state = createBubbleState({ colors: ['#ff0000'] });
  assert.equal(getMissedCount(state), 0);
});