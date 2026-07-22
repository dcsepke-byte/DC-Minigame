/**
 * Quick Draw Duel — Logik-Tests (TDD)
 *
 * Testet die reine Spiellogik ohne Browser-Abhaengigkeiten.
 * Node 22 built-in test runner: node --test tests/quick-draw-logic.test.mjs
 *
 * Konzept:
 *  - Western-Duell: Spannung baut auf (READY... STEADY... FIRE!)
 *  - Nach FIRE-Signal schnellstes Tippen = Punkte
 *  - Vor FIRE tippen = Foul (0 Punkte, Runde verloren)
 *  - Reaktionszeit -> Score (schneller = mehr Punkte)
 *  - Best-of-3 Runden
 *  - maxRounds gespielt -> Game Over
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createQuickDrawState,
  startRound,
  fireSignal,
  playerTap,
  computeReactionScore,
  isRoundOver,
  isGameOver,
  getRound,
  getScore,
  getMisses,
  getFouls,
  getPhase,
  getSignalTime,
  getReactionTime,
  getMaxRounds,
} from '../js/quick-draw-logic.js';

/* ---------- createQuickDrawState ---------- */

test('createQuickDrawState: Startzustand leer, Score 0, gameOver false', () => {
  const state = createQuickDrawState({ maxRounds: 3 });
  assert.equal(state.score, 0);
  assert.equal(state.gameOver, false);
  assert.equal(state.round, 0);
  assert.equal(state.maxRounds, 3);
  assert.equal(state.misses, 0);
  assert.equal(state.fouls, 0);
});

test('createQuickDrawState: Default maxRounds ist 3', () => {
  const state = createQuickDrawState({});
  assert.equal(state.maxRounds, 3);
});

test('createQuickDrawState: phase ist "waiting"', () => {
  const state = createQuickDrawState({});
  assert.equal(state.phase, 'waiting');
});

/* ---------- startRound ---------- */

test('startRound: erhoeht round um 1', () => {
  const state = createQuickDrawState({ maxRounds: 3 });
  startRound(state);
  assert.equal(state.round, 1);
});

test('startRound: setzt phase auf "ready"', () => {
  const state = createQuickDrawState({ maxRounds: 3 });
  startRound(state);
  assert.equal(state.phase, 'ready');
});

test('startRound: setzt signalTime auf 0 (noch nicht gesetzt)', () => {
  const state = createQuickDrawState({ maxRounds: 3 });
  startRound(state);
  assert.equal(state.signalTime, 0);
});

test('startRound: setzt reactionTime auf 0', () => {
  const state = createQuickDrawState({ maxRounds: 3 });
  startRound(state);
  assert.equal(state.reactionTime, 0);
});

/* ---------- fireSignal ---------- */

test('fireSignal: setzt phase auf "fire"', () => {
  const state = createQuickDrawState({ maxRounds: 3 });
  startRound(state);
  fireSignal(state, 1000);
  assert.equal(state.phase, 'fire');
});

test('fireSignal: speichert signalTime', () => {
  const state = createQuickDrawState({ maxRounds: 3 });
  startRound(state);
  fireSignal(state, 5000);
  assert.equal(state.signalTime, 5000);
});

test('fireSignal: vor startRound -> Fehler', () => {
  const state = createQuickDrawState({ maxRounds: 3 });
  assert.throws(() => fireSignal(state, 1000));
});

test('fireSignal: bereits im fire-phase -> Ignorieren (kein zweites Signal)', () => {
  const state = createQuickDrawState({ maxRounds: 3 });
  startRound(state);
  fireSignal(state, 1000);
  fireSignal(state, 2000);
  assert.equal(state.signalTime, 1000, 'signalTime sollte beim ersten bleiben');
});

/* ---------- playerTap ---------- */

test('playerTap: vor Fire-Signal = Foul, 0 Punkte, Runde verloren', () => {
  const state = createQuickDrawState({ maxRounds: 3 });
  startRound(state);
  playerTap(state, 500);
  assert.equal(state.fouls, 1);
  assert.equal(state.score, 0);
  assert.equal(state.phase, 'foul');
});

