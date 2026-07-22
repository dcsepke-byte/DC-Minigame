/**
 * Rhythm Tap — Spiellogik (Browser-Kompatibel, IIFE)
 *
 * Gleiche Logik wie rhythm-tap-logic.js (ESM),
 * aber als IIFE fuer <script>-Tag ohne Module-Loader.
 */
(function () {
  'use strict';

  var PERFECT_WINDOW = 30;
  var GOOD_WINDOW = 80;
  var MISS_WINDOW = 120;

  function generateBeats(bpm, count, offset) {
    offset = offset || 0;
    var interval = 60000 / bpm;
    var beats = [];
    for (var i = 0; i < count; i++) {
      beats.push(offset + i * interval);
    }
    return beats;
  }

  function createRhythmState(opts) {
    opts = opts || {};
    var bpm = opts.bpm != null ? opts.bpm : 120;
    var beatCount = opts.beatCount != null ? opts.beatCount : 20;
    var offset = opts.offset != null ? opts.offset : 0;
    return {
      beats: generateBeats(bpm, beatCount, offset),
      score: 0,
      combo: 0,
      maxCombo: 0,
      misses: 0,
      maxMisses: opts.maxMisses != null ? opts.maxMisses : 5,
      beatIndex: 0,
      gameOver: false,
      bpm: bpm,
    };
  }

  function getTimingWindow(tapTime, beatTime) {
    var diff = tapTime - beatTime;
    if (Math.abs(diff) <= PERFECT_WINDOW) return 'perfect';
    if (Math.abs(diff) <= GOOD_WINDOW) return 'good';
    if (diff < 0) return 'early';
    return 'late';
  }

  function getComboMultiplier(combo) {
    if (combo >= 20) return 4;
    if (combo >= 10) return 3;
    if (combo >= 5) return 2;
    return 1;
  }

  function judgeTap(state, tapTime) {
    if (state.gameOver || state.beatIndex >= state.beats.length) {
      return { timing: 'late', points: 0, combo: 0 };
    }

    var beatTime = state.beats[state.beatIndex];
    var timing = getTimingWindow(tapTime, beatTime);

    if (timing === 'early') {
      state.combo = 0;
      return { timing: timing, points: 0, combo: 0 };
    }

    if (timing === 'late') {
      state.combo = 0;
      state.misses++;
      state.beatIndex++;
      if (state.misses >= state.maxMisses) {
        state.gameOver = true;
      }
      return { timing: timing, points: 0, combo: 0 };
    }

    var basePoints = timing === 'perfect' ? 100 : 50;
    var newCombo = state.combo + 1;
    state.combo = newCombo;
    if (newCombo > state.maxCombo) state.maxCombo = newCombo;
    var multiplier = getComboMultiplier(newCombo);
    var points = basePoints * multiplier;
    state.score += points;
    state.beatIndex++;

    return { timing: timing, points: points, combo: newCombo };
  }

  function checkMissedBeats(state, currentTime) {
    if (state.gameOver) return 0;
    var missed = 0;
    while (state.beatIndex < state.beats.length) {
      var beatTime = state.beats[state.beatIndex];
      if (currentTime > beatTime + MISS_WINDOW) {
        state.misses++;
        state.combo = 0;
        state.beatIndex++;
        missed++;
        if (state.misses >= state.maxMisses) {
          state.gameOver = true;
          break;
        }
      } else {
        break;
      }
    }
    return missed;
  }

  function isGameOver(state) {
    return state.gameOver;
  }

  function getMaxCombo(state) {
    return state.maxCombo;
  }

  /* ---------- Export ---------- */
  window.RhythmTapLogic = {
    generateBeats: generateBeats,
    createRhythmState: createRhythmState,
    getTimingWindow: getTimingWindow,
    getComboMultiplier: getComboMultiplier,
    judgeTap: judgeTap,
    checkMissedBeats: checkMissedBeats,
    isGameOver: isGameOver,
    getMaxCombo: getMaxCombo,
  };
})();