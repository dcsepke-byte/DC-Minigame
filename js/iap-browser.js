/**
 * IAP — Browser-Kompatibel (IIFE)
 *
 * Nutzt cordova-plugin-purchase (CdvPurchase) fuer echte IAPs.
 * Fallback: localStorage-only fuer Web/Dev.
 */
(function () {
  'use strict';

  var PRODUCTS = [
    { id: 'premium_unlock',  type: 'non_consumable', price: '4,99 €',  name: 'Premium',        icon: '\u{1F451}', desc: 'Alle Charaktere & Trails + Gold-Rakete + Regenbogen-Trail', stars: 0 },
    { id: 'starter_pack',    type: 'non_consumable', price: '1,99 €',  name: 'Starter Pack',   icon: '\u{1F381}', desc: '2 Charaktere + 1 Trail + 50 Sterne', stars: 50 },
    { id: 'character_pack',  type: 'non_consumable', price: '2,99 €',  name: 'Character Pack', icon: '\u{1F3AD}', desc: '3 zufaellige Charaktere', stars: 0 },
    { id: 'trail_pack',      type: 'non_consumable', price: '1,99 €',  name: 'Trail Pack',     icon: '\u{2728}', desc: 'Alle 3 Trails', stars: 0 },
    { id: 'star_pack_s',     type: 'consumable',     price: '0,99 €',  name: '100 Sterne',     icon: '\u{2B50}', desc: '100 Sterne', stars: 100 },
    { id: 'star_pack_m',     type: 'consumable',     price: '3,99 €',  name: '500 Sterne',     icon: '\u{1F31F}', desc: '500 Sterne', stars: 500 },
    { id: 'star_pack_l',     type: 'consumable',     price: '7,99 €',  name: '1200 Sterne',    icon: '\u{1F4AB}', desc: '1200 Sterne', stars: 1200 },
  ];

  var PRODUCT_BY_ID = {};
  PRODUCTS.forEach(function(p) { PRODUCT_BY_ID[p.id] = p; });

  function createIapState() {
    return { purchased: {}, premium: false };
  }

  function isPurchased(state, id) {
    if (state.premium) {
      var product = PRODUCT_BY_ID[id];
      if (product && product.type === 'non_consumable' && id !== 'premium_unlock') return true;
    }
    return !!state.purchased[id];
  }

  function markPurchased(state, id) {
    var product = PRODUCT_BY_ID[id];
    if (!product) return { success: false, starsAwarded: 0 };
    state.purchased[id] = true;
    if (id === 'premium_unlock') {
      state.premium = true;
      PRODUCTS.forEach(function(p) {
        if (p.type === 'non_consumable') state.purchased[p.id] = true;
      });
    }
    return { success: true, starsAwarded: product.stars || 0 };
  }

  function getShopProducts(state) {
    return PRODUCTS.map(function(p) {
      return {
        id: p.id, type: p.type, price: p.price, name: p.name,
        icon: p.icon, desc: p.desc, stars: p.stars,
        purchased: isPurchased(state, p.id),
      };
    });
  }

  function isPremium(state) {
    return !!state.premium;
  }

  function getPremiumUnlockIds() {
    return ['char_cat','char_fox','char_frog','char_panda','char_unicorn','char_robot','char_octopus',
            'trail_sparkle','trail_rainbow','trail_fire'];
  }

  /* ---------- Capacitor Bridge ---------- */

  var store = null;
  var iapReady = false;
  var pendingCallbacks = {};

  /**
   * Initialisiert CdvPurchase Store.
   * Registriert alle Produkte und startet Listener.
   * @param {function} onReady - called when store is ready
   */
  function initStore(onReady) {
    if (typeof CdvPurchase === 'undefined') {
      console.log('[IAP] CdvPurchase nicht verfuegbar — Web-Modus');
      iapReady = true;
      if (onReady) onReady();
      return;
    }
    try {
      store = CdvPurchase.store;
      var productIds = PRODUCTS.map(function(p) { return p.id; });
      store.register(productIds.map(function(id) {
        var p = PRODUCT_BY_ID[id];
        return { id: id, type: CdvPurchase.ProductType[p.type === 'consumable' ? 'CONSUMABLE' : 'NON_CONSUMABLE'] };
      }));

      store.when().productUpdated(function(product) {
        console.log('[IAP] Product updated:', product.id, product.canPurchase);
      });

      store.when().approved(function(transaction) {
        console.log('[IAP] Approved:', transaction.products.map(function(p) { return p.id; }));
        transaction.verify('https://partyarena.app/api/verify-receipt');
      });

      store.when().verified(function(receipt) {
        console.log('[IAP] Verified:', receipt.id);
        receipt.finish();
        var cb = pendingCallbacks[receipt.id];
        if (cb) { cb(true); delete pendingCallbacks[receipt.id]; }
      });

      store.when().unverified(function(receipt) {
        console.warn('[IAP] Unverified:', receipt.id);
        receipt.finish();
        var cb = pendingCallbacks[receipt.id];
        if (cb) { cb(false); delete pendingCallbacks[receipt.id]; }
      });

      store.initialize().then(function() {
        iapReady = true;
        console.log('[IAP] Store ready');
        if (onReady) onReady();
      }).catch(function(err) {
        console.error('[IAP] Store init failed:', err);
        iapReady = true; // fallback
        if (onReady) onReady();
      });
    } catch (e) {
      console.error('[IAP] Store init error:', e);
      iapReady = true;
      if (onReady) onReady();
    }
  }

  /**
   * Startet einen Kauf.
   * @param {string} productId
   * @returns {Promise<{success:boolean, error?:string}>}
   */
  function purchase(productId) {
    return new Promise(function(resolve) {
      if (!store || !iapReady) {
        // Web-Fallback: simuliere Kauf
        console.log('[IAP] Web-Fallback purchase:', productId);
        resolve({ success: true });
        return;
      }
      var product = store.get(productId);
      if (!product || !product.canPurchase) {
        resolve({ success: false, error: 'Produkt nicht verfuegbar' });
        return;
      }
      pendingCallbacks[productId] = function(ok) {
        resolve({ success: ok });
      };
      store.order(product).catch(function(err) {
        console.error('[IAP] Order failed:', err);
        delete pendingCallbacks[productId];
        resolve({ success: false, error: err.message || 'Kauf fehlgeschlagen' });
      });
    });
  }

  /**
   * Stellt fruehere Kaeufe wieder her.
   * @returns {Promise<string[]>} Array von gekauften Produkt-IDs
   */
  function restorePurchases() {
    return new Promise(function(resolve) {
      if (!store || !iapReady) {
        resolve([]);
        return;
      }
      store.restorePurchases().then(function() {
        var owned = [];
        PRODUCTS.forEach(function(p) {
          var product = store.get(p.id);
          if (product && product.owned) owned.push(p.id);
        });
        resolve(owned);
      }).catch(function() {
        resolve([]);
      });
    });
  }

  window.IapLogic = {
    PRODUCTS: PRODUCTS,
    createIapState: createIapState,
    isPurchased: isPurchased,
    markPurchased: markPurchased,
    getShopProducts: getShopProducts,
    isPremium: isPremium,
    getPremiumUnlockIds: getPremiumUnlockIds,
    initStore: initStore,
    purchase: purchase,
    restorePurchases: restorePurchases,
  };
})();