test('playerTap: nach Fire-Signal = Reaktion, Punkte', () => {
  const state = createQuickDrawState({ maxRounds: 3 });
  startRound(state);
  fireSignal(state, 1000);
  playerTap(state, 1300); // 300ms Reaktionszeit
  assert.equal(state.reactionTime, 300);
  assert.ok(state.score > 0, 'sollte Punkte fuer Reaktion geben');
  assert.equal(state.phase, 'done');
});

test('playerTap: nach Fire-Signal mit guter Zeit = mehr Punkte', () => {
  const s1 = createQuickDrawState({ maxRounds: 3 });
  startRound(s1);
  fireSignal(s1, 1000);
  playerTap(s1, 1150); // 150ms
  const s2 = createQuickDrawState({ maxRounds: 3 });
  startRound(s2);
  fireSignal(s2, 1000);
  playerTap(s2, 1400); // 400ms
  assert.ok(s1.score > s2.score, 'schneller sollte mehr Punkte geben');
});

test('playerTap: in done-phase -> Ignorieren (nicht doppelt tippen)', () => {
  const state = createQuickDrawState({ maxRounds: 3 });
  startRound(state);
  fireSignal(state, 1000);
  playerTap(state, 1200); // 200ms
  const scoreAfter = state.score;
  playerTap(state, 1300); // zweiter Tap -> ignoriert
  assert.equal(state.score, scoreAfter, 'Score sollte unveraendert bleiben');
});

test('playerTap: in foul-phase -> Ignorieren', () => {
  const state = createQuickDrawState({ maxRounds: 3 });
  startRound(state);
  playerTap(state, 500); // Foul
  const foulsAfter = state.fouls;
  playerTap(state, 600);
  assert.equal(state.fouls, foulsAfter, 'Fouls sollten unveraendert bleiben');
});

test('playerTap: in waiting-phase (vor startRound) -> Ignorieren', () => {
  const state = createQuickDrawState({ maxRounds: 3 });
  playerTap(state, 100);
  assert.equal(state.score, 0);
  assert.equal(state.fouls, 0);
});

/* ---------- isRoundOver / isGameOver ---------- */

test('isRoundOver: nach startRound (ready) = false', () => {
  const state = createQuickDrawState({ maxRounds: 3 });
  startRound(state);
  assert.equal(isRoundOver(state), false);
});

test('isRoundOver: nach Fire-Signal (fire) = false', () => {
  const state = createQuickDrawState({ maxRounds: 3 });
  startRound(state);
  fireSignal(state, 1000);
  assert.equal(isRoundOver(state), false);
});

test('isRoundOver: nach Tap (done) = true', () => {
  const state = createQuickDrawState({ maxRounds: 3 });
  startRound(state);
  fireSignal(state, 1000);
  playerTap(state, 1300);
  assert.equal(isRoundOver(state), true);
});

test('isRoundOver: nach Foul = true', () => {
  const state = createQuickDrawState({ maxRounds: 3 });
  startRound(state);
  playerTap(state, 500);
  assert.equal(isRoundOver(state), true);
});

test('isGameOver: nach maxRounds Runden = true', () => {
  const state = createQuickDrawState({ maxRounds: 2 });
  for (let i = 0; i < 2; i++) {
    startRound(state);
    fireSignal(state, 1000 + i * 1000);
    playerTap(state, 1200 + i * 1000);
    // isGameOver prueft nach Rundenende
  }
  assert.equal(isGameOver(state), true);
});

test('isGameOver: vor maxRounds = false', () => {
  const state = createQuickDrawState({ maxRounds: 3 });
  startRound(state);
  fireSignal(state, 1000);
  playerTap(state, 1200);
  assert.equal(isGameOver(state), false);
});

test('isGameOver: bei gameOver=true -> true (bleibt true)', () => {
  const state = createQuickDrawState({ maxRounds: 1 });
  startRound(state);
  fireSignal(state, 1000);
  playerTap(state, 1200);
  assert.equal(isGameOver(state), true);
});

/* ---------- computeReactionScore ---------- */

test('computeReactionScore: 0ms -> 0 Punkte', () => {
  assert.equal(computeReactionScore(0), 0);
});

test('computeReactionScore: negative Zeit -> 0 Punkte', () => {
  assert.equal(computeReactionScore(-100), 0);
});

test('computeReactionScore: schneller = mehr Punkte', () => {
  assert.ok(computeReactionScore(150) > computeReactionScore(300), '150ms > 300ms');
  assert.ok(computeReactionScore(300) > computeReactionScore(500), '300ms > 500ms');
});

