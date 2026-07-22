/**
 * Loading Screen — Spiellogik (browser-frei, testbar)
 *
 * Reine Logik fuer den Loading Screen:
 *  - Progress-Tracking (0-100%, monoton steigend)
 *  - Complete-Erkennung bei 100%
 *  - MinDisplayTime: Screen bleibt mind. X ms sichtbar
 *  - canDismiss: true wenn complete UND minDisplayTime erreicht
 */

/**
 * Erzeugt einen neuen Loading-State.
 * @param {{minDisplayMs?:number}} [opts]
 * @returns {{progress:number,complete:boolean,startTime:number,minDisplayMs:number}}
 */
export function createLoadingState(opts = {}) {
  return {
    progress: 0,
    complete: false,
    startTime: Date.now(),
    minDisplayMs: opts.minDisplayMs ?? 800,
  };
}

/**
 * Setzt den Progress-Wert (0-100, monoton steigend).
 * @param {{progress:number,complete:boolean}} state
 * @param {number} value
 */
export function updateProgress(state, value) {
  const clamped = Math.max(0, Math.min(100, value));
  if (clamped > state.progress) {
    state.progress = clamped;
  }
  if (state.progress >= 100) {
    state.complete = true;
  }
}

/**
 * Gibt den aktuellen Progress zurueck.
 * @param {{progress:number}} state
 * @returns {number}
 */
export function getProgress(state) {
  return state.progress;
}

/**
 * Prueft ob der Loading abgeschlossen ist (100%).
 * @param {{complete:boolean}} state
 * @returns {boolean}
 */
export function isComplete(state) {
  return state.complete;
}

/**
 * Millisekunden seit Erzeugung des States.
 * @param {{startTime:number}} state
 * @returns {number}
 */
export function getElapsed(state) {
  return Date.now() - state.startTime;
}

/**
 * Prueft ob der Loading Screen geschlossen werden kann:
 * complete UND minDisplayTime erreicht.
 * @param {{complete:boolean,startTime:number,minDisplayMs:number}} state
 * @returns {boolean}
 */
export function canDismiss(state) {
  return state.complete && getElapsed(state) >= state.minDisplayMs;
}

/**
 * Alias fuer canDismiss — semantisch fuer auto-dismiss Timer.
 */
export const shouldDismiss = canDismiss;

/**
 * Aendert die minDisplayTime nachtraeglich.
 * @param {{minDisplayMs:number}} state
 * @param {number} ms
 */
export function setMinDisplayTime(state, ms) {
  state.minDisplayMs = ms;
}