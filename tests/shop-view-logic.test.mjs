/**
 * Shop-View-Logic Tests (TDD)
 *
 * Testet die UI-Logik fuer den Unlock-Shop:
 * - buildShopItems: Anzeige-Daten fuer Shop-Karten
 * - getOwnedCharacterIds: welche Charaktere im Picker sichtbar sind
 * - purchaseFeedback: Rueckmeldungstext nach Kauf
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildShopItems,
  getOwnedCharacterIds,
  purchaseFeedback,
  getSelectedCharacter,
} from '../js/shop-view-logic.js';

/* ---------- buildShopItems ---------- */

test('buildShopItems: gibt Array mit allen Unlocks zurueck', () => {
  const prog = { stars: 0, totalXp: 0, level: 0, gamesPlayed: 0 };
  const unlockState = { owned: { char_rocket: true } };
  const items = buildShopItems(prog, unlockState);
  assert.ok(Array.isArray(items));
  assert.ok(items.length >= 8, 'Mindestens 8 Items (8 Charaktere + 3 Trails = 11)');
});

test('buildShopItems: jedes Item hat id, name, icon, price, type, owned, affordable', () => {
  const prog = { stars: 50, totalXp: 0, level: 0, gamesPlayed: 0 };
  const unlockState = { owned: { char_rocket: true } };
  const items = buildShopItems(prog, unlockState);
  for (const item of items) {
    assert.ok(typeof item.id === 'string', 'id fehlt');
    assert.ok(typeof item.name === 'string', 'name fehlt');
    assert.ok(typeof item.icon === 'string', 'icon fehlt');
    assert.ok(typeof item.price === 'number', 'price fehlt');
    assert.ok(typeof item.type === 'string', 'type fehlt');
    assert.ok(typeof item.owned === 'boolean', 'owned fehlt');
    assert.ok(typeof item.affordable === 'boolean', 'affordable fehlt');
  }
});

test('buildShopItems: owned Item hat affordable=false', () => {
  const prog = { stars: 1000 };
  const unlockState = { owned: { char_rocket: true } };
  const items = buildShopItems(prog, unlockState);
  const rocket = items.find(i => i.id === 'char_rocket');
  assert.equal(rocket.owned, true);
  assert.equal(rocket.affordable, false);
});

test('buildShopItems: nicht-owned Item mit genug Sternen ist affordable', () => {
  const prog = { stars: 100 };
  const unlockState = { owned: { char_rocket: true } };
  const items = buildShopItems(prog, unlockState);
  const cat = items.find(i => i.id === 'char_cat');
  if (cat) {
    assert.equal(cat.owned, false);
    assert.equal(cat.affordable, true);
  }
});

test('buildShopItems: nicht-owned Item mit zu wenigen Sternen ist nicht affordable', () => {
  const prog = { stars: 5 };
  const unlockState = { owned: { char_rocket: true } };
  const items = buildShopItems(prog, unlockState);
  const expensive = items.find(i => i.price > 5 && !i.owned);
  if (expensive) {
    assert.equal(expensive.affordable, false);
  }
});

test('buildShopItems: Charaktere zuerst, dann Trails', () => {
  const prog = { stars: 0 };
  const unlockState = { owned: { char_rocket: true } };
  const items = buildShopItems(prog, unlockState);
  const firstTrailIdx = items.findIndex(i => i.type === 'trail');
  const lastCharIdx = items.length - 1 - [...items].reverse().findIndex(i => i.type === 'character');
  if (firstTrailIdx >= 0 && lastCharIdx >= 0) {
    assert.ok(firstTrailIdx > lastCharIdx, 'Trails kommen nach Charakteren');
  }
});

/* ---------- getOwnedCharacterIds ---------- */

test('getOwnedCharacterIds: gibt Array von character-IDs zurueck die owned sind', () => {
  const unlockState = { owned: { char_rocket: true, char_cat: true, trail_sparkle: true } };
  const ids = getOwnedCharacterIds(unlockState);
  assert.ok(Array.isArray(ids));
  assert.ok(ids.includes('char_rocket'));
  assert.ok(ids.includes('char_cat'));
  assert.ok(!ids.includes('trail_sparkle'), 'Trails duerfen nicht enthalten sein');
});

test('getOwnedCharacterIds: nur true-Eintraege werden zurueckgegeben', () => {
  const unlockState = { owned: { char_rocket: true, char_cat: false, char_fox: true } };
  const ids = getOwnedCharacterIds(unlockState);
  assert.ok(ids.includes('char_rocket'));
  assert.ok(ids.includes('char_fox'));
  assert.ok(!ids.includes('char_cat'));
});

test('getOwnedCharacterIds: leeres owned → leeres Array', () => {
  const unlockState = { owned: {} };
  const ids = getOwnedCharacterIds(unlockState);
  assert.equal(ids.length, 0);
});

/* ---------- getSelectedCharacter ---------- */

test('getSelectedCharacter: gibt Icon zurueck wenn ID in UNLOCKS', () => {
  const result = getSelectedCharacter('char_rocket');
  assert.ok(typeof result === 'string');
  assert.ok(result.length > 0);
});

test('getSelectedCharacter: unbekannte ID → null', () => {
  const result = getSelectedCharacter('nonexistent');
  assert.equal(result, null);
});

/* ---------- purchaseFeedback ---------- */

test('purchaseFeedback: erfolgreicher Kauf → positive Nachricht', () => {
  const result = { success: true };
  const msg = purchaseFeedback(result);
  assert.ok(typeof msg === 'string');
  assert.ok(msg.length > 0);
  assert.ok(!msg.toLowerCase().includes('fehl'), 'Sollte nicht von Fehler sprechen');
});

test('purchaseFeedback: insufficient_stars → Hinweis auf zu wenige Sterne', () => {
  const result = { success: false, reason: 'insufficient_stars' };
  const msg = purchaseFeedback(result);
  assert.ok(typeof msg === 'string');
  assert.ok(msg.toLowerCase().includes('stern') || msg.toLowerCase().includes('genug'),
    `Sollte Sterne erwaehnen, sagt: "${msg}"`);
});

test('purchaseFeedback: already owned → Hinweis', () => {
  const result = { success: false, reason: 'owned' };
  const msg = purchaseFeedback(result);
  assert.ok(typeof msg === 'string');
  assert.ok(msg.length > 0);
});

test('purchaseFeedback: unknown reason → generische Nachricht', () => {
  const result = { success: false, reason: 'unknown' };
  const msg = purchaseFeedback(result);
  assert.ok(typeof msg === 'string');
  assert.ok(msg.length > 0);
});