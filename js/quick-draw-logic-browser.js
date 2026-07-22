/**
 * Quick Draw Duel — Spiellogik (Browser-Kompatibel, IIFE)
 *
 * Gleiche Logik wie quick-draw-logic.js (ESM),
 * aber als IIFE fuer <script>-Tag ohne Module-Loader.
 */
(function () {
  'use strict';

  function createQuickDrawState(opts) {
    opts = opts || {};
    return {
      round: 0,
      score: 0,
      misses: 0,
      fouls: 0,
      maxRounds: opts.maxRounds != null ? opts.maxRounds : 3,
      phase: 'waiting',
      signalTime: 0,
      reactionTime: 0,
      gameOver: false,
    };
  }

  function getRound(state) { return state.round; }
  function getScore(state) { return state.score; }
  function getMisses(state) { return state.misses; }
  function getFouls(state) { return state.fouls; }
  function getPhase(state) { return state.phase; }
  function getSignalTime(state) { return state.signalTime; }
  function getReactionTime(state) { return state.reactionTime; }
  function getMaxRounds(state) { return state.maxRounds; }
  function isGameOver(state) { return state.gameOver; }

  function startRound(state) {
    if (state.gameOver) return;
    state.round++;
    state.phase = 'ready';
    state.signalTime = 0;
    state.reactionTime = 0;
  }

  function fireSignal(state, now) {
    if (state.phase !== 'ready') {
      if (state.phase === 'waiting') throw new Error('startRound first');
      return;
    }
    state.phase = 'fire';
    state.signalTime = now;
  }

  function playerTap(state, now) {
    if (state.phase === 'waiting' || state.phase === 'done' || state.phase === 'foul') return;

    if (state.phase === 'ready') {
      state.fouls++;
      state.score += 0;
      state.phase = 'foul';
      _checkGameOver(state);
      return;
    }

    if (state.phase === 'fire') {
      var reaction = now - state.signalTime;
      state.reactionTime = reaction;
      if (reaction > 2000) {
        state.misses++;
      }
      state.score += computeReactionScore(reaction);
      state.phase = 'done';
      _checkGameOver(state);
    }
  }

  function isRoundOver(state) {
    return state.phase === 'done' || state.phase === 'foul';
  }

  function computeReactionScore(ms) {
    if (ms <= 0) return 0;
    var score = Math.max(10, Math.round(1000 - ms / 3));
    return score;
  }

  function _checkGameOver(state) {
    if (state.round >= state.maxRounds && (state.phase === 'done' || state.phase === 'foul')) {
      state.gameOver = true;
    }
  }

  window.QuickDrawLogic = {
    createQuickDrawState: createQuickDrawState,
    startRound: startRound,
    fireSignal: fireSignal,
    playerTap: playerTap,
    computeReactionScore: computeReactionScore,
    isRoundOver: isRoundOver,
    isGameOver: isGameOver,
    getRound: getRound,
    getScore: getScore,
    getMisses: getMisses,
    getFouls: getFouls,
    getPhase: getPhase,
    getSignalTime: getSignalTime,
    getReactionTime: getReactionTime,
    getMaxRounds: getMaxRounds,
  };
})();