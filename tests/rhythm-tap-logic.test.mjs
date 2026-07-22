/**
 * Rhythm Tap — Logik-Tests (TDD)
 *
 * Testet die reine Spiellogik ohne Browser-Abhaengigkeiten.
 * Node 22 built-in test runner: node --test tests/
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createRhythmState,
  generateBeats,
  getTimingWindow,
  getComboMultiplier,
  judgeTap,
  checkMissedBeats,
  isGameOver,
  getMaxCombo,
} from '../js/rhythm-tap-logic.js';

/* ---------- createRhythmState ---------- */

test('createRhythmState: Startzustand mit Score 0, Combo 0, nicht Game Over', () => {
  const state = createRhythmState({ bpm: 120, beatCount: 20 });
  assert.equal(state.score, 0);
  assert.equal(state.combo, 0);
  assert.equal(state.maxCombo, 0);
  assert.equal(state.misses, 0);
  assert.equal(state.gameOver, false);
  assert.equal(state.beatIndex, 0);
  assert.equal(state.beats.length, 20);
  assert.ok(state.beats[0] >= 0, 'erster Beat sollte >= 0 sein');
});

test('createRhythmState: Beats im korrekten Abstand basierend auf BPM', () => {
  const state = createRhythmState({ bpm: 120, beatCount: 5 });
  // 120 BPM = 500ms pro Beat
  const interval = 60000 / 120;
  for (let i = 1; i < state.beats.length; i++) {
    assert.equal(state.beats[i] - state.beats[i - 1], interval);
  }
});

/* ---------- generateBeats ---------- */

test('generateBeats: erzeugt richtige Anzahl Beats im richtigen Abstand', () => {
  const beats = generateBeats(60, 10, 1000); // 60 BPM, 10 Beats, 1s Offset
  assert.equal(beats.length, 10);
  assert.equal(beats[0], 1000);
  assert.equal(beats[1], 2000);
  assert.equal(beats[9], 10000);
});

test('generateBeats: mit Offset 0 startet bei 0', () => {
  const beats = generateBeats(120, 3, 0);
  assert.equal(beats[0], 0);
  assert.equal(beats[1], 500);
  assert.equal(beats[2], 1000);
});

/* ---------- getTimingWindow ---------- */

test('getTimingWindow: exakt getroffen → perfect', () => {
  assert.equal(getTimingWindow(1000, 1000), 'perfect');
});

test('getTimingWindow: knapp daneben → good', () => {
  // within +/- 80ms but not within +/- 30ms
  assert.equal(getTimingWindow(1040, 1000), 'good');
  assert.equal(getTimingWindow(960, 1000), 'good');
});

test('getTimingWindow: zu frueh ausserhalb Fenster → early', () => {
  assert.equal(getTimingWindow(900, 1000), 'early');
});

test('getTimingWindow: zu spaet ausserhalb Fenster → late', () => {
  assert.equal(getTimingWindow(1100, 1000), 'late');
});

/* ---------- getComboMultiplier ---------- */

test('getComboMultiplier: 0 Combo → 1x', () => {
  assert.equal(getComboMultiplier(0), 1);
});

test('getComboMultiplier: 1-4 Combo → 1x', () => {
  assert.equal(getComboMultiplier(1), 1);
  assert.equal(getComboMultiplier(3), 1);
  assert.equal(getComboMultiplier(4), 1);
});

test('getComboMultiplier: 5-9 Combo → 2x', () => {
  assert.equal(getComboMultiplier(5), 2);
  assert.equal(getComboMultiplier(9), 2);
});

test('getComboMultiplier: 10-19 Combo → 3x', () => {
  assert.equal(getComboMultiplier(10), 3);
  assert.equal(getComboMultiplier(19), 3);
});

test('getComboMultiplier: 20+ Combo → 4x', () => {
  assert.equal(getComboMultiplier(20), 4);
  assert.equal(getComboMultiplier(50), 4);
});

