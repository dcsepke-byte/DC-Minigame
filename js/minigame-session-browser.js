/**
 * Minigame Session Adapter (Browser-Kompatibel, IIFE)
 *
 * Gleiche Logik wie minigame-session.js (ESM), aber als IIFE fuer
 * <script>-Tag ohne Module-Loader. Exportiert window.MinigameSession.
 *
 * Nutzung: bestehende games.js-Spiele auf den Minispiel-Vertrag bringen
 *   const game = MinigameSession.createSessionAdapter(g, hooks);
 */
(function () {
  'use strict';

  var PHASES = ['start', 'countdown', 'gameplay', 'timer', 'winner', 'reward', 'exit'];

  function createMinigameSession() {
    var current = 0;
    var score = 0;
    function phase() { return PHASES[current]; }
    function isFinished() { return phase() === 'exit'; }
    function transition(to) {
      if (isFinished()) throw new Error('Session bereits beendet (exit), kein Uebergang zu ' + to);
      var idx = PHASES.indexOf(to);
      if (idx === -1) throw new Error('Unbekannte Phase: ' + to);
      if (idx !== current + 1) throw new Error('Ungueltiger Uebergang: ' + phase() + ' -> ' + to);
      current = idx;
    }
    function setScore(n) {
      if (phase() !== 'gameplay') throw new Error('setScore nur waehrend gameplay erlaubt (aktuell: ' + phase() + ')');
      score = n;
    }
    function finish(finalScore) {
      if (phase() !== 'gameplay') throw new Error('finish nur aus gameplay erlaubt (aktuell: ' + phase() + ')');
      score = finalScore;
      current = PHASES.indexOf('winner');
    }
    return {
      phase: phase,
      isFinished: isFinished,
      transition: transition,
      setScore: setScore,
      finish: finish,
      score: function () { return score; },
    };
  }

  function validateMinigame(game) {
    if (!game || typeof game !== 'object') return false;
    return (
      typeof game.id === 'string' &&
      game.id.length > 0 &&
      typeof game.name === 'string' &&
      game.name.length > 0 &&
      typeof game.play === 'function'
    );
  }

  /**
   * Erzeugt ein vertragskonformes Spiel aus einem bestehenden Spiel-Modul.
   */
  function createSessionAdapter(game, hooks) {
    if (!game || typeof game.play !== 'function') {
      throw new Error('createSessionAdapter: Spiel benoetigt play(stage, api)');
    }
    var wrapped = wrapPlay(game.play, hooks);
    return { id: game.id, name: game.name, play: wrapped };
  }

  /**
   * Wickelt eine bestehende play-Funktion in die Session-State-Machine.
   */
  function wrapPlay(playFn, hooks) {
    hooks = hooks || {};
    var onPhase = typeof hooks.onPhase === 'function' ? hooks.onPhase : function () {};
    var onFinish = typeof hooks.onFinish === 'function' ? hooks.onFinish : function () {};
    var onSession = typeof hooks.onSession === 'function' ? hooks.onSession : function () {};

    return function play(stage, api, runMeta) {
      var session = createMinigameSession();
      onSession(session);

      onPhase(session.phase());
      session.transition('countdown');
      onPhase(session.phase());
      session.transition('gameplay');
      onPhase(session.phase());

      var wrappedApi = Object.assign({}, api, {
        setScore: function (v) {
          if (session.phase() !== 'gameplay') return;
          session.setScore(Math.max(0, Math.round(v)));
          api.setScore(Math.max(0, Math.round(v)));
        },
        finish: function (score) {
          if (session.phase() !== 'gameplay') return;
          var finalScore = Math.max(0, Math.round(score));
          session.finish(finalScore);
          onPhase(session.phase());
          session.transition('reward');
          onPhase(session.phase());
          session.transition('exit');
          onPhase(session.phase());
          onFinish(finalScore);
          api.finish(finalScore);
        },
      });

      try {
        return playFn(stage, wrappedApi, runMeta);
      } catch (err) {
        try {
          if (session.phase() === 'gameplay') wrappedApi.finish(0);
        } catch (e) { /* ignore */ }
        return undefined;
      }
    };
  }

  window.MinigameSession = {
    createSessionAdapter: createSessionAdapter,
    wrapPlay: wrapPlay,
    validateMinigame: validateMinigame,
    createMinigameSession: createMinigameSession,
    MINIGAME_PHASES: PHASES,
  };
})();
