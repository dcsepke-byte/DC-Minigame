/**
 * Rhythm Tap — Spiellogik (browser-frei, testbar)
 *
 * Reine Logik ohne DOM-Abhaengigkeiten.
 * Das UI-Modul nutzt diese Funktionen.
 *
 * Konzept:
 *  - Beats im festen Rhythmus (BPM-basiert)
 *  - Spieler tippt im Takt → Perfect / Good / Early / Late
 *  - Combo-System mit Multiplikator (1x/2x/3x/4x)
 *  - Verpasste Beats zaehlen als Miss
 *  - Zu viele Misses → Game Over
 *  - Zeitlimit: 30 Sekunden
 */

/** Perfect-Fenster in ms (±) */
const PERFECT_WINDOW = 30;
/** Good-Fenster in ms (±) */
const GOOD_WINDOW = 80;
/** Miss-Fenster in ms (Beat gilt als verpasst nach +missFenster) */
const MISS_WINDOW = 120;

/**
 * Generiert Beat-Zeitpunkte basierend auf BPM.
 * @param {number} bpm - Beats per minute
 * @param {number} count - Anzahl Beats
 * @param {number} offset - Start-Offset in ms (default 0)
 * @returns {number[]} Array von Zeitpunkten in ms
 */
export function generateBeats(bpm, count, offset = 0) {
  const interval = 60000 / bpm;
  const beats = [];
  for (let i = 0; i < count; i++) {
    beats.push(offset + i * interval);
  }
  return beats;
}

/**
 * Erstellt den Startzustand fuer ein Rhythm-Tap-Spiel.
 * @param {{bpm?:number, beatCount?:number, maxMisses?:number, offset?:number}} opts
 * @returns {RhythmState}
 */
export function createRhythmState(opts = {}) {
  const bpm = opts.bpm ?? 120;
  const beatCount = opts.beatCount ?? 20;
  const offset = opts.offset ?? 0;
  return {
    beats: generateBeats(bpm, beatCount, offset),
    score: 0,
    combo: 0,
    maxCombo: 0,
    misses: 0,
    maxMisses: opts.maxMisses ?? 5,
    beatIndex: 0,
    gameOver: false,
    bpm,
  };
}

/**
 * Bewertet das Timing eines Taps relativ zum Beat.
 * @param {number} tapTime - Zeitpunkt des Taps in ms
 * @param {number} beatTime - Zeitpunkt des Beats in ms
 * @returns {'perfect'|'good'|'early'|'late'} Timing-Kategorie
 */
export function getTimingWindow(tapTime, beatTime) {
  const diff = tapTime - beatTime;
  if (Math.abs(diff) <= PERFECT_WINDOW) return 'perfect';
  if (Math.abs(diff) <= GOOD_WINDOW) return 'good';
  if (diff < 0) return 'early';
  return 'late';
}

/**
 * Gibt den Combo-Multiplikator zurueck.
 * 0-4: 1x, 5-9: 2x, 10-19: 3x, 20+: 4x
 * @param {number} combo - aktuelle Combo-Laenge
 * @returns {number} Multiplikator (1-4)
 */
export function getComboMultiplier(combo) {
  if (combo >= 20) return 4;
  if (combo >= 10) return 3;
  if (combo >= 5) return 2;
  return 1;
}

/**
 * Bewertet einen Tap und aktualisiert den State.
 * @param {RhythmState} state - Spielzustand (wird mutiert)
 * @param {number} tapTime - Zeitpunkt des Taps in ms
 * @returns {{timing:string, points:number, combo:number}}
 */
export function judgeTap(state, tapTime) {
  if (state.gameOver || state.beatIndex >= state.beats.length) {
    return { timing: 'late', points: 0, combo: 0 };
  }

  const beatTime = state.beats[state.beatIndex];
  const timing = getTimingWindow(tapTime, beatTime);

  if (timing === 'early') {
    // Combo break, kein Miss, Beat bleibt aktiv (Spieler kann noch treffen)
    state.combo = 0;
    return { timing, points: 0, combo: 0 };
  }

  if (timing === 'late') {
    // Miss, Combo break, weiter zum naechsten Beat
    state.combo = 0;
    state.misses++;
    state.beatIndex++;
    if (state.misses >= state.maxMisses) {
      state.gameOver = true;
    }
    return { timing, points: 0, combo: 0 };
  }

  // perfect oder good
  const basePoints = timing === 'perfect' ? 100 : 50;
  const newCombo = state.combo + 1;
  state.combo = newCombo;
  if (newCombo > state.maxCombo) state.maxCombo = newCombo;
  const multiplier = getComboMultiplier(newCombo);
  const points = basePoints * multiplier;
  state.score += points;
  state.beatIndex++;

  return { timing, points, combo: newCombo };
}

/**
 * Prueft ob Beats verpasst wurden (Zeit ist abgelaufen).
 * @param {RhythmState} state - Spielzustand (wird mutiert)
 * @param {number} currentTime - aktuelle Zeit in ms
 * @returns {number} Anzahl neu verpasster Beats
 */
export function checkMissedBeats(state, currentTime) {
  if (state.gameOver) return 0;
  let missed = 0;
  while (state.beatIndex < state.beats.length) {
    const beatTime = state.beats[state.beatIndex];
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

/**
 * Prueft ob das Spiel vorbei ist.
 * @param {RhythmState} state
 * @returns {boolean}
 */
export function isGameOver(state) {
  return state.gameOver;
}

/**
 * Gibt die maximale Combo-Laenge zurueck.
 * @param {RhythmState} state
 * @returns {number}
 */
export function getMaxCombo(state) {
  return state.maxCombo;
}

/**
 * @typedef {Object} RhythmState
 * @property {number[]} beats - Array von Beat-Zeitpunkten in ms
 * @property {number} score - aktuelle Punktzahl
 * @property {number} combo - aktuelle Combo-Laenge
 * @property {number} maxCombo - hoechste erreichte Combo
 * @property {number} misses - Anzahl verpasster Beats
 * @property {number} maxMisses - maximale Misses vor Game Over
 * @property {number} beatIndex - Index des naechsten erwarteten Beats
 * @property {boolean} gameOver - true wenn Spiel vorbei
 * @property {number} bpm - Beats per minute
 */