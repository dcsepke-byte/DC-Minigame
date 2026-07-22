/**
 * Loading Screen — Logik-Tests (TDD RED phase)
 *
 * Testet die reine Logik ohne DOM-Abhaengigkeiten.
 * Node 22 built-in test runner: node --test tests/loading-screen-logic.test.mjs
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createLoadingState,
  updateProgress,
  getProgress,
  isComplete,
  shouldDismiss,
  setMinDisplayTime,
  getElapsed,
  canDismiss,
} from '../js/loading-screen-logic.js';

/* ---------- createLoadingState ---------- */

test('createLoadingState: erzeugt State mit 0% Progress', () => {
  const state = createLoadingState();
  assert.equal(state.progress, 0);
  assert.equal(state.complete, false);
  assert.equal(state.minDisplayMs, 800);
  assert.ok(state.startTime > 0);
});

test('createLoadingState: optionale Parameter werden uebernommen', () => {
  const state = createLoadingState({ minDisplayMs: 1500 });
  assert.equal(state.minDisplayMs, 1500);
});

/* ---------- updateProgress ---------- */

test('updateProgress: setzt Progress auf gueltigen Wert', () => {
  const state = createLoadingState();
  updateProgress(state, 50);
  assert.equal(state.progress, 50);
});

test('updateProgress: 100% setzt complete auf true', () => {
  const state = createLoadingState();
  updateProgress(state, 100);
  assert.equal(state.progress, 100);
  assert.equal(state.complete, true);
});

test('updateProgress: Werte unter 0 werden auf 0 geklemmt', () => {
  const state = createLoadingState();
  updateProgress(state, -10);
  assert.equal(state.progress, 0);
});

test('updateProgress: Werte ueber 100 werden auf 100 geklemmt', () => {
  const state = createLoadingState();
  updateProgress(state, 150);
  assert.equal(state.progress, 100);
  assert.equal(state.complete, true);
});

test('updateProgress: Progress kann nur steigen, nicht fallen', () => {
  const state = createLoadingState();
  updateProgress(state, 60);
  updateProgress(state, 30);
  assert.equal(state.progress, 60, 'Progress darf nicht zurueckgehen');
});

/* ---------- getProgress ---------- */

test('getProgress: gibt aktuellen Progress-Wert zurueck', () => {
  const state = createLoadingState();
  updateProgress(state, 42);
  assert.equal(getProgress(state), 42);
});

/* ---------- isComplete ---------- */

test('isComplete: false bei < 100%', () => {
  const state = createLoadingState();
  updateProgress(state, 99);
  assert.equal(isComplete(state), false);
});

test('isComplete: true bei 100%', () => {
  const state = createLoadingState();
  updateProgress(state, 100);
  assert.equal(isComplete(state), true);
});

/* ---------- getElapsed ---------- */

test('getElapsed: gibt Millisekunden seit Start zurueck', () => {
  const state = createLoadingState();
  const elapsed = getElapsed(state);
  assert.ok(elapsed >= 0);
  assert.ok(elapsed < 1000, 'sollte sehr klein sein direkt nach Erzeugung');
});

/* ---------- shouldDismiss ---------- */

test('shouldDismiss: false wenn Progress < 100%', () => {
  const state = createLoadingState();
  assert.equal(shouldDismiss(state), false);
});

test('shouldDismiss: false wenn 100% aber minDisplayTime nicht erreicht', () => {
  const state = createLoadingState({ minDisplayMs: 100000 });
  updateProgress(state, 100);
  assert.equal(shouldDismiss(state), false);
});

test('shouldDismiss: true wenn 100% und minDisplayTime erreicht', () => {
  const state = createLoadingState({ minDisplayMs: 0 });
  updateProgress(state, 100);
  assert.equal(shouldDismiss(state), true);
});

/* ---------- setMinDisplayTime ---------- */

test('setMinDisplayTime: aendert minDisplayMs', () => {
  const state = createLoadingState();
  setMinDisplayTime(state, 2000);
  assert.equal(state.minDisplayMs, 2000);
});

/* ---------- canDismiss ---------- */

test('canDismiss: false wenn nicht complete', () => {
  const state = createLoadingState({ minDisplayMs: 0 });
  assert.equal(canDismiss(state), false);
});

test('canDismiss: false wenn complete aber minDisplay nicht erreicht', () => {
  const state = createLoadingState({ minDisplayMs: 100000 });
  updateProgress(state, 100);
  assert.equal(canDismiss(state), false);
});

test('canDismiss: true wenn complete und minDisplay erreicht', () => {
  const state = createLoadingState({ minDisplayMs: 0 });
  updateProgress(state, 100);
  assert.equal(canDismiss(state), true);
});

/* ---------- Edge Cases ---------- */

test('updateProgress: 0% aendert complete nicht auf true', () => {
  const state = createLoadingState();
  updateProgress(state, 0);
  assert.equal(state.complete, false);
});

test('createLoadingState: mehrere States sind unabhaengig', () => {
  const s1 = createLoadingState();
  const s2 = createLoadingState();
  updateProgress(s1, 50);
  assert.equal(s2.progress, 0, 's2 darf nicht von s1 beeinflusst werden');
});