/**
 * Minigame Session Adapter (arch-2) — browser-frei, testbar
 *
 * Bringt bestehende games.js-Spiele (play(stage, api)) auf den Minispiel-Vertrag:
 * Pro Spiel wird eine Session-State-Machine erzeugt und der Lebenszyklus
 *   start -> countdown -> gameplay -> winner -> reward -> exit
 * erzwungen. setScore/finish laufen durch die Session-Guards, damit
 * doppelte Finishes und Score-Sets nach Spielende keine Seiteneffekte haben.
 *
 * Keine DOM-Abhaengigkeiten.
 */
import { createMinigameSession, validateMinigame, MINIGAME_PHASES } from './minigame-contract.js';

/**
 * Erzeugt ein vertragskonformes Spiel aus einem bestehenden Spiel-Modul.
 * Das Ergebnis erfuellt validateMinigame() und kann ueberall eingesetzt
 * werden, wo ein Minispiel erwartet wird.
 *
 * @param {{id:string, name:string, play:Function}} game
 * @param {{onPhase?:Function, onFinish?:Function, onSession?:Function}} [hooks]
 * @returns {{id:string, name:string, play:Function}}
 */
export function createSessionAdapter(game, hooks = {}) {
  if (!game || typeof game.play !== 'function') {
    throw new Error('createSessionAdapter: Spiel benoetigt play(stage, api)');
  }
  const wrapped = wrapPlay(game.play, hooks);
  return {
    id: game.id,
    name: game.name,
    play: wrapped,
  };
}

/**
 * Wickelt eine bestehende play-Funktion in die Session-State-Machine.
 *
 * Ablauf:
 *  - start -> countdown -> gameplay (automatisch vor dem Spiel)
 *  - api.setScore nur waehrend gameplay durchreichen (sonst ignorieren)
 *  - api.finish: winner -> reward -> exit, dann original finish aufrufen
 *  - Exceptions des Spiels werden abgefangen und als finish(0) gemeldet
 *
 * @param {Function} playFn - Original play(stage, api, runMeta)
 * @param {{onPhase?:Function, onFinish?:Function, onSession?:Function}} [hooks]
 * @returns {Function} vertragskonforme play-Funktion
 */
export function wrapPlay(playFn, hooks = {}) {
  const onPhase = typeof hooks.onPhase === 'function' ? hooks.onPhase : () => {};
  const onFinish = typeof hooks.onFinish === 'function' ? hooks.onFinish : () => {};
  const onSession = typeof hooks.onSession === 'function' ? hooks.onSession : () => {};

  return function play(stage, api, runMeta) {
    const session = createMinigameSession();
    onSession(session);

    /* start -> countdown -> gameplay */
    onPhase(session.phase());
    session.transition('countdown');
    onPhase(session.phase());
    session.transition('gameplay');
    onPhase(session.phase());

    /* API kapseln: setScore/finish durch Session-Guards */
    const wrappedApi = Object.assign({}, api, {
      setScore(v) {
        if (session.phase() !== 'gameplay') return; // nach finish ignorieren
        session.setScore(Math.max(0, Math.round(v)));
        api.setScore(Math.max(0, Math.round(v)));
      },
      finish(score) {
        if (session.phase() !== 'gameplay') return; // doppeltes finish = no-op
        const finalScore = Math.max(0, Math.round(score));
        session.finish(finalScore);
        onPhase(session.phase()); // winner
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
      // Spiel-Fehler: Session sauber beenden statt haengen bleiben.
      // Exception bewusst NICHT weiterwerfen — der Aufrufer (player.js)
      // wuerde sonst doppelt finishGame(0) senden.
      try {
        if (session.phase() === 'gameplay') {
          wrappedApi.finish(0);
        }
      } catch (e) { /* ignore */ }
      return undefined;
    }
  };
}

/** Re-Export fuer Bequemlichkeit. */
export { validateMinigame, MINIGAME_PHASES };
