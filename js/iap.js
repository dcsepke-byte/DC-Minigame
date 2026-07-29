/**
 * IAP — In-App-Purchase Logik (ESM, testbar)
 *
 * Produkt-Definitionen, Kauf-Status, Premium-Freischaltung.
 * Keine DOM- oder Cordova-Abhaengigkeiten.
 *
 * cordova-plugin-purchase v13 API wird in iap-browser.js genutzt.
 */

/** @typedef {'premium_unlock'|'starter_pack'|'character_pack'|'trail_pack'|'star_pack_s'|'star_pack_m'|'star_pack_l'} ProductId */

/**
 * Alle IAP-Produkte mit Metadaten.
 * type: 'non_consumable' (einmalig) oder 'consumable' (wiederholbar)
 */
export const PRODUCTS = [
  { id: 'premium_unlock',  type: 'non_consumable', price: '4,99 €',  name: 'Premium',        icon: '👑', desc: 'Alle Charaktere & Trails + Gold-Rakete + Regenbogen-Trail', stars: 0 },
  { id: 'starter_pack',    type: 'non_consumable', price: '1,99 €',  name: 'Starter Pack',   icon: '🎁', desc: '2 Charaktere + 1 Trail + 50 Sterne', stars: 50 },
  { id: 'character_pack',  type: 'non_consumable', price: '2,99 €',  name: 'Character Pack', icon: '🎭', desc: '3 zufaellige Charaktere', stars: 0 },
  { id: 'trail_pack',      type: 'non_consumable', price: '1,99 €',  name: 'Trail Pack',     icon: '✨', desc: 'Alle 3 Trails', stars: 0 },
  { id: 'star_pack_s',     type: 'consumable',     price: '0,99 €',  name: '100 Sterne',     icon: '⭐', desc: '100 Sterne', stars: 100 },
  { id: 'star_pack_m',     type: 'consumable',     price: '3,99 €',  name: '500 Sterne',     icon: '🌟', desc: '500 Sterne', stars: 500 },
  { id: 'star_pack_l',     type: 'consumable',     price: '7,99 €',  name: '1200 Sterne',    icon: '💫', desc: '1200 Sterne', stars: 1200 },
];

const PRODUCT_BY_ID = Object.fromEntries(PRODUCTS.map(p => [p.id, p]));

/**
 * Erstellt den IAP-State fuer einen neuen Spieler.
 * @returns {{purchased:Object<string,boolean>, premium:boolean}}
 */
export function createIapState() {
  return { purchased: {}, premium: false };
}

/**
 * Prueft ob ein Produkt bereits gekauft wurde.
 * @param {{purchased:Object<string,boolean>, premium:boolean}} state
 * @param {ProductId} id
 * @returns {boolean}
 */
export function isPurchased(state, id) {
  if (state.premium) {
    const product = PRODUCT_BY_ID[id];
    if (product && product.type === 'non_consumable' && id !== 'premium_unlock') return true;
  }
  return !!state.purchased[id];
}

/**
 * Markiert ein Produkt als gekauft.
 * Premium schaltet ALLES frei.
 * @param {{purchased:Object<string,boolean>, premium:boolean}} state - wird mutiert
 * @param {ProductId} id
 * @returns {{success:boolean, starsAwarded:number}}
 */
export function markPurchased(state, id) {
  const product = PRODUCT_BY_ID[id];
  if (!product) return { success: false, starsAwarded: 0 };
  state.purchased[id] = true;
  if (id === 'premium_unlock') {
    state.premium = true;
    // Premium schaltet alle non-consumables mit frei
    for (const p of PRODUCTS) {
      if (p.type === 'non_consumable') state.purchased[p.id] = true;
    }
  }
  return { success: true, starsAwarded: product.stars || 0 };
}

/**
 * Gibt alle Produkte zurueck, die im Shop angezeigt werden sollen.
 * @param {{purchased:Object<string,boolean>, premium:boolean}} state
 * @returns {Array} Produkte mit purchased-Flag
 */
export function getShopProducts(state) {
  return PRODUCTS.map(p => ({
    ...p,
    purchased: isPurchased(state, p.id),
  }));
}

/**
 * Prueft ob Premium freigeschaltet ist.
 * @param {{premium:boolean}} state
 * @returns {boolean}
 */
export function isPremium(state) {
  return !!state.premium;
}

/**
 * Gibt alle durch Premium freischaltbaren Unlock-IDs zurueck.
 * Wird genutzt um Unlocks automatisch freizuschalten.
 * @returns {string[]}
 */
export function getPremiumUnlockIds() {
  return ['char_cat', 'char_fox', 'char_frog', 'char_panda', 'char_unicorn', 'char_robot', 'char_octopus',
          'trail_sparkle', 'trail_rainbow', 'trail_fire'];
}
