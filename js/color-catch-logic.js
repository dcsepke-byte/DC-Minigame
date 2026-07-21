/**
 * Color Catch — Spiellogik (browser-frei, testbar)
 *
 * Reine Logik ohne DOM-Abhaengigkeiten.
 * Das UI-Modul nutzt diese Funktionen.
 *
 * Konzept:
 *  - Ein Korb am unteren Bildschirmrand (x, width)
 *  - Farb-Objekte fallen von oben nach unten (y nimmt zu)
 *  - Spieler hat eine Zielfarbe (wechselt periodisch)
 *  - Objekt im Korb auffangen (y >= basketY, x in Korb-Bereich):
 *      richtige Farbe -> Score + Combo
 *      falsche Farbe  -> missed +1, Combo-Reset
 *  - Objekt am Korb vorbei (y > stageH):
 *      richtige Farbe entkommen -> missed +1, Combo-Reset
 *      falsche Farbe entkommen  -> kein missed
 *  - maxMissed erreicht -> Game Over
 */

let _nextId = 1;

/**
 * Erstellt den Startzustand fuer ein Color-Catch-Spiel.
 * @param {{maxMissed?:number, stageWidth?:number, stageHeight?:number, colors?:string[], basketWidth?:number, basketYOffset?:number}} opts
 * @returns {ColorCatchState}
 */
export function createColorCatchState(opts = {}) {
  const colors = opts.colors || ['#ff0', '#0ff', '#f0f'];
  const stageWidth = opts.stageWidth ?? 300;
  const basketWidth = opts.basketWidth ?? 90;
  const basketYOffset = opts.basketYOffset ?? 60;
  return {
    objects: [],
    score: 0,
    combo: 0,
    bestCombo: 0,
    missed: 0,
    maxMissed: opts.maxMissed ?? 5,
    gameOver: false,
    colors,
    playerColor: colors[0],
    stageWidth,
    stageHeight: opts.stageHeight ?? 600,
    basket: {
      x: Math.max(0, (stageWidth - basketWidth) / 2),
      width: basketWidth,
      yOffset: basketYOffset,
    },
  };
}

/**
 * Setzt die Spielerfarbe anhand eines Index im Farbpool.
 * @param {ColorCatchState} state
 * @param {number} idx - Index in state.colors
 */
export function setPlayerColor(state, idx) {
  if (idx >= 0 && idx < state.colors.length) {
    state.playerColor = state.colors[idx];
  }
}

/**
 * Erzeugt ein neues fallendes Objekt an der gegebenen Position.
 * @param {ColorCatchState} state
 * @param {number} x - x-Position
 * @param {number} y - y-Position (0 = oben)
 * @param {number} colorIdx - Index in state.colors
 * @returns {FallingObject}
 */
export function spawnObject(state, x, y, colorIdx) {
  const color = state.colors[colorIdx % state.colors.length];
  const obj = {
    id: _nextId++,
    x,
    y,
    color,
    colorIdx,
    radius: 24,
    speed: 0.18, // px/ms (default fallgeschwindigkeit)
    wobble: Math.random() * Math.PI * 2,
  };
  state.objects.push(obj);
  return obj;
}

/**
 * Bewegt den Korb zur x-Position (linke Kante).
 * Klemmt an Buehnenbreite.
 * @param {ColorCatchState} state
 * @param {number} x - gewuenschte x-Position (linke Kante des Korbs)
 */
export function moveBasket(state, x) {
  state.basket.x = Math.max(0, Math.min(state.stageWidth - state.basket.width, x));
}

/**
 * Berechnet die Punkte fuer einen Catch basierend auf der aktuellen Combo.
 * @param {number} combo
 * @returns {number}
 */
export function computeCatchScore(combo) {
  if (combo <= 0) return 0;
  // Basis 10, +3 pro Combo-Stufe, Cap bei 60
  return Math.min(60, 10 + (combo - 1) * 3);
}

/**
 * Berechnet den Combo-Bonus fuer aufeinanderfolgende richtige Catches.
 * @param {number} combo
 * @returns {number}
 */
export function computeComboBonus(combo) {
  if (combo <= 1) return 0;
  return (combo - 1) * 4;
}

