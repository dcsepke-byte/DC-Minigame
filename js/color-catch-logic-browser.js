/**
 * Color Catch — Spiellogik (Browser-Kompatibel, IIFE)
 *
 * Gleiche Logik wie color-catch-logic.js (ESM),
 * aber als IIFE fuer <script>-Tag ohne Module-Loader.
 */
(function () {
  'use strict';

  var _nextId = 1;

  function createColorCatchState(opts) {
    opts = opts || {};
    var colors = opts.colors || ['#ff0', '#0ff', '#f0f'];
    var stageWidth = opts.stageWidth != null ? opts.stageWidth : 300;
    var basketWidth = opts.basketWidth != null ? opts.basketWidth : 90;
    var basketYOffset = opts.basketYOffset != null ? opts.basketYOffset : 60;
    return {
      objects: [],
      score: 0,
      combo: 0,
      bestCombo: 0,
      missed: 0,
      maxMissed: opts.maxMissed != null ? opts.maxMissed : 5,
      gameOver: false,
      colors: colors,
      playerColor: colors[0],
      stageWidth: stageWidth,
      stageHeight: opts.stageHeight != null ? opts.stageHeight : 600,
      basket: {
        x: Math.max(0, (stageWidth - basketWidth) / 2),
        width: basketWidth,
        yOffset: basketYOffset,
      },
    };
  }

  function setPlayerColor(state, idx) {
    if (idx >= 0 && idx < state.colors.length) {
      state.playerColor = state.colors[idx];
    }
  }

  function spawnObject(state, x, y, colorIdx) {
    var color = state.colors[colorIdx % state.colors.length];
    var obj = {
      id: _nextId++,
      x: x,
      y: y,
      color: color,
      colorIdx: colorIdx,
      radius: 24,
      speed: 0.18,
      wobble: Math.random() * Math.PI * 2,
    };
    state.objects.push(obj);
    return obj;
  }

  function moveBasket(state, x) {
    state.basket.x = Math.max(0, Math.min(state.stageWidth - state.basket.width, x));
  }

  function computeCatchScore(combo) {
    if (combo <= 0) return 0;
    return Math.min(60, 10 + (combo - 1) * 3);
  }

  function computeComboBonus(combo) {
    if (combo <= 1) return 0;
    return (combo - 1) * 4;
  }

  function isInBasketX(obj, basket) {
    return obj.x >= basket.x && obj.x <= basket.x + basket.width;
  }

  function tickObjects(state, dt, stageH, basketY) {
    var events = [];
    if (state.gameOver) return events;
    var survivors = [];
    for (var i = 0; i < state.objects.length; i++) {
      var o = state.objects[i];
      o.y += o.speed * dt;
      o.wobble += dt * 0.003;
      if (o.y >= basketY && isInBasketX(o, state.basket)) {
        events.push({ type: 'caught', object: o });
        if (o.color === state.playerColor) {
          state.combo++;
          if (state.combo > state.bestCombo) state.bestCombo = state.combo;
          var pts = computeCatchScore(state.combo);
          state.score += pts;
        } else {
          state.combo = 0;
          state.missed++;
          if (state.missed >= state.maxMissed) state.gameOver = true;
        }
        continue;
      }
      if (o.y - o.radius > stageH) {
        events.push({ type: 'escaped', object: o });
        if (o.color === state.playerColor) {
          state.combo = 0;
          state.missed++;
          if (state.missed >= state.maxMissed) state.gameOver = true;
        }
        continue;
      }
      survivors.push(o);
    }
    state.objects = survivors;
    return events;
  }

  function getActiveObjects(state) { return state.objects; }
  function isGameOver(state) { return state.gameOver; }
  function getMissedCount(state) { return state.missed; }
  function getScore(state) { return state.score; }
  function getCombo(state) { return state.combo; }
  function getBestCombo(state) { return state.bestCombo; }

  window.ColorCatchLogic = {
    createColorCatchState: createColorCatchState,
    setPlayerColor: setPlayerColor,
    spawnObject: spawnObject,
    moveBasket: moveBasket,
    tickObjects: tickObjects,
    getActiveObjects: getActiveObjects,
    isGameOver: isGameOver,
    getMissedCount: getMissedCount,
    getScore: getScore,
    getCombo: getCombo,
    getBestCombo: getBestCombo,
    computeCatchScore: computeCatchScore,
    computeComboBonus: computeComboBonus,
  };
})();