/**
 * Ninja Slash — Spiellogik (browser-frei, testbar)
 *
 * Reine Logik ohne DOM-Abhaengigkeiten.
 * Das UI-Modul nutzt diese Funktionen.
 *
 * Konzept:
 *  - Objekte (Fruechte + Bomben) fliegen von unten nach oben (parabolische Bahn)
 *  - Tippen = schlitzern → Punkte
 *  - Fruechte entkommen (fallen unten aus dem Bild) → missed +1, Combo-Reset
 *  - Bombe tippen → sofort Game Over
 *  - Combos bei aufeinanderfolgenden Treffern → Bonus-Punkte
 *  - maxMissed erreicht → Game Over
 */

/**
 * Frucht- und Bombentypen.
 * Punkte: Fruechte > 0, Bombe = 0.
 */
export const FRUIT_TYPES = [
  { id: 'watermelon', icon: '🍉', points: 10, radius: 38 },
  { id: 'apple',      icon: '🍎', points: 8,  radius: 32 },
  { id: 'orange',     icon: '🍊', points: 8,  radius: 32 },
  { id: 'banana',     icon: '🍌', points: 6,  radius: 34 },
  { id: 'grape',      icon: '🍇', points: 7,  radius: 28 },
  { id: 'strawberry', icon: '🍓', points: 9,  radius: 30 },
  { id: 'pineapple',  icon: '🍍', points: 12, radius: 36 },
  { id: 'kiwi',       icon: '🥝', points: 7,  radius: 28 },
  { id: 'bomb',       icon: '💣', points: 0,  radius: 34 },
];

const TYPE_BY_ID = Object.fromEntries(FRUIT_TYPES.map(t => [t.id, t]));

let _nextId = 1;

/**
 * Erstellt den Startzustand fuer ein Ninja-Slash-Spiel.
 * @param {{maxMissed?:number, gravity?:number}} opts
 * @returns {NinjaState}
 */
export function createNinjaState(opts = {}) {
  return {
    objects: [],
    score: 0,
    combo: 0,
    bestCombo: 0,
    missed: 0,
    maxMissed: opts.maxMissed ?? 5,
    gravity: opts.gravity ?? 0.0009,  // px/ms^2
    gameOver: false,
  };
}

/**
 * Erzeugt ein neues Objekt (Frucht oder Bombe) an der gegebenen Position.
 * @param {NinjaState} state
 * @param {number} x - x-Position
 * @param {number} y - y-Position (groesser = tiefer)
 * @param {string} typeId - Typ-ID aus FRUIT_TYPES
 * @param {{vx?:number, vy?:number}} [vel] - Geschwindigkeit in px/ms
 * @returns {NinjaObject}
 */
export function spawnObject(state, x, y, typeId, vel = {}) {
  const type = TYPE_BY_ID[typeId] || FRUIT_TYPES[0];
  const obj = {
    id: _nextId++,
    x,
    y,
    typeId: type.id,
    icon: type.icon,
    points: type.points,
    radius: type.radius,
    isBomb: type.id === 'bomb',
    vx: vel.vx ?? 0,
    vy: vel.vy ?? -0.5,
    rotation: Math.random() * Math.PI * 2,
    rotSpeed: (Math.random() - 0.5) * 0.01,
  };
  state.objects.push(obj);
  return obj;
}

/**
 * Schlitzert (tippt) ein Objekt anhand seiner ID.
 * Frucht → Score + Combo.
 * Bombe → sofort Game Over.
 * @param {NinjaState} state
 * @param {number} objId
 * @returns {{hit:boolean, bomb:boolean, points:number, combo:number, comboBonus:number}}
 */
