/**
 * Tower Stack — Spiellogik (browser-frei, testbar)
 *
 * Reine Logik ohne DOM-Abhaengigkeiten.
 * Das UI-Modul (tower-stack-ui.js) nutzt diese Funktionen.
 *
 * Konzept:
 *  - Bloecke werden gestapelt, jeder neue Block bewegt sich hin und her
 *  - Beim Tippen wird der Block platziert
 *  - Ueberlappung mit vorherigem Block bestimmt Score und neue Breite
 *  - Keine Ueberlappung → Game Over
 *  - Perfekte Platzierung → Breite bleibt, Bonus-Punkte
 */

/**
 * Berechnet die Ueberlappung zwischen vorherigem und neuem Block.
 * @param {{x:number,width:number}} prev - vorheriger Block
 * @param {{x:number,width:number}} next - neu platzierter Block
 * @returns {{overlap:number,offset:number}} overlap in px, offset (vorzeichenbehaftet)
 */
export function calculateOverlap(prev, next) {
  const prevRight = prev.x + prev.width;
  const nextRight = next.x + next.width;
  const overlap = Math.min(prevRight, nextRight) - Math.max(prev.x, next.x);
  const offset = next.x - prev.x;
  return { overlap: Math.max(0, overlap), offset };
}

/**
 * Prueft ob der Block komplett verfehlt wurde.
 * @param {number} overlap - Ueberlappung in px
 * @returns {boolean} true wenn Game Over
 */
export function isMissed(overlap) {
  return overlap <= 0;
}

/**
 * Berechnet die Punkte fuer eine Platzierung.
 * Perfekte Platzierung (offset 0) gibt Maximalpunkte.
 * Je groesser der Versatz, desto weniger Punkte.
 * @param {number} offset - absoluter Versatz in px
 * @param {number} width - aktuelle Blockbreite
 * @returns {number} Punkte (>= 0)
 */
export function computePlacementScore(offset, width) {
  const absOffset = Math.abs(offset);
  if (absOffset === 0) return 100; // Perfect-Bonus
  // Proportionaler Score: je naeher an 0, desto mehr Punkte
  const accuracy = 1 - (absOffset / width);
  if (accuracy <= 0) return 0;
  return Math.round(100 * accuracy);
}

/**
 * Berechnet die neue Blockbreite nach einer Platzierung.
 * Bei perfekter Platzierung bleibt die Breite gleich.
 * Sonst schrumpft sie auf die Ueberlappung.
 * @param {number} currentWidth - aktuelle Breite
 * @param {number} overlap - Ueberlappung in px
 * @returns {number} neue Breite
 */
export function nextBlockWidth(currentWidth, overlap) {
  return Math.max(0, Math.min(currentWidth, overlap));
}

/**
 * Erstellt den Startzustand fuer ein Tower-Stack-Spiel.
 * @param {{baseWidth?:number, baseX?:number, minWidth?:number}} opts
 * @returns {TowerState}
 */
export function createTowerState(opts = {}) {
  const baseWidth = opts.baseWidth ?? 80;
  const baseX = opts.baseX ?? 100;
  return {
    blocks: [{ x: baseX, width: baseWidth }],
    score: 0,
    level: 0,
    gameOver: false,
    minWidth: opts.minWidth ?? 15,
  };
}

/**
 * Platziert einen Block an der gegebenen x-Position.
 * Aktualisiert den State (score, blocks, level, gameOver).
 * @param {TowerState} state - Spielzustand (wird mutiert)
 * @param {number} x - x-Position des neuen Blocks
 * @returns {{missed:boolean, perfect:boolean, overlap:number, offset:number, score:number}}
 */
export function placeBlock(state, x) {
  if (state.gameOver) return { missed: true, perfect: false, overlap: 0, offset: 0, score: 0 };

  const prev = state.blocks[state.blocks.length - 1];
  const next = { x, width: prev.width };
  const { overlap, offset } = calculateOverlap(prev, next);

  if (isMissed(overlap)) {
    state.gameOver = true;
    return { missed: true, perfect: false, overlap: 0, offset, score: 0 };
  }

  const perfect = Math.abs(offset) === 0;
  const placementScore = computePlacementScore(offset, prev.width);
  state.score += placementScore;

  const newWidth = Math.max(state.minWidth, nextBlockWidth(prev.width, overlap));
  state.blocks.push({ x: Math.max(prev.x, next.x), width: newWidth });
  state.level++;

  return { missed: false, perfect, overlap, offset, score: placementScore };
}

/**
 * Prueft ob das Spiel vorbei ist.
 * @param {TowerState} state
 * @returns {boolean}
 */
export function isGameOver(state) {
  return state.gameOver;
}

/**
 * Gibt die aktuelle Turm-Hoehe zurueck (Anzahl Bloecke - 1).
 * @param {TowerState} state
 * @returns {number}
 */
export function getTowerHeight(state) {
  return state.blocks.length - 1;
}

/**
 * @typedef {Object} TowerState
 * @property {Array<{x:number,width:number}>} blocks - gestapelte Bloecke
 * @property {number} score - aktuelle Punktzahl
 * @property {number} level - aktuelle Level (0 = nur Basis)
 * @property {boolean} gameOver - true wenn Spiel vorbei
 * @property {number} minWidth - minimale Blockbreite bevor es unspielbar wird
 */