/**
 * Prueft ob ein Objekt im Korb-Bereich ist (horizontal).
 * @param {FallingObject} obj
 * @param {{x:number,width:number}} basket
 * @returns {boolean}
 */
function isInBasketX(obj, basket) {
  return obj.x >= basket.x && obj.x <= basket.x + basket.width;
}

/**
 * Bewegt alle Objekte nach unten (y nimmt zu).
 * Prueft auf Catch (y >= basketY) und Escape (y > stageH).
 * @param {ColorCatchState} state
 * @param {number} dt - Delta-Zeit in ms
 * @param {number} stageH - Hoehe der Stage in px
 * @param {number} basketY - y-Position der Korb-Oberkante in px
 * @returns {Array<{type:string, object?:FallingObject}>} Events
 */
export function tickObjects(state, dt, stageH, basketY) {
  const events = [];
  if (state.gameOver) return events;

  const survivors = [];
  for (const o of state.objects) {
    o.y += o.speed * dt;
    o.wobble += dt * 0.003;

    // Catch: Objekt hat Korb-Hoehe erreicht und ist horizontal im Korb
    if (o.y >= basketY && isInBasketX(o, state.basket)) {
      events.push({ type: 'caught', object: o });
      if (o.color === state.playerColor) {
        // Richtig gefangen
        state.combo++;
        if (state.combo > state.bestCombo) state.bestCombo = state.combo;
        const pts = computeCatchScore(state.combo);
        state.score += pts;
      } else {
        // Falsche Farbe gefangen
        state.combo = 0;
        state.missed++;
        if (state.missed >= state.maxMissed) state.gameOver = true;
      }
      continue; // Objekt entfernt (nicht zu survivors)
    }

    // Escape: Objekt ist unten aus dem Bild gefallen
    if (o.y - o.radius > stageH) {
      events.push({ type: 'escaped', object: o });
      if (o.color === state.playerColor) {
        // Richtige Farbe entkommen -> missed
        state.combo = 0;
        state.missed++;
        if (state.missed >= state.maxMissed) state.gameOver = true;
      }
      // Falsche Farbe entkommen -> kein Problem
      continue;
    }

    survivors.push(o);
  }
  state.objects = survivors;
  return events;
}

/**
 * Gibt die aktiven Objekte zurueck.
 * @param {ColorCatchState} state
 * @returns {FallingObject[]}
 */
export function getActiveObjects(state) {
  return state.objects;
}

/**
 * Prueft ob das Spiel vorbei ist.
 * @param {ColorCatchState} state
 * @returns {boolean}
 */
export function isGameOver(state) {
  return state.gameOver;
}

/**
 * Gibt die Anzahl verpasster/falscher Objekte zurueck.
 * @param {ColorCatchState} state
 * @returns {number}
 */
export function getMissedCount(state) {
  return state.missed;
}

/**
 * Gibt den aktuellen Score zurueck.
 * @param {ColorCatchState} state
 * @returns {number}
 */
export function getScore(state) {
  return state.score;
}

/**
 * Gibt den aktuellen Combo zurueck.
 * @param {ColorCatchState} state
 * @returns {number}
 */
export function getCombo(state) {
  return state.combo;
}

/**
 * Gibt den besten Combo zurueck.
 * @param {ColorCatchState} state
 * @returns {number}
 */
export function getBestCombo(state) {
  return state.bestCombo;
}

/**
 * @typedef {Object} FallingObject
 * @property {number} id
 * @property {number} x
 * @property {number} y
 * @property {string} color
 * @property {number} colorIdx
 * @property {number} radius
 * @property {number} speed
 * @property {number} wobble
 */

/**
 * @typedef {Object} ColorCatchState
 * @property {FallingObject[]} objects
 * @property {number} score
 * @property {number} combo
 * @property {number} bestCombo
 * @property {number} missed
 * @property {number} maxMissed
 * @property {boolean} gameOver
 * @property {string[]} colors
 * @property {string} playerColor
 * @property {number} stageWidth
 * @property {number} stageHeight
 * @property {{x:number,width:number,yOffset:number}} basket
 */