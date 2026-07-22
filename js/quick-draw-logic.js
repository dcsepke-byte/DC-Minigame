/**
 * Quick Draw Duel — Spiellogik (browser-frei, testbar)
 *
 * Reine Logik ohne DOM-Abhaengigkeiten.
 * Das UI-Modul nutzt diese Funktionen.
 *
 * Konzept:
 *  - Western-Duell: Spannung baut auf (READY... STEADY... FIRE!)
 *  - Nach FIRE-Signal schnellstes Tippen = Punkte
 *  - Vor FIRE tippen = Foul (0 Punkte, Runde verloren)
 *  - Reaktionszeit -> Score (schneller = mehr Punkte)
 *  - maxRounds Runden gespielt -> Game Over
 *  - Reaktion > 2000ms = miss (zu langsam)
 */

/**
 * Erstellt den Startzustand fuer ein Quick Draw Duel Spiel.
 * @param {{maxRounds?:number}} opts
 * @returns {QuickDrawState}
 */
export function createQuickDrawState(opts = {}) {
  return {
    round: 0,
    score: 0,
    misses: 0,
    fouls: 0,
    maxRounds: opts.maxRounds ?? 3,
    phase: 'waiting', // waiting, ready, fire, done, foul
    signalTime: 0,
    reactionTime: 0,
    gameOver: false,
  };
}

/** @returns {number} */
export function getRound(state) { return state.round; }
/** @returns {number} */
export function getScore(state) { return state.score; }
/** @returns {number} */
export function getMisses(state) { return state.misses; }
/** @returns {number} */
export function getFouls(state) { return state.fouls; }
/** @returns {string} */
export function getPhase(state) { return state.phase; }
/** @returns {number} */
export function getSignalTime(state) { return state.signalTime; }
/** @returns {number} */
export function getReactionTime(state) { return state.reactionTime; }
/** @returns {number} */
export function getMaxRounds(state) { return state.maxRounds; }
/** @returns {boolean} */
export function isGameOver(state) { return state.gameOver; }

/**
 * Startet eine neue Runde.
 * @param {QuickDrawState} state
 */
export function startRound(state) {
  if (state.gameOver) return;
  state.round++;
  state.phase = 'ready';
  state.signalTime = 0;
  state.reactionTime = 0;
}

/**
 * Setzt das FIRE-Signal.
 * @param {QuickDrawState} state
 * @param {number} now - aktuelle Zeit in ms
 */
export function fireSignal(state, now) {
  if (state.phase !== 'ready') {
    if (state.phase === 'waiting') throw new Error('startRound first');
    return; // bereits fire oder done -> ignorieren
  }
  state.phase = 'fire';
  state.signalTime = now;
}

/**
 * Spieler tippt.
 * Vor Fire-Signal = Foul. Nach Fire-Signal = Reaktion.
 * @param {QuickDrawState} state
 * @param {number} now - aktuelle Zeit in ms
 */
export function playerTap(state, now) {
  if (state.phase === 'waiting' || state.phase === 'done' || state.phase === 'foul') return;

  if (state.phase === 'ready') {
    // Vor Fire-Signal = Foul
    state.fouls++;
    state.score += 0;
    state.phase = 'foul';
    _checkGameOver(state);
    return;
  }

  if (state.phase === 'fire') {
    const reaction = now - state.signalTime;
    state.reactionTime = reaction;

    // Miss bei zu langsamer Reaktion (> 2000ms)
    if (reaction > 2000) {
      state.misses++;
    }

    state.score += computeReactionScore(reaction);
    state.phase = 'done';
    _checkGameOver(state);
  }
}

/**
 * Prueft ob die Runde vorbei ist.
 * @param {QuickDrawState} state
 * @returns {boolean}
 */
export function isRoundOver(state) {
  return state.phase === 'done' || state.phase === 'foul';
}

/**
 * Berechnet den Score basierend auf der Reaktionszeit.
 * Schneller = mehr Punkte. maxScore ~1000 bei ~100ms.
 * @param {number} ms - Reaktionszeit in ms
 * @returns {number}
 */
export function computeReactionScore(ms) {
  if (ms <= 0) return 0;
  // Lineare Formel: maxScore=1000, 0ms -> 1000, 3000ms -> 0
  // score = max(10, 1000 - ms/3)
  const score = Math.max(10, Math.round(1000 - ms / 3));
  return score;
}

/**
 * Interne Funktion: prueft ob das Spiel vorbei ist.
 * @param {QuickDrawState} state
 */
function _checkGameOver(state) {
  if (state.round >= state.maxRounds && (state.phase === 'done' || state.phase === 'foul')) {
    state.gameOver = true;
  }
}