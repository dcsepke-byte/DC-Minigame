/**
 * Minigame Contract — Tests (TDD)
 *
 * Testet den Minispiel-Vertrag (arch-1): klarer Lebenszyklus
 *   start -> countdown -> gameplay -> timer -> winner -> reward -> exit
 *
 * Reine Logik ohne Browser-Abhaengigkeiten.
 * Node 22 built-in test runner: node --test tests/minigame-contract.test.mjs
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  MINIGAME_PHASES,
  createMinigameSession,
  validateMinigame,
} from '../js/minigame-contract.js';

/* ---------- Lebenszyklus-Phasen ---------- */

test('MINIGAME_PHASES: definiert den vollen Lebenszyklus in Reihenfolge', () => {
  assert.deepEqual(MINIGAME_PHASES, [
    'start', 'countdown', 'gameplay', 'timer', 'winner', 'reward', 'exit',
  ]);
});

/* ---------- createMinigameSession: State-Machine ---------- */

test('Session startet in Phase start', () => {
  const s = createMinigameSession();
  assert.equal(s.phase(), 'start');
  assert.equal(s.isFinished(), false);
});

test('transition: erlaubte Uebergaenge folgen dem Lebenszyklus', () => {
  const s = createMinigameSession();
  s.transition('countdown');
  assert.equal(s.phase(), 'countdown');
  s.transition('gameplay');
  assert.equal(s.phase(), 'gameplay');
  s.transition('timer');
  assert.equal(s.phase(), 'timer');
  s.transition('winner');
  assert.equal(s.phase(), 'winner');
  s.transition('reward');
  assert.equal(s.phase(), 'reward');
  s.transition('exit');
  assert.equal(s.phase(), 'exit');
  assert.equal(s.isFinished(), true);
});

test('transition: Rueckschritt wird abgelehnt', () => {
  const s = createMinigameSession();
  s.transition('countdown');
  assert.throws(() => s.transition('start'), /ungueltig|invalid/i);
});

test('transition: Sprung ueber Phasen wird abgelehnt (start -> gameplay)', () => {
  const s = createMinigameSession();
  assert.throws(() => s.transition('gameplay'), /ungueltig|invalid/i);
});

test('transition: unbekannte Phase wird abgelehnt', () => {
  const s = createMinigameSession();
  assert.throws(() => s.transition('nonsense'), /unbekannt|unknown/i);
});

test('transition: nach exit ist keine weitere Phase moeglich', () => {
  const s = createMinigameSession();
  for (const p of MINIGAME_PHASES.slice(1)) s.transition(p);
  assert.throws(() => s.transition('start'), /beendet|finished/i);
});

/* ---------- finish / setScore ---------- */

test('finish: setzt Score und geht zu winner', () => {
  const s = createMinigameSession();
  s.transition('countdown');
  s.transition('gameplay');
  s.finish(42);
  assert.equal(s.phase(), 'winner');
  assert.equal(s.score(), 42);
});

test('finish: vor gameplay wird abgelehnt (kein Score ohne Spiel)', () => {
  const s = createMinigameSession();
  assert.throws(() => s.finish(10), /gameplay/i);
});

test('finish: doppelter Aufruf wird abgelehnt', () => {
  const s = createMinigameSession();
  s.transition('countdown');
  s.transition('gameplay');
  s.finish(5);
  assert.throws(() => s.finish(9), /winner|beendet/i);
});

test('setScore: aktualisiert den aktuellen Score waehrend gameplay', () => {
  const s = createMinigameSession();
  s.transition('countdown');
  s.transition('gameplay');
  s.setScore(7);
  s.setScore(13);
  assert.equal(s.score(), 13);
});

test('setScore: ausserhalb gameplay wird abgelehnt', () => {
  const s = createMinigameSession();
  assert.throws(() => s.setScore(3), /gameplay/i);
});

/* ---------- validateMinigame: Vertrag fuer Spiel-Module ---------- */

test('validateMinigame: gueltiges Spiel mit play() besteht', () => {
  const game = { id: 'demo', name: 'Demo', play() {} };
  assert.equal(validateMinigame(game), true);
});

test('validateMinigame: Spiel ohne play() wird abgelehnt', () => {
  const game = { id: 'demo', name: 'Demo' };
  assert.equal(validateMinigame(game), false);
});

test('validateMinigame: Spiel ohne id wird abgelehnt', () => {
  const game = { name: 'Demo', play() {} };
  assert.equal(validateMinigame(game), false);
});

test('validateMinigame: null/undefined wird abgelehnt', () => {
  assert.equal(validateMinigame(null), false);
  assert.equal(validateMinigame(undefined), false);
});
