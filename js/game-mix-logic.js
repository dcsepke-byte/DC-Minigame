/**
 * Game Mix — Spiellogik (browser-frei, testbar)
 *
 * Kategorisiert Minispiele in zwei Mix-Gruppen:
 *  - 'action'  = die 10 neuen, tieferen Spiele (Action Mix)
 *  - 'classic' = die alten, simplen Spiele (Classic Mix)
 *
 * Keine DOM-Abhaengigkeiten.
 */

/** IDs der 10 neuen Action-Spiele */
export const ACTION_GAME_IDS = new Set([
  'towerstack', 'bubblepop', 'ninjaslash', 'colorcatch', 'dodgeball',
  'bouncesurvival', 'quickdraw', 'rhythmtap', 'coindash', 'tileflip',
]);

/** Stabile Reihenfolge der Mix-Gruppen fuer die UI */
export const MIXES = ['action', 'classic'];

/**
 * Gibt den Mix einer Spiel-ID zurueck.
 * Unbekannte IDs fallen sicher auf 'classic' zurueck.
 * @param {string} id
 * @returns {'action'|'classic'}
 */
export function getGameMix(id) {
  return ACTION_GAME_IDS.has(id) ? 'action' : 'classic';
}

/**
 * Teilt eine Spiele-Liste in zwei Gruppen auf.
 * Reihenfolge innerhalb der Gruppen bleibt erhalten.
 * @param {Array<{id:string}>} list
 * @returns {{action:Array, classic:Array}}
 */
export function groupGamesByMix(list) {
  const groups = { action: [], classic: [] };
  for (const g of list) {
    groups[getGameMix(g.id)].push(g);
  }
  return groups;
}

/**
 * Anzeige-Name eines Mixes.
 * @param {'action'|'classic'} mix
 * @returns {string}
 */
export function getMixLabel(mix) {
  return mix === 'action' ? 'Action Mix' : 'Classic Mix';
}