test('computeReactionScore: sehr langsam (>2000ms) -> minimal Punkte', () => {
  assert.ok(computeReactionScore(2500) > 0, 'auch langsam sollte etwas geben');
  assert.ok(computeReactionScore(2500) < computeReactionScore(500), 'sollte weniger als 500ms sein');
});

test('computeReactionScore: maxScore bei sehr schneller Reaktion', () => {
  const fast = computeReactionScore(100);
  assert.ok(fast >= 900, '100ms sollte ~1000 Punkte geben');
});

/* ---------- Getter ---------- */

test('getRound: liefert aktuelle Runde', () => {
  const state = createQuickDrawState({ maxRounds: 3 });
  startRound(state);
  assert.equal(getRound(state), 1);
});

test('getScore: liefert kumulierten Score', () => {
  const state = createQuickDrawState({ maxRounds: 3 });
  startRound(state);
  fireSignal(state, 1000);
  playerTap(state, 1200); // 200ms
  assert.equal(getScore(state), state.score);
  assert.ok(getScore(state) > 0);
});

test('getFouls: liefert Anzahl Fouls', () => {
  const state = createQuickDrawState({ maxRounds: 3 });
  startRound(state);
  playerTap(state, 500); // Foul
  assert.equal(getFouls(state), 1);
});

test('getPhase: liefert aktuelle Phase', () => {
  const state = createQuickDrawState({ maxRounds: 3 });
  assert.equal(getPhase(state), 'waiting');
  startRound(state);
  assert.equal(getPhase(state), 'ready');
  fireSignal(state, 1000);
  assert.equal(getPhase(state), 'fire');
  playerTap(state, 1200);
  assert.equal(getPhase(state), 'done');
});

test('getSignalTime: liefert Zeit des Fire-Signals', () => {
  const state = createQuickDrawState({ maxRounds: 3 });
  startRound(state);
  fireSignal(state, 7777);
  assert.equal(getSignalTime(state), 7777);
});

test('getReactionTime: liefert Reaktionszeit', () => {
  const state = createQuickDrawState({ maxRounds: 3 });
  startRound(state);
  fireSignal(state, 1000);
  playerTap(state, 1350);
  assert.equal(getReactionTime(state), 350);
});

test('getMaxRounds: liefert maximale Runden', () => {
  const state = createQuickDrawState({ maxRounds: 5 });
  assert.equal(getMaxRounds(state), 5);
});

test('getMisses: Zaehler fuer zu langsame Reaktion (>2000ms)', () => {
  const state = createQuickDrawState({ maxRounds: 3 });
  startRound(state);
  fireSignal(state, 1000);
  playerTap(state, 3500); // 2500ms = zu langsam
  assert.equal(getMisses(state), 1);
});

test('playerTap: zu langsam (>2000ms) -> miss +1, wenig Punkte', () => {
  const state = createQuickDrawState({ maxRounds: 3 });
  startRound(state);
  fireSignal(state, 1000);
  playerTap(state, 3500); // 2500ms
  assert.equal(state.misses, 1);
  assert.equal(state.phase, 'done');
  assert.ok(state.score > 0, 'sollte trotzdem minimale Punkte geben');
});

test('playerTap: Reaktion genau 2000ms -> kein miss (Grenze)', () => {
  const state = createQuickDrawState({ maxRounds: 3 });
  startRound(state);
  fireSignal(state, 1000);
  playerTap(state, 3000); // 2000ms genau
  assert.equal(state.misses, 0, '2000ms genau ist kein miss');
});

/* ---------- Multi-Round Szenario ---------- */

test('Multi-Round: 3 Runden spielen, Score kumuliert', () => {
  const state = createQuickDrawState({ maxRounds: 3 });
  const times = [1200, 1150, 1300]; // Signal bei 1000, 2100, 3200
  const signals = [1000, 2100, 3200];
  for (let i = 0; i < 3; i++) {
    startRound(state);
    fireSignal(state, signals[i]);
    playerTap(state, times[i]);
  }
  assert.equal(state.round, 3);
  assert.ok(state.score > 0, 'kumulierter Score sollte positiv sein');
  assert.equal(isGameOver(state), true);
});