/* ---------- judgeTap ---------- */

test('judgeTap: perfect Tap gibt 100 Punkte Basis', () => {
  const state = createRhythmState({ bpm: 120, beatCount: 10 });
  const result = judgeTap(state, state.beats[0]);
  assert.equal(result.timing, 'perfect');
  assert.equal(result.points, 100);
  assert.equal(result.combo, 1);
  assert.equal(state.score, 100);
  assert.equal(state.combo, 1);
  assert.equal(state.beatIndex, 1);
});

test('judgeTap: good Tap gibt 50 Punkte Basis', () => {
  const state = createRhythmState({ bpm: 120, beatCount: 10 });
  const result = judgeTap(state, state.beats[0] + 40);
  assert.equal(result.timing, 'good');
  assert.equal(result.points, 50);
  assert.equal(result.combo, 1);
  assert.equal(state.score, 50);
});

test('judgeTap: Combo erhoeht Multiplikator', () => {
  const state = createRhythmState({ bpm: 120, beatCount: 20 });
  // 5 perfekte Taps → 5 Combo → 2x Multiplikator
  for (let i = 0; i < 5; i++) {
    judgeTap(state, state.beats[i]);
  }
  assert.equal(state.combo, 5);
  // 6. Tap: combo=6 → 2x Multiplikator: 100 * 2 = 200
  const result = judgeTap(state, state.beats[5]);
  assert.equal(result.points, 200);
  // 4 Taps mit 1x (100 each) + 2 Taps mit 2x (200 each) = 400 + 400 = 800
  assert.equal(state.score, 800);
});

test('judgeTap: early Tap bricht Combo und gibt 0 Punkte', () => {
  const state = createRhythmState({ bpm: 120, beatCount: 10 });
  // Ersten 3 perfect
  for (let i = 0; i < 3; i++) {
    judgeTap(state, state.beats[i]);
  }
  assert.equal(state.combo, 3);
  // 4. Tap zu frueh
  const result = judgeTap(state, state.beats[3] - 200);
  assert.equal(result.timing, 'early');
  assert.equal(result.points, 0);
  assert.equal(state.combo, 0);
  // beatIndex nicht erhoeht bei early (Spieler kann es noch versuchen)
  assert.equal(state.beatIndex, 3);
});

test('judgeTap: late Tap zaehlt als Miss, bricht Combo', () => {
  const state = createRhythmState({ bpm: 120, beatCount: 10 });
  judgeTap(state, state.beats[0]);
  judgeTap(state, state.beats[1]);
  assert.equal(state.combo, 2);
  // 3. Tap zu spaet
  const result = judgeTap(state, state.beats[2] + 200);
  assert.equal(result.timing, 'late');
  assert.equal(result.points, 0);
  assert.equal(state.combo, 0);
  assert.equal(state.misses, 1);
  assert.equal(state.beatIndex, 3);
});

test('judgeTap: Game Over nach maxMisses', () => {
  const state = createRhythmState({ bpm: 120, beatCount: 20, maxMisses: 3 });
  // 3 late Taps
  for (let i = 0; i < 3; i++) {
    judgeTap(state, state.beats[i] + 200);
  }
  assert.equal(state.misses, 3);
  assert.equal(state.gameOver, true);
});

test('judgeTap: nach Game Over keine weitere Eingabe', () => {
  const state = createRhythmState({ bpm: 120, beatCount: 20, maxMisses: 1 });
  judgeTap(state, state.beats[0] + 200);
  assert.equal(state.gameOver, true);
  const result = judgeTap(state, state.beats[1]);
  assert.equal(result.points, 0);
  assert.equal(state.beatIndex, 1); // nicht veraendert
});

test('judgeTap: maxCombo wird getrackt', () => {
  const state = createRhythmState({ bpm: 120, beatCount: 20 });
  for (let i = 0; i < 7; i++) {
    judgeTap(state, state.beats[i]);
  }
  assert.equal(state.maxCombo, 7);
  // Combo break
  judgeTap(state, state.beats[7] + 200);
  assert.equal(state.maxCombo, 7); // bleibt bei 7
  assert.equal(state.combo, 0);
});

