/**
 * Bubble Pop — Spiellogik (Browser-Kompatibel, IIFE)
 *
 * Gleiche Logik wie bubble-pop-logic.js (ESM),
 * aber als IIFE fuer <script>-Tag ohne Module-Loader.
 */
(function () {
  'use strict';

  var _nextId = 1;

  function createBubbleState(opts) {
    opts = opts || {};
    var colors = opts.colors || ['#ff0', '#0ff', '#f0f'];
    return {
      bubbles: [],
      score: 0,
      combo: 0,
      bestCombo: 0,
      missed: 0,
      maxMissed: opts.maxMissed || 5,
      gameOver: false,
      colors: colors,
      playerColor: colors[0],
    };
  }

  function setPlayerColor(state, idx) {
    if (idx >= 0 && idx < state.colors.length) {
      state.playerColor = state.colors[idx];
    }
  }

  function spawnBubble(state, x, y, colorIdx) {
    var color = state.colors[colorIdx % state.colors.length];
    var bubble = {
      id: _nextId++,
      x: x,
      y: y,
      color: color,
      radius: 26,
      speed: 0.04,
      wobble: Math.random() * Math.PI * 2,
      colorIdx: colorIdx,
    };
    state.bubbles.push(bubble);
    return bubble;
  }

  function popBubble(state, bubbleId) {
    if (state.gameOver) return { correct: false, score: 0, combo: 0, chainBonus: 0, missed: false };
    var idx = -1;
    for (var i = 0; i < state.bubbles.length; i++) {
      if (state.bubbles[i].id === bubbleId) { idx = i; break; }
    }
    if (idx === -1) return { correct: false, score: 0, combo: 0, chainBonus: 0, missed: false };

    var bubble = state.bubbles[idx];
    state.bubbles.splice(idx, 1);

    if (bubble.color === state.playerColor) {
      state.combo++;
      if (state.combo > state.bestCombo) state.bestCombo = state.combo;
      var pts = computeScore(state.combo);
      state.score += pts;
      return { correct: true, score: pts, combo: state.combo, chainBonus: 0, missed: false };
    }
    state.combo = 0;
    state.missed++;
    if (state.missed >= state.maxMissed) state.gameOver = true;
    return { correct: false, score: 0, combo: 0, chainBonus: 0, missed: true };
  }

  function computeScore(combo) {
    if (combo <= 0) return 0;
    return Math.min(50, 10 + (combo - 1) * 2);
  }

  function computeChainBonus(chainLength) {
    if (chainLength <= 1) return 0;
    return (chainLength - 1) * 5;
  }

  function tickBubbles(state, dt, stageH) {
    var events = [];
    if (state.gameOver) return events;
    var survivors = [];
    for (var i = 0; i < state.bubbles.length; i++) {
      var b = state.bubbles[i];
      b.y -= b.speed * dt;
      b.wobble += dt * 0.003;
      if (b.y + b.radius < 0) {
        events.push({ type: 'escaped', bubble: b });
        if (b.color === state.playerColor) {
          state.missed++;
          state.combo = 0;
          if (state.missed >= state.maxMissed) state.gameOver = true;
        }
      } else {
        survivors.push(b);
      }
    }
    state.bubbles = survivors;
    return events;
  }

  function getActiveBubbles(state) { return state.bubbles; }
  function isGameOver(state) { return state.gameOver; }
  function getMissedCount(state) { return state.missed; }

  window.BubblePopLogic = {
    createBubbleState: createBubbleState,
    setPlayerColor: setPlayerColor,
    spawnBubble: spawnBubble,
    popBubble: popBubble,
    computeScore: computeScore,
    computeChainBonus: computeChainBonus,
    tickBubbles: tickBubbles,
    getActiveBubbles: getActiveBubbles,
    isGameOver: isGameOver,
    getMissedCount: getMissedCount,
  };
})();