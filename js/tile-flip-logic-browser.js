/**
 * Tile Flip — Spiellogik (Browser-Kompatibel, IIFE)
 *
 * Gleiche Logik wie tile-flip-logic.js (ESM),
 * aber als IIFE fuer <script>-Tag ohne Module-Loader.
 */
(function () {
  'use strict';

  var PEEK_DURATION = 2000;
  var FREEZE_DURATION = 5000;
  var BASE_POINTS = 100;
  var TIME_BONUS_PER_SEC = 10;

  function mulberry32(seed) {
    var a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function createTileFlipState(opts) {
    opts = opts || {};
    var rows = opts.rows != null ? opts.rows : 4;
    var cols = opts.cols != null ? opts.cols : 4;
    var total = rows * cols;
    if (total % 2 !== 0) {
      throw new Error('Grid muss gerade Anzahl Kacheln haben');
    }
    var totalPairs = total / 2;
    var seed = opts.seed != null ? opts.seed : Math.floor(Math.random() * 1e9);
    var rng = mulberry32(seed);

    var symbols = [];
    for (var i = 0; i < totalPairs; i++) {
      symbols.push(i, i);
    }
    for (var j = symbols.length - 1; j > 0; j--) {
      var k = Math.floor(rng() * (j + 1));
      var tmp = symbols[j]; symbols[j] = symbols[k]; symbols[k] = tmp;
    }

    var tiles = symbols.map(function (sym) {
      return { symbol: sym, flipped: false, matched: false };
    });

    return {
      rows: rows,
      cols: cols,
      tiles: tiles,
      pairsFound: 0,
      totalPairs: totalPairs,
      score: 0,
      combo: 0,
      missmatches: 0,
      flips: 0,
      gameOver: false,
      timeLimit: opts.timeLimit != null ? opts.timeLimit : 60000,
      boosters: new Set(['peek', 'shuffle', 'freeze']),
      peekUntil: 0,
      freezeUntil: 0,
      freezeStartTime: 0,
      _accumulatedFreeze: 0,
      _rng: rng,
    };
  }

  function getTile(state, index) {
    return state.tiles[index];
  }

  function countFlipped(state) {
    var n = 0;
    for (var i = 0; i < state.tiles.length; i++) {
      if (state.tiles[i].flipped && !state.tiles[i].matched) n++;
    }
    return n;
  }

  function flipTile(state, index) {
    var tile = state.tiles[index];
    if (!tile || tile.flipped || tile.matched) {
      return { flipped: false };
    }
    if (countFlipped(state) >= 2) {
      return { flipped: false };
    }
    tile.flipped = true;
    state.flips++;
    return { flipped: true };
  }

  function checkMatch(state) {
    var flipped = [];
    for (var i = 0; i < state.tiles.length; i++) {
      if (state.tiles[i].flipped && !state.tiles[i].matched) {
        flipped.push(i);
      }
    }
    if (flipped.length !== 2) return null;

    var i1 = flipped[0], i2 = flipped[1];
    var t1 = state.tiles[i1], t2 = state.tiles[i2];

    if (t1.symbol === t2.symbol) {
      t1.matched = true;
      t2.matched = true;
      t1.flipped = false;
      t2.flipped = false;
      state.pairsFound++;
      state.combo++;
      var points = BASE_POINTS * state.combo;
      state.score += points;
      if (state.pairsFound >= state.totalPairs) {
        state.gameOver = true;
      }
      return { matched: true, points: points };
    } else {
      t1.flipped = false;
      t2.flipped = false;
      state.missmatches++;
      state.combo = 0;
      return { matched: false, points: 0 };
    }
  }

  function isGameOver(state) {
    return state.gameOver || isComplete(state);
  }

  function isComplete(state) {
    return state.pairsFound >= state.totalPairs;
  }

  function shuffleUnmatched(state) {
    var unmatchedIndices = [];
    var unmatchedSymbols = [];
    for (var i = 0; i < state.tiles.length; i++) {
      if (!state.tiles[i].matched) {
        unmatchedIndices.push(i);
        unmatchedSymbols.push(state.tiles[i].symbol);
        state.tiles[i].flipped = false;
      }
    }
    for (var j = unmatchedSymbols.length - 1; j > 0; j--) {
      var k = Math.floor(state._rng() * (j + 1));
      var tmp = unmatchedSymbols[j]; unmatchedSymbols[j] = unmatchedSymbols[k]; unmatchedSymbols[k] = tmp;
    }
    for (var m = 0; m < unmatchedIndices.length; m++) {
      state.tiles[unmatchedIndices[m]].symbol = unmatchedSymbols[m];
    }
  }

  function useBooster(state, type, currentTime) {
    currentTime = currentTime || Date.now();
    if (!state.boosters.has(type)) return false;
    state.boosters.delete(type);

    if (type === 'peek') {
      state.peekUntil = currentTime + PEEK_DURATION;
    } else if (type === 'shuffle') {
      shuffleUnmatched(state);
    } else if (type === 'freeze') {
      state.freezeUntil = currentTime + FREEZE_DURATION;
      state.freezeStartTime = currentTime;
    }
    return true;
  }

  function isPeeking(state, currentTime) {
    return currentTime < state.peekUntil;
  }

  function isFrozen(state, currentTime) {
    return currentTime < state.freezeUntil;
  }

  function getTimeRemaining(state, currentTime, startTime) {
    startTime = startTime || 0;
    var elapsed = currentTime - startTime;
    var frozenTime = 0;
    if (state.freezeUntil > 0) {
      var freezeEnd = Math.min(state.freezeUntil, currentTime);
      var freezeStart = state.freezeStartTime;
      if (freezeEnd > freezeStart) {
        frozenTime = freezeEnd - freezeStart;
      }
    }
    var effectiveElapsed = Math.max(0, elapsed - frozenTime);
    return Math.max(0, state.timeLimit - effectiveElapsed);
  }

  function getFinalScore(state, timeUsed, startTime) {
    startTime = startTime || 0;
    var final = state.score;
    if (isComplete(state)) {
      var remaining = getTimeRemaining(state, timeUsed, startTime);
      var bonusSeconds = Math.floor(remaining / 1000);
      final += bonusSeconds * TIME_BONUS_PER_SEC;
    }
    return final;
  }

  /* ---------- Export ---------- */
  window.TileFlipLogic = {
    createTileFlipState: createTileFlipState,
    getTile: getTile,
    flipTile: flipTile,
    checkMatch: checkMatch,
    isGameOver: isGameOver,
    isComplete: isComplete,
    useBooster: useBooster,
    isPeeking: isPeeking,
    isFrozen: isFrozen,
    getTimeRemaining: getTimeRemaining,
    getFinalScore: getFinalScore,
  };
})();