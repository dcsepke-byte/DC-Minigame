/**
 * Tile Flip — Spiellogik (browser-frei, testbar)
 *
 * Reine Logik ohne DOM-Abhaengigkeiten.
 * Das UI-Modul nutzt diese Funktionen.
 *
 * Konzept:
 *  - Memory-Puzzle: Kacheln aufdecken, Paare finden
 *  - Grid mit Paaren von Symbolen (z.B. 4x4 = 8 Paare)
 *  - Booster: Peek (alle kurz sehen), Shuffle (neu mischen), Freeze (Zeit stoppen)
 *  - Combo-System: aufeinanderfolgende Matches geben mehr Punkte
 *  - Zeitlimit, Zeitbonus bei Completion
 */

/** Peek-Dauer in ms */
const PEEK_DURATION = 2000;
/** Freeze-Dauer in ms */
const FREEZE_DURATION = 5000;
/** Punkte pro Paar (Basis) */
const BASE_POINTS = 100;
/** Zeitbonus pro uebrige Sekunde bei Completion */
const TIME_BONUS_PER_SEC = 10;

/**
 * Seeded Random (mulberry32) fuer reproduzierbare Tests.
 * @param {number} seed
 * @returns {function(): number}
 */
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Erstellt den Startzustand fuer ein Tile-Flip-Spiel.
 * @param {{rows?:number, cols?:number, seed?:number, timeLimit?:number}} opts
 * @returns {TileFlipState}
 */
export function createTileFlipState(opts = {}) {
  const rows = opts.rows ?? 4;
  const cols = opts.cols ?? 4;
  const total = rows * cols;
  if (total % 2 !== 0) {
    throw new Error('Grid muss gerade Anzahl Kacheln haben');
  }
  const totalPairs = total / 2;
  const seed = opts.seed ?? Math.floor(Math.random() * 1e9);
  const rng = mulberry32(seed);

  /* Symbole erzeugen: 0..totalPairs-1, jeweils 2x */
  const symbols = [];
  for (let i = 0; i < totalPairs; i++) {
    symbols.push(i, i);
  }

  /* Fisher-Yates Shuffle mit seeded RNG */
  for (let i = symbols.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [symbols[i], symbols[j]] = [symbols[j], symbols[i]];
  }

  /* Tiles erzeugen */
  const tiles = symbols.map((sym) => ({
    symbol: sym,
    flipped: false,
    matched: false,
  }));

  return {
    rows,
    cols,
    tiles,
    pairsFound: 0,
    totalPairs,
    score: 0,
    combo: 0,
    missmatches: 0,
    flips: 0,
    gameOver: false,
    timeLimit: opts.timeLimit ?? 60000,
    boosters: new Set(['peek', 'shuffle', 'freeze']),
    peekUntil: 0,
    freezeUntil: 0,
    freezeStartTime: 0,
    _accumulatedFreeze: 0,
    _rng: rng,
  };
}

/**
 * Gibt die Kachel an einem Index zurueck.
 * @param {TileFlipState} state
 * @param {number} index
 * @returns {Tile|undefined}
 */
export function getTile(state, index) {
  return state.tiles[index];
}

/**
 * Zaehlt aktuell aufgedeckte (flipped, nicht matched) Kacheln.
 * @param {TileFlipState} state
 * @returns {number}
 */
function countFlipped(state) {
  let n = 0;
  for (const t of state.tiles) {
    if (t.flipped && !t.matched) n++;
  }
  return n;
}

/**
 * Deckt eine Kachel auf.
 * @param {TileFlipState} state
 * @param {number} index
 * @returns {{flipped:boolean}} ob die Kachel aufgedeckt wurde
 */
