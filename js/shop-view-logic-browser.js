/**
 * Shop-View-Logic — Browser-Kompatibel (IIFE)
 *
 * Gleiche Logik wie shop-view-logic.js (ESM),
 * aber als IIFE fuer <script>-Tag ohne Module-Loader.
 * Nutzt window.MetaProgressionLogic (MPL) fuer UNLOCKS etc.
 */
(function () {
  'use strict';

  var MPL = window.MetaProgressionLogic;
  if (!MPL) return;

  function buildShopItems(prog, unlockState) {
    var chars = MPL.UNLOCKS.filter(function(u) { return u.type === 'character'; });
    var trails = MPL.UNLOCKS.filter(function(u) { return u.type === 'trail'; });
    return chars.concat(trails).map(function(u) {
      return {
        id: u.id,
        name: u.name,
        icon: u.icon,
        price: u.price,
        type: u.type,
        color: u.color || null,
        owned: MPL.isOwned(unlockState, u.id),
        affordable: MPL.canAfford(prog, unlockState, u.id),
      };
    });
  }

  function getOwnedCharacterIds(unlockState) {
    return MPL.UNLOCKS
      .filter(function(u) { return u.type === 'character' && unlockState.owned[u.id]; })
      .map(function(u) { return u.id; });
  }

  function getSelectedCharacter(id) {
    var item = MPL.UNLOCKS.find(function(u) { return u.id === id; });
    if (!item || item.type !== 'character') return null;
    return item.icon;
  }

  function purchaseFeedback(result) {
    if (result.success) return 'Freigeschaltet! \u{1F389}';
    if (result.reason === 'insufficient_stars') return 'Nicht genug Sterne!';
    if (result.reason === 'owned') return 'Bereits freigeschaltet.';
    return 'Kauf nicht moeglich.';
  }

  window.ShopViewLogic = {
    buildShopItems: buildShopItems,
    getOwnedCharacterIds: getOwnedCharacterIds,
    getSelectedCharacter: getSelectedCharacter,
    purchaseFeedback: purchaseFeedback,
  };
})();