export function slashObject(state, objId) {
  if (state.gameOver) return { hit: false, bomb: false, points: 0, combo: 0, comboBonus: 0 };

  const idx = state.objects.findIndex(o => o.id === objId);
  if (idx === -1) return { hit: false, bomb: false, points: 0, combo: 0, comboBonus: 0 };

  const obj = state.objects[idx];
  state.objects.splice(idx, 1);

  if (obj.isBomb) {
    state.gameOver = true;
    state.combo = 0;
    return { hit: true, bomb: true, points: 0, combo: 0, comboBonus: 0 };
  }

  state.combo++;
  if (state.combo > state.bestCombo) state.bestCombo = state.combo;
  const comboBonus = computeComboBonus(state.combo);
  const totalPoints = obj.points + comboBonus;
  state.score += totalPoints;
  return { hit: true, bomb: false, points: totalPoints, combo: state.combo, comboBonus };
}

/**
 * Berechnet den Combo-Bonus fuer aufeinanderfolgende Treffer.
 * Combo 0 oder 1 → 0 Bonus.
 * Ab Combo 2: linear steigend (5 Punkte pro zusaetzlichem Treffer).
 * @param {number} combo
 * @returns {number}
 */
export function computeComboBonus(combo) {
  if (combo <= 1) return 0;
  return (combo - 1) * 5;
}

/**
 * Bewegt alle Objekte (vx, vy + Schwerkraft).
 * Fruechte die unten aus dem Bild fallen → missed +1, Combo-Reset.
 * Bomben die aus dem Bild fallen → kein missed.
 * @param {NinjaState} state
 * @param {number} dt - Delta-Zeit in ms
 * @param {number} stageH - Hoehe der Stage in px
 * @returns {Array<{type:string, object?:NinjaObject}>} Events
 */
export function tickObjects(state, dt, stageH) {
  const events = [];
  if (state.gameOver) return events;

  const survivors = [];
  for (const o of state.objects) {
    // Explicit Euler: erst Position mit aktueller Geschwindigkeit updaten,
    // dann Schwerkraft auf Geschwindigkeit anwenden.
    o.x += o.vx * dt;
    o.y += o.vy * dt;
    o.vy += state.gravity * dt;
    o.rotation += o.rotSpeed * dt;

    // Objekt ist unten aus dem Bild gefallen (y > stageH + radius)
    if (o.y - o.radius > stageH) {
      events.push({ type: 'escaped', object: o });
      if (!o.isBomb) {
        state.missed++;
        state.combo = 0;
        if (state.missed >= state.maxMissed) state.gameOver = true;
      }
    } else {
      survivors.push(o);
    }
  }
  state.objects = survivors;
  return events;
}

/**
 * Gibt die aktiven Objekte zurueck.
 * @param {NinjaState} state
 * @returns {NinjaObject[]}
 */
export function getActiveObjects(state) {
  return state.objects;
}

/**
 * Prueft ob das Spiel vorbei ist.
 * @param {NinjaState} state
 * @returns {boolean}
 */
export function isGameOver(state) {
  return state.gameOver;
}

/**
 * Gibt die Anzahl verpasster Fruechte zurueck.
 * @param {NinjaState} state
 * @returns {number}
 */
export function getMissedCount(state) {
  return state.missed;
}

/**
 * Gibt den aktuellen Score zurueck.
 * @param {NinjaState} state
 * @returns {number}
 */
export function getScore(state) {
  return state.score;
}

/**
 * Gibt den aktuellen Combo zurueck.
 * @param {NinjaState} state
 * @returns {number}
 */
export function getCombo(state) {
  return state.combo;
}

/**
 * Setzt die Spielerfarbe (Platzhalter fuer zukuenftige Features).
 * @param {NinjaState} state
 * @param {number} idx
 */
export function setPlayerColor(state, idx) {
  state.playerColorIdx = idx;
}

/**
 * @typedef {Object} NinjaObject
 * @property {number} id
 * @property {number} x
 * @property {number} y
 * @property {string} typeId
 * @property {string} icon
 * @property {number} points
 * @property {number} radius
 * @property {boolean} isBomb
 * @property {number} vx
 * @property {number} vy
 * @property {number} rotation
 * @property {number} rotSpeed
 */

/**
 * @typedef {Object} NinjaState
 * @property {NinjaObject[]} objects
 * @property {number} score
 * @property {number} combo
 * @property {number} bestCombo
 * @property {number} missed
 * @property {number} maxMissed
 * @property {number} gravity
 * @property {boolean} gameOver
 */