export function flipTile(state, index) {
  const tile = state.tiles[index];
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

/**
 * Prueft ob die zwei aufgedeckten Kacheln ein Paar sind.
 * @param {TileFlipState} state
 * @returns {{matched:boolean, points:number}|null}
 */
export function checkMatch(state) {
  const flipped = [];
  for (let i = 0; i < state.tiles.length; i++) {
    if (state.tiles[i].flipped && !state.tiles[i].matched) {
      flipped.push(i);
    }
  }
  if (flipped.length !== 2) return null;

  const [i1, i2] = flipped;
  const t1 = state.tiles[i1];
  const t2 = state.tiles[i2];

  if (t1.symbol === t2.symbol) {
    /* Match! */
    t1.matched = true;
    t2.matched = true;
    t1.flipped = false;
    t2.flipped = false;
    state.pairsFound++;
    state.combo++;
    const points = BASE_POINTS * state.combo;
    state.score += points;
    if (state.pairsFound >= state.totalPairs) {
      state.gameOver = true;
    }
    return { matched: true, points };
  } else {
    /* Kein Match */
    t1.flipped = false;
    t2.flipped = false;
    state.missmatches++;
    state.combo = 0;
    return { matched: false, points: 0 };
  }
}

/**
 * Prueft ob das Spiel vorbei ist (alle Paare gefunden oder Zeit abgelaufen).
 * @param {TileFlipState} state
 * @returns {boolean}
 */
export function isGameOver(state) {
  return state.gameOver || isComplete(state);
}

/**
 * Prueft ob alle Paare gefunden wurden.
 * @param {TileFlipState} state
 * @returns {boolean}
 */
export function isComplete(state) {
  return state.pairsFound >= state.totalPairs;
}

/**
 * Verwendet einen Booster.
 * @param {TileFlipState} state
 * @param {'peek'|'shuffle'|'freeze'} type
 * @param {number} [currentTime] - aktuelle Zeit in ms (fuer peek/freeze)
 * @returns {boolean} ob Booster verwendet wurde
 */
export function useBooster(state, type, currentTime = Date.now()) {
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

/**
 * Mischt alle unmatched Kacheln neu.
 * @param {TileFlipState} state
 */
function shuffleUnmatched(state) {
  const unmatchedIndices = [];
  const unmatchedSymbols = [];
  for (let i = 0; i < state.tiles.length; i++) {
    if (!state.tiles[i].matched) {
      unmatchedIndices.push(i);
      unmatchedSymbols.push(state.tiles[i].symbol);
      state.tiles[i].flipped = false;
    }
  }
  /* Fisher-Yates mit state RNG */
  for (let i = unmatchedSymbols.length - 1; i > 0; i--) {
    const j = Math.floor(state._rng() * (i + 1));
    [unmatchedSymbols[i], unmatchedSymbols[j]] = [unmatchedSymbols[j], unmatchedSymbols[i]];
  }
  for (let k = 0; k < unmatchedIndices.length; k++) {
    state.tiles[unmatchedIndices[k]].symbol = unmatchedSymbols[k];
  }
}

/**
 * Prueft ob Peek aktiv ist.
 * @param {TileFlipState} state
 * @param {number} currentTime
 * @returns {boolean}
 */
export function isPeeking(state, currentTime) {
  return currentTime < state.peekUntil;
}

/**
 * Prueft ob Freeze aktiv ist.
 * @param {TileFlipState} state
 * @param {number} currentTime
 * @returns {boolean}
 */
export function isFrozen(state, currentTime) {
  return currentTime < state.freezeUntil;
}

/**
 * Berechnet die verbleibende Zeit in ms.
 * Beruecksichtigt Freeze-Zeiten.
 * @param {TileFlipState} state
 * @param {number} currentTime - aktuelle Zeit in ms
 * @param {number} startTime - Startzeit in ms (default 0)
 * @returns {number} verbleibende Zeit in ms
 */
export function getTimeRemaining(state, currentTime, startTime = 0) {
  const elapsed = currentTime - startTime;
  /* Berechne eingefrorene Zeit */
  let frozenTime = 0;
  if (state.freezeUntil > 0) {
    const freezeEnd = Math.min(state.freezeUntil, currentTime);
    const freezeStart = state.freezeStartTime;
    if (freezeEnd > freezeStart) {
      frozenTime = freezeEnd - freezeStart;
    }
  }
  const effectiveElapsed = Math.max(0, elapsed - frozenTime);
  return Math.max(0, state.timeLimit - effectiveElapsed);
}

/**
 * Berechnet den Final-Score mit Zeitbonus.
 * @param {TileFlipState} state
 * @param {number} timeUsed - verbrauchte Zeit in ms
 * @param {number} startTime
 * @returns {number}
 */
export function getFinalScore(state, timeUsed, startTime = 0) {
  let final = state.score;
  if (isComplete(state)) {
    const remaining = getTimeRemaining(state, timeUsed, startTime);
    const bonusSeconds = Math.floor(remaining / 1000);
    final += bonusSeconds * TIME_BONUS_PER_SEC;
  }
  return final;
}

/**
 * @typedef {Object} Tile
 * @property {number} symbol - Symbol-ID
 * @property {boolean} flipped - aufgedeckt
 * @property {boolean} matched - gematcht
 */

/**
 * @typedef {Object} TileFlipState
 * @property {number} rows
 * @property {number} cols
 * @property {Tile[]} tiles
 * @property {number} pairsFound
 * @property {number} totalPairs
 * @property {number} score
 * @property {number} combo
 * @property {number} missmatches
 * @property {number} flips
 * @property {boolean} gameOver
 * @property {number} timeLimit
 * @property {Set<string>} boosters
 * @property {number} peekUntil
 * @property {number} freezeUntil
 * @property {number} freezeStartTime
 * @property {number} _accumulatedFreeze
 * @property {function(): number} _rng
 */