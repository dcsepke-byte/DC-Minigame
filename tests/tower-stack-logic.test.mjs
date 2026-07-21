/**
 * Tower Stack — Logik-Tests (TDD RED phase)
 *
 * Testet die reine Spiellogik ohne Browser-Abhaengigkeiten.
 * Node 22 built-in test runner: node --test tests/
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateOverlap,
  isMissed,
  computePlacementScore,
  nextBlockWidth,
  createTowerState,
  placeBlock,
  isGameOver,
  getTowerHeight,
} from '../js/tower-stack-logic.js';

/* ---------- calculateOverlap ---------- */

test('calculateOverlap: exakt ausgerichtet → volle Ueberlappung', () => {
  const prev = { x: 100, width: 80 };
  const next = { x: 100, width: 80 };
  const result = calculateOverlap(prev, next);
  assert.equal(result.overlap, 80);
  assert.equal(result.offset, 0);
});

test('calculateOverlap: nach rechts verschoben → teilweise Ueberlappung', () => {
  const prev = { x: 100, width: 80 };
  const next = { x: 120, width: 80 };
  const result = calculateOverlap(prev, next);
  assert.equal(result.overlap, 60);
  assert.equal(result.offset, 20);
});

test('calculateOverlap: nach links verschoben → teilweise Ueberlappung', () => {
  const prev = { x: 100, width: 80 };
  const next = { x: 80, width: 80 };
  const result = calculateOverlap(prev, next);
  assert.equal(result.overlap, 60);
  assert.equal(result.offset, -20);
});

test('calculateOverlap: komplett daneben → 0 Ueberlappung', () => {
  const prev = { x: 100, width: 80 };
  const next = { x: 200, width: 80 };
  const result = calculateOverlap(prev, next);
  assert.equal(result.overlap, 0);
});

/* ---------- isMissed ---------- */

test('isMissed: Ueberlappung > 0 → false', () => {
  assert.equal(isMissed(50), false);
});

test('isMissed: Ueberlappung = 0 → true (Game Over)', () => {
  assert.equal(isMissed(0), true);
});

/* ---------- computePlacementScore ---------- */

test('computePlacementScore: perfekte Platzierung → maximal Punkte', () => {
  // offset 0 → perfekte Platzierung
  const score = computePlacementScore(0, 80);
  assert.ok(score >= 100, `perfekte Platzierung sollte >= 100 geben, bekam ${score}`);
});

test('computePlacementScore: kleine Abweichung → weniger Punkte', () => {
  const perfect = computePlacementScore(0, 80);
  const partial = computePlacementScore(10, 80);
  assert.ok(partial < perfect, `partial sollte weniger als perfect sein: ${partial} < ${perfect}`);
  assert.ok(partial > 0, `partial sollte > 0 sein: ${partial}`);
});

test('computePlacementScore: grosse Abweichung → minimale Punkte', () => {
  const score = computePlacementScore(70, 80);
  assert.ok(score > 0 && score < 30, `grosse Abweichung sollte wenig Punkte geben: ${score}`);
});

/* ---------- nextBlockWidth ---------- */

test('nextBlockWidth: perfekte Platzierung (overlap = width) → Breite bleibt gleich', () => {
  // Bei perfekter Platzierung ist overlap = width
  assert.equal(nextBlockWidth(80, 80), 80);
});

test('nextBlockWidth: teilweise Ueberlappung → Breite schrumpft auf Ueberlappung', () => {
  // overlap 60 bei width 80 → neue Breite = 60
  assert.equal(nextBlockWidth(80, 60), 60);
});

test('nextBlockWidth: minimale Ueberlappung → sehr schmal', () => {
  assert.equal(nextBlockWidth(80, 10), 10);
});

/* ---------- createTowerState ---------- */

test('createTowerState: Startzustand mit Basis-Block', () => {
  const state = createTowerState({ baseWidth: 100, baseX: 200 });
  assert.equal(state.blocks.length, 1);
  assert.equal(state.blocks[0].width, 100);
  assert.equal(state.blocks[0].x, 200);
  assert.equal(state.score, 0);
  assert.equal(state.gameOver, false);
  assert.equal(state.level, 0);
});

