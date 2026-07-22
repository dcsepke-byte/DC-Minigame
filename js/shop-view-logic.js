/**
 * Shop-View-Logic — reine Funktionen fuer Shop-Anzeige (ESM)
 *
 * Nutzt MetaProgressionLogic-Daten (UNLOCKS) und baut
 * Anzeige-Daten fuer den Unlock-Shop auf.
 */
import {
  UNLOCKS,
  isOwned,
  canAfford,
} from './meta-progression-logic.js';

/**
 * Baut Anzeige-Daten fuer alle Shop-Items.
 * Charaktere zuerst, dann Trails.
 * @param {object} prog - Progression-State mit .stars
 * @param {object} unlockState - Unlock-State mit .owned
 * @returns {Array} Shop-Items mit id, name, icon, price, type, owned, affordable
 */
export function buildShopItems(prog, unlockState) {
  const chars = UNLOCKS.filter(u => u.type === 'character');
  const trails = UNLOCKS.filter(u => u.type === 'trail');
  return [...chars, ...trails].map(u => ({
    id: u.id,
    name: u.name,
    icon: u.icon,
    price: u.price,
    type: u.type,
    color: u.color || null,
    owned: isOwned(unlockState, u.id),
    affordable: canAfford(prog, unlockState, u.id),
  }));
}

/**
 * Gibt alle Character-IDs zurueck die owned sind.
 * @param {object} unlockState - Unlock-State mit .owned
 * @returns {string[]} Array von character-IDs
 */
export function getOwnedCharacterIds(unlockState) {
  return UNLOCKS
    .filter(u => u.type === 'character' && unlockState.owned[u.id])
    .map(u => u.id);
}

/**
 * Gibt das Icon eines Charakters anhand seiner ID zurueck.
 * @param {string} id - Character-ID
 * @returns {string|null} Icon oder null
 */
export function getSelectedCharacter(id) {
  const item = UNLOCKS.find(u => u.id === id);
  if (!item || item.type !== 'character') return null;
  return item.icon;
}

/**
 * Erzeugt Rueckmeldungstext nach einem Kaufversuch.
 * @param {object} result - Ergebnis von purchaseUnlock
 * @returns {string} Nachricht fuer den Spieler
 */
export function purchaseFeedback(result) {
  if (result.success) {
    return 'Freigeschaltet! 🎉';
  }
  if (result.reason === 'insufficient_stars') {
    return 'Nicht genug Sterne!';
  }
  if (result.reason === 'owned') {
    return 'Bereits freigeschaltet.';
  }
  return 'Kauf nicht moeglich.';
}