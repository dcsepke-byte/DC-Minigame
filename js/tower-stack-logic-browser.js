/**
 * Tower Stack — Spiellogik (Browser-Kompatibel, IIFE)
 *
 * Gleiche Logik wie tower-stack-logic.js (ESM),
 * aber als IIFE fuer <script>-Tag ohne Module-Loader.
 *
 * Konzept:
 *  - Bloecke werden gestapelt, jeder neue Block bewegt sich hin und her
 *  - Beim Tippen wird der Block platziert
 *  - Ueberlappung mit vorherigem Block bestimmt Score und neue Breite
 *  - Keine Ueberlappung → Game Over
 *  - Perfekte Platzierung → Breite bleibt, Bonus-Punkte
 */
(function () {
  'use strict';

  /**
   * Berechnet die Ueberlappung zwischen vorherigem und neuem Block.
   * @param {{x:number,width:number}} prev - vorheriger Block
   * @param {{x:number,width:number}} next - neu platzierter Block
   * @returns {{overlap:number,offset:number}}
   */
  function calculateOverlap(prev, next) {
    var prevRight = prev.x + prev.width;
    var nextRight = next.x + next.width;
    var overlap = Math.min(prevRight, nextRight) - Math.max(prev.x, next.x);
    var offset = next.x - prev.x;
    return { overlap: Math.max(0, overlap), offset: offset };
  }

  /** Prueft ob der Block komplett verfehlt wurde. */
  function isMissed(overlap) {
    return overlap <= 0;
  }

  /**
   * Berechnet Punkte fuer eine Platzierung.
   * Perfekt (offset 0) → 100 Punkte. Sonst proportional.
   */
  function computePlacementScore(offset, width) {
    var absOffset = Math.abs(offset);
    if (absOffset === 0) return 100;
    var accuracy = 1 - (absOffset / width);
    if (accuracy <= 0) return 0;
    return Math.round(100 * accuracy);
  }

  /** Berechnet neue Blockbreite nach Platzierung. */
  function nextBlockWidth(currentWidth, overlap) {
    return Math.max(0, Math.min(currentWidth, overlap));
  }

  /** Erstellt den Startzustand. */
  function createTowerState(opts) {
    opts = opts || {};
    var baseWidth = opts.baseWidth != null ? opts.baseWidth : 80;
    var baseX = opts.baseX != null ? opts.baseX : 100;
    return {
      blocks: [{ x: baseX, width: baseWidth }],
      score: 0,
      level: 0,
      gameOver: false,
      minWidth: opts.minWidth != null ? opts.minWidth : 15,
    };
  }

  /**
   * Platziert einen Block an Position x.
   * Mutiert den State und gibt das Ergebnis zurueck.
   */
  function placeBlock(state, x) {
    if (state.gameOver) return { missed: true, perfect: false, overlap: 0, offset: 0, score: 0 };

    var prev = state.blocks[state.blocks.length - 1];
    var next = { x: x, width: prev.width };
    var res = calculateOverlap(prev, next);
    var overlap = res.overlap;
    var offset = res.offset;

    if (isMissed(overlap)) {
      state.gameOver = true;
      return { missed: true, perfect: false, overlap: 0, offset: offset, score: 0 };
    }

    var perfect = Math.abs(offset) === 0;
    var placementScore = computePlacementScore(offset, prev.width);
    state.score += placementScore;

    var newWidth = Math.max(state.minWidth, nextBlockWidth(prev.width, overlap));
    state.blocks.push({ x: Math.max(prev.x, next.x), width: newWidth });
    state.level++;

    return { missed: false, perfect: perfect, overlap: overlap, offset: offset, score: placementScore };
  }

  function isGameOver(state) {
    return state.gameOver;
  }

  function getTowerHeight(state) {
    return state.blocks.length - 1;
  }

  /* ---------- Export ---------- */
  window.TowerStackLogic = {
    calculateOverlap: calculateOverlap,
    isMissed: isMissed,
    computePlacementScore: computePlacementScore,
    nextBlockWidth: nextBlockWidth,
    createTowerState: createTowerState,
    placeBlock: placeBlock,
    isGameOver: isGameOver,
    getTowerHeight: getTowerHeight,
  };
})();