/* ---------- placeBlock ---------- */

test('placeBlock: erfolgreiche Platzierung erhoeht Score und Level', () => {
  const state = createTowerState({ baseWidth: 80, baseX: 100 });
  const result = placeBlock(state, 110); // 10px Versatz
  assert.equal(result.missed, false);
  assert.equal(state.blocks.length, 2);
  assert.equal(state.level, 1);
  assert.ok(state.score > 0, `Score sollte > 0 sein: ${state.score}`);
});

test('placeBlock: perfekte Platzierung gibt Bonus und behaelt Breite', () => {
  const state = createTowerState({ baseWidth: 80, baseX: 100 });
  const result = placeBlock(state, 100); // exakt
  assert.equal(result.missed, false);
  assert.equal(result.perfect, true);
  assert.equal(state.blocks[1].width, 80); // Breite bleibt
  assert.ok(state.score >= 100, `Perfect-Bonus sollte >= 100 sein: ${state.score}`);
});

test('placeBlock: verfehlte Platzierung → Game Over', () => {
  const state = createTowerState({ baseWidth: 80, baseX: 100 });
  const result = placeBlock(state, 300); // komplett daneben
  assert.equal(result.missed, true);
  assert.equal(state.gameOver, true);
  assert.equal(state.blocks.length, 1); // kein neuer Block
});

test('placeBlock: Block schrumpft bei Versatz', () => {
  const state = createTowerState({ baseWidth: 80, baseX: 100 });
  const result = placeBlock(state, 120); // 20px Versatz
  assert.equal(result.missed, false);
  assert.equal(state.blocks[1].width, 60); // 80 - 20 = 60
});

/* ---------- isGameOver ---------- */

test('isGameOver: false nach normalem Zug', () => {
  const state = createTowerState({ baseWidth: 80, baseX: 100 });
  placeBlock(state, 110);
  assert.equal(isGameOver(state), false);
});

test('isGameOver: true nach Fehlversuch', () => {
  const state = createTowerState({ baseWidth: 80, baseX: 100 });
  placeBlock(state, 300);
  assert.equal(isGameOver(state), true);
});

/* ---------- getTowerHeight ---------- */

test('getTowerHeight: 1 Block → 0 Level', () => {
  const state = createTowerState({ baseWidth: 80, baseX: 100 });
  assert.equal(getTowerHeight(state), 0);
});

test('getTowerHeight: 3 Bloecke → 2 Level', () => {
  const state = createTowerState({ baseWidth: 80, baseX: 100 });
  placeBlock(state, 100);
  placeBlock(state, 100);
  assert.equal(getTowerHeight(state), 2);
});

/* ---------- Edge Cases ---------- */

test('placeBlock: sehr schmaler Block bleibt spielbar', () => {
  const state = createTowerState({ baseWidth: 80, baseX: 100 });
  // Schrumpfe auf 20px (60px Versatz)
  placeBlock(state, 160); // overlap = 20, width = 20, new block at x=160
  assert.equal(state.blocks[1].width, 20);
  assert.equal(state.blocks[1].x, 160);
  // Weitere Platzierung: 5px Versatz auf 20px-Block bei x=160
  const result = placeBlock(state, 165); // overlap = 15, width = 15
  assert.equal(result.missed, false);
  assert.equal(state.blocks[2].width, 15);
});

test('placeBlock: mindestbreite wird nicht unterschritten', () => {
  const state = createTowerState({ baseWidth: 80, baseX: 100, minWidth: 15 });
  // 65px Versatz → overlap = 15 → width = 15
  placeBlock(state, 165);
  assert.equal(state.blocks[1].width, 15);
  assert.equal(state.blocks[1].x, 165);
  // 10px Versatz bei 15px width → overlap = 5 → wuerde 5, aber minWidth = 15
  placeBlock(state, 175); // overlap = min(180,190)-max(165,175) = 180-175 = 5
  assert.equal(state.blocks[2].width, 15); // minWidth greift
});