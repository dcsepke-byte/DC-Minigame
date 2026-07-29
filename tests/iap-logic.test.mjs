/**
 * IAP Logic — Unit Tests (ESM)
 *
 * Testet createIapState, isPurchased, markPurchased,
 * getShopProducts, isPremium, getPremiumUnlockIds.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  PRODUCTS,
  createIapState,
  isPurchased,
  markPurchased,
  getShopProducts,
  isPremium,
  getPremiumUnlockIds,
} from '../js/iap.js';

describe('IAP Logic', () => {

  describe('createIapState', () => {
    it('erstellt leeren State', () => {
      const s = createIapState();
      assert.deepEqual(s.purchased, {});
      assert.equal(s.premium, false);
    });
  });

  describe('isPurchased', () => {
    it('nichts gekauft => false', () => {
      const s = createIapState();
      assert.equal(isPurchased(s, 'premium_unlock'), false);
      assert.equal(isPurchased(s, 'star_pack_s'), false);
    });

    it('gekauftes Produkt => true', () => {
      const s = createIapState();
      s.purchased['star_pack_s'] = true;
      assert.equal(isPurchased(s, 'star_pack_s'), true);
    });

    it('premium schaltet alle non-consumables frei', () => {
      const s = createIapState();
      s.premium = true;
      assert.equal(isPurchased(s, 'starter_pack'), true);
      assert.equal(isPurchased(s, 'character_pack'), true);
      assert.equal(isPurchased(s, 'trail_pack'), true);
    });

    it('premium schaltet premium_unlock selbst NICHT automatisch frei', () => {
      const s = createIapState();
      s.premium = true;
      assert.equal(isPurchased(s, 'premium_unlock'), false);
    });

    it('premium schaltet consumables NICHT frei', () => {
      const s = createIapState();
      s.premium = true;
      assert.equal(isPurchased(s, 'star_pack_s'), false);
    });
  });

  describe('markPurchased', () => {
    it('markiert Produkt als gekauft', () => {
      const s = createIapState();
      const r = markPurchased(s, 'star_pack_s');
      assert.equal(r.success, true);
      assert.equal(r.starsAwarded, 100);
      assert.equal(s.purchased['star_pack_s'], true);
    });

    it('premium_unlock schaltet premium und alle non-consumables frei', () => {
      const s = createIapState();
      const r = markPurchased(s, 'premium_unlock');
      assert.equal(r.success, true);
      assert.equal(s.premium, true);
      assert.equal(s.purchased['premium_unlock'], true);
      assert.equal(s.purchased['starter_pack'], true);
      assert.equal(s.purchased['character_pack'], true);
      assert.equal(s.purchased['trail_pack'], true);
    });

    it('unbekanntes Produkt => success false', () => {
      const s = createIapState();
      const r = markPurchased(s, 'nicht_existent');
      assert.equal(r.success, false);
      assert.equal(r.starsAwarded, 0);
    });

    it('star_pack_s gibt 100 Sterne', () => {
      const s = createIapState();
      const r = markPurchased(s, 'star_pack_s');
      assert.equal(r.starsAwarded, 100);
    });

    it('star_pack_m gibt 500 Sterne', () => {
      const s = createIapState();
      const r = markPurchased(s, 'star_pack_m');
      assert.equal(r.starsAwarded, 500);
    });

    it('star_pack_l gibt 1200 Sterne', () => {
      const s = createIapState();
      const r = markPurchased(s, 'star_pack_l');
      assert.equal(r.starsAwarded, 1200);
    });

    it('starter_pack gibt 50 Sterne', () => {
      const s = createIapState();
      const r = markPurchased(s, 'starter_pack');
      assert.equal(r.starsAwarded, 50);
    });
  });

  describe('getShopProducts', () => {
    it('gibt alle 7 Produkte zurueck', () => {
      const s = createIapState();
      const products = getShopProducts(s);
      assert.equal(products.length, 7);
    });

    it('markiert gekaufte Produkte', () => {
      const s = createIapState();
      s.purchased['star_pack_s'] = true;
      const products = getShopProducts(s);
      const sp = products.find(p => p.id === 'star_pack_s');
      assert.equal(sp.purchased, true);
    });

    it('premium markiert alle non-consumables als purchased', () => {
      const s = createIapState();
      s.premium = true;
      const products = getShopProducts(s);
      const premium = products.find(p => p.id === 'premium_unlock');
      assert.equal(premium.purchased, false); // premium selbst nicht
      const starter = products.find(p => p.id === 'starter_pack');
      assert.equal(starter.purchased, true);
    });
  });

  describe('isPremium', () => {
    it('false ohne premium', () => {
      assert.equal(isPremium(createIapState()), false);
    });

    it('true mit premium', () => {
      const s = createIapState();
      s.premium = true;
      assert.equal(isPremium(s), true);
    });
  });

  describe('getPremiumUnlockIds', () => {
    it('gibt alle 10 Unlock-IDs zurueck', () => {
      const ids = getPremiumUnlockIds();
      assert.equal(ids.length, 10);
      assert(ids.includes('char_cat'));
      assert(ids.includes('char_fox'));
      assert(ids.includes('char_frog'));
      assert(ids.includes('char_panda'));
      assert(ids.includes('char_unicorn'));
      assert(ids.includes('char_robot'));
      assert(ids.includes('char_octopus'));
      assert(ids.includes('trail_sparkle'));
      assert(ids.includes('trail_rainbow'));
      assert(ids.includes('trail_fire'));
    });
  });

  describe('PRODUCTS', () => {
    it('hat 7 Produkte', () => {
      assert.equal(PRODUCTS.length, 7);
    });

    it('premium_unlock ist non_consumable', () => {
      const p = PRODUCTS.find(p => p.id === 'premium_unlock');
      assert.equal(p.type, 'non_consumable');
    });

    it('star_packs sind consumable', () => {
      for (const id of ['star_pack_s', 'star_pack_m', 'star_pack_l']) {
        const p = PRODUCTS.find(p => p.id === id);
        assert.equal(p.type, 'consumable');
      }
    });

    it('alle Produkte haben id, type, price, name, icon, desc', () => {
      for (const p of PRODUCTS) {
        assert(p.id);
        assert(p.type);
        assert(p.price);
        assert(p.name);
        assert(p.icon);
        assert(p.desc);
      }
    });
  });

});
