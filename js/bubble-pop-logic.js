/**
 * Bubble Pop — Spiellogik (browser-frei, testbar)
 *
 * Reine Logik ohne DOM-Abhaengigkeiten.
 * Das UI-Modul nutzt diese Funktionen.
 *
 * Konzept:
 *  - Bunte Blasen steigen von unten nach oben
 *  - Spieler hat eine Zielfarbe (wechselt periodisch)
 *  - Richtige Blase tippen → Punkte + Combo
 *  - Falsche Blase tippen → missed +1, Combo-Reset
 *  - Spielerfarbe entkommen lassen → missed +1
 *  - maxMissed erreicht → Game Over
 *  - Ketten-Bonus bei mehreren gleichen Farben in Folge
 */

let _nextId = 1;

/**
 * Erstellt den Startzustand fuer ein Bubble-Pop-Spiel.
 * @param {{colors:string[], maxMissed?:number, comboBonusBase?:number}} opts
 * @returns {BubbleState}
 */
export function createBubbleState(opts) {
  const colors = (opts && opts.colors) || ['#ff0', '#0ff', '#f0f'];
  return {
    bubbles: [],
    score: 0,
    combo: 0,
    bestCombo: 0,
    missed: 0,
    maxMissed: (opts && opts.maxMissed) || 5,
    gameOver: false,
    colors,
    playerColor: colors[0],
  };
}

/**
 * Setzt die Spielerfarbe anhand eines Index im Farbpool.
 * @param {BubbleState} state
 * @param {number} idx - Index in state.colors
 */
export function setPlayerColor(state, idx) {
  if (idx >= 0 && idx < state.colors.length) {
    state.playerColor = state.colors[idx];
  }
}

/**
 * Erzeugt eine neue Blase an der gegebenen Position.
 * @param {BubbleState} state
 * @param {number} x - x-Position
 * @param {number} y - y-Position (groesser = tiefer)
 * @param {number} colorIdx - Index in state.colors
 * @returns {Bubble}
 */
export function spawnBubble(state, x, y, colorIdx) {
  const color = state.colors[colorIdx % state.colors.length];
  const bubble = {
    id: _nextId++,
    x,
    y,
    color,
    radius: 26,
    speed: 0.04, // px/ms
    wobble: Math.random() * Math.PI * 2,
    colorIdx,
  };
  state.bubbles.push(bubble);
  return bubble;
}

/**
 * Popped (tippt) eine Blase anhand ihrer ID.
 * Richtige Farbe → Score + Combo.
 * Falsche Farbe → missed +1, Combo-Reset.
 * @param {BubbleState} state
 * @param {number} bubbleId
 * @returns {{correct:boolean, score:number, combo:number, chainBonus:number, missed:boolean}}
 */
export function popBubble(state, bubbleId) {
  if (state.gameOver) return { correct: false, score: 0, combo: 0, chainBonus: 0, missed: false };

  const idx = state.bubbles.findIndex(b => b.id === bubbleId);
  if (idx === -1) return { correct: false, score: 0, combo: 0, chainBonus: 0, missed: false };

  const bubble = state.bubbles[idx];
  state.bubbles.splice(idx, 1);

  if (bubble.color === state.playerColor) {
    state.combo++;
    if (state.combo > state.bestCombo) state.bestCombo = state.combo;
    const pts = computeScore(state.combo);
    state.score += pts;
    return { correct: true, score: pts, combo: state.combo, chainBonus: 0, missed: false };
  }

  // Falsche Farbe
  state.combo = 0;
  state.missed++;
  if (state.missed >= state.maxMissed) state.gameOver = true;
  return { correct: false, score: 0, combo: 0, chainBonus: 0, missed: true };
}

/**
 * Berechnet die Punkte fuer eine Blase basierend auf der aktuellen Combo.
 * Combo 0 → 0 Punkte. Hoeherer Combo → mehr Punkte (mit Cap).
 * @param {number} combo
 * @returns {number}
 */
export function computeScore(combo) {
  if (combo <= 0) return 0;
  // Basis 10, +2 pro Combo-Stufe, Cap bei 50
  return Math.min(50, 10 + (combo - 1) * 2);
}

/**
 * Berechnet den Ketten-Bonus fuer aufeinanderfolgende gleichfarbige Pops.
 * @param {number} chainLength - Anzahl der Blasen in der Kette
 * @returns {number} Bonus-Punkte (0 bei chainLength <= 1)
 */
export function computeChainBonus(chainLength) {
  if (chainLength <= 1) return 0;
  // 5 Punkte pro zusaetzliche Blase in der Kette
  return (chainLength - 1) * 5;
}

/**
 * Bewegt alle Blasen nach oben (y nimmt ab).
 * Blasen die den oberen Rand verlassen werden entferntt.
 * Spielerfarbe entkommen → missed +1.
 * @param {BubbleState} state
 * @param {number} dt - Delta-Zeit in ms
 * @param {number} stageH - Hoehe der Stage in px
 * @returns {Array<{type:string, bubble?:Bubble}>} Events
 */
export function tickBubbles(state, dt, stageH) {
  const events = [];
  if (state.gameOver) return events;

  const survivors = [];
  for (const b of state.bubbles) {
    b.y -= b.speed * dt;
    b.wobble += dt * 0.003;
    if (b.y + b.radius < 0) {
      // Blase entkommen
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

/**
 * Gibt die aktiven Blasen zurueck.
 * @param {BubbleState} state
 * @returns {Bubble[]}
 */
export function getActiveBubbles(state) {
  return state.bubbles;
}

/**
 * Prueft ob das Spiel vorbei ist.
 * @param {BubbleState} state
 * @returns {boolean}
 */
export function isGameOver(state) {
  return state.gameOver;
}

/**
 * Gibt die Anzahl verpasster/falscher Blasen zurueck.
 * @param {BubbleState} state
 * @returns {number}
 */
export function getMissedCount(state) {
  return state.missed;
}

/**
 * @typedef {Object} Bubble
 * @property {number} id
 * @property {number} x
 * @property {number} y
 * @property {string} color
 * @property {number} radius
 * @property {number} speed
 * @property {number} wobble
 * @property {number} colorIdx
 */

/**
 * @typedef {Object} BubbleState
 * @property {Bubble[]} bubbles
 * @property {number} score
 * @property {number} combo
 * @property {number} bestCombo
 * @property {number} missed
 * @property {number} maxMissed
 * @property {boolean} gameOver
 * @property {string[]} colors
 * @property {string} playerColor
 */