/* ---------- checkMissedBeats ---------- */

test('checkMissedBeats: Beat wird als Miss gezaehlt wenn Zeit abgelaufen', () => {
  const state = createRhythmState({ bpm: 120, beatCount: 10 });
  // Beat 0 bei t=0, Miss-Fenster z.B. 120ms → bei t=200 ist Beat 0 verpasst
  const missed = checkMissedBeats(state, 200);
  assert.equal(missed, 1);
  assert.equal(state.misses, 1);
  assert.equal(state.combo, 0);
  assert.equal(state.beatIndex, 1);
});

test('checkMissedBeats: mehrere verpasste Beats werden gezaehlt', () => {
  const state = createRhythmState({ bpm: 120, beatCount: 10 });
  // Bei t=900 sind Beats 0 (0ms) und 1 (500ms) verpasst, Beat 2 (1000ms) noch nicht
  const missed = checkMissedBeats(state, 900);
  assert.equal(missed, 2);
  assert.equal(state.misses, 2);
  assert.equal(state.beatIndex, 2);
});

test('checkMissedBeats: kein Miss wenn Beat noch im Fenster', () => {
  const state = createRhythmState({ bpm: 120, beatCount: 10 });
  const missed = checkMissedBeats(state, 80); // Beat 0 bei 0ms, Fenster 120ms
  assert.equal(missed, 0);
  assert.equal(state.misses, 0);
});

test('checkMissedBeats: Game Over nach zu vielen verpassten Beats', () => {
  const state = createRhythmState({ bpm: 120, beatCount: 20, maxMisses: 2 });
  // Bei t=1200 sind 2 Beats verpasst
  checkMissedBeats(state, 1200);
  assert.equal(state.misses, 2);
  assert.equal(state.gameOver, true);
});

/* ---------- isGameOver ---------- */

test('isGameOver: false zu Beginn', () => {
  const state = createRhythmState({ bpm: 120, beatCount: 10 });
  assert.equal(isGameOver(state), false);
});

test('isGameOver: true nach maxMisses', () => {
  const state = createRhythmState({ bpm: 120, beatCount: 10, maxMisses: 1 });
  judgeTap(state, state.beats[0] + 200);
  assert.equal(isGameOver(state), true);
});

/* ---------- getMaxCombo ---------- */

test('getMaxCombo: gibt maxCombo zurueck', () => {
  const state = createRhythmState({ bpm: 120, beatCount: 20 });
  for (let i = 0; i < 5; i++) {
    judgeTap(state, state.beats[i]);
  }
  assert.equal(getMaxCombo(state), 5);
});

/* ---------- Edge Cases ---------- */

test('judgeTap: alle Beats perfekt gespielt → hohe Score', () => {
  const state = createRhythmState({ bpm: 120, beatCount: 10 });
  for (let i = 0; i < 10; i++) {
    judgeTap(state, state.beats[i]);
  }
  assert.equal(state.beatIndex, 10);
  assert.equal(state.misses, 0);
  assert.equal(state.gameOver, false);
  assert.equal(state.maxCombo, 10);
  // 4 * 100 + 5 * 200 + 1 * 300 = 400 + 1000 + 300 = 1700
  assert.equal(state.score, 1700);
});

test('judgeTap: alle Beats vorbei ohne Eingabe via checkMissedBeats', () => {
  const state = createRhythmState({ bpm: 120, beatCount: 5, maxMisses: 10 });
  // Alle 5 Beats verpasst bei t=3000
  const missed = checkMissedBeats(state, 3000);
  assert.equal(missed, 5);
  assert.equal(state.beatIndex, 5);
  assert.equal(state.misses, 5);
  assert.equal(state.gameOver, false); // maxMisses = 10
});