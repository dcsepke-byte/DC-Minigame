/**
 * Meta-Progression — Unlock-System Tests (TDD)
 *
 * Testet Charakter-Unlocks, Cosmetic-Shop, Sternen-Ausgaben.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  UNLOCKS,
  createUnlockState,
  purchaseUnlock,
  canAfford,
  getAvailableUnlocks,
  getOwnedUnlocks,
  isOwned,
} from '../js/meta-progression-logic.js';

/* ---------- UNLOCKS: Definitionen ---------- */

test('UNLOCKS: ist Array mit mindestens 6 Eintraegen', () => {
  assert.ok(Array.isArray(UNLOCKS));
  assert.ok(UNLOCKS.length >= 6, `Mindestens 6 Unlocks, hat ${UNLOCKS.length}`);
});

test('UNLOCKS: jeder Eintrag hat id, name, price, type, icon', () => {
  for (const u of UNLOCKS) {
    assert.ok(typeof u.id === 'string', `id fehlt: ${JSON.stringify(u)}`);
    assert.ok(typeof u.name === 'string', `name fehlt bei ${u.id}`);
    assert.ok(typeof u.price === 'number' && u.price >= 0, `price fehlt bei ${u.id}`);
    assert.ok(typeof u.type === 'string', `type fehlt bei ${u.id}`);
    assert.ok(typeof u.icon === 'string', `icon fehlt bei ${u.id}`);
  }
});

test('UNLOCKS: ids eindeutig', () => {
  const ids = UNLOCKS.map(u => u.id);
  assert.equal(ids.length, new Set(ids).size);
});

/* ---------- createUnlockState ---------- */

test('createUnlockState: leerer Start mit Default-Freischaltungen', () => {
  const s = createUnlockState();
  assert.ok(typeof s.owned === 'object');
  // Mindestens ein Default-Charakter sollte frei sein
  const ownedCount = Object.values(s.owned).filter(Boolean).length;
  assert.ok(ownedCount >= 1, 'Mindestens 1 Default-Unlock');
});

/* ---------- isOwned ---------- */

test('isOwned: Default-Charakter ist owned', () => {
  const s = createUnlockState();
  const defaultChar = UNLOCKS.find(u => u.type === 'character' && u.price === 0);
  if (defaultChar) {
    assert.equal(isOwned(s, defaultChar.id), true);
  }
});

test('isOwned: nicht freigeschaltet → false', () => {
  const s = createUnlockState();
  const paid = UNLOCKS.find(u => u.price > 0);
  if (paid) {
    assert.equal(isOwned(s, paid.id), false);
  }
});

/* ---------- canAfford ---------- */

test('canAfford: genug Sterne → true', () => {
  const s = createUnlockState();
  const cheap = UNLOCKS.find(u => u.price > 0);
  if (cheap) {
    assert.equal(canAfford({ stars: cheap.price }, s, cheap.id), true);
  }
});

test('canAfford: zu wenige Sterne → false', () => {
  const s = createUnlockState();
  const expensive = UNLOCKS.find(u => u.price > 0);
  if (expensive) {
    assert.equal(canAfford({ stars: 0 }, s, expensive.id), false);
  }
});

test('canAfford: bereits owned → false (nicht erneut kaufbar)', () => {
  const s = createUnlockState();
  const owned = UNLOCKS.find(u => isOwned(s, u.id));
  if (owned) {
    assert.equal(canAfford({ stars: 1000 }, s, owned.id), false);
  }
});

/* ---------- purchaseUnlock ---------- */

test('purchaseUnlock: erfolgreicher Kauf zieht Sterne ab und markiert owned', () => {
  const s = createUnlockState();
  const prog = { stars: 100 };
  const item = UNLOCKS.find(u => u.price > 0 && !isOwned(s, u.id));
  if (item) {
    const result = purchaseUnlock(prog, s, item.id);
    assert.equal(result.success, true);
    assert.equal(prog.stars, 100 - item.price);
    assert.equal(isOwned(s, item.id), true);
  }
});

test('purchaseUnlock: zu wenige Sterne → success false', () => {
  const s = createUnlockState();
  const prog = { stars: 1 };
  const item = UNLOCKS.find(u => u.price > 5);
  if (item) {
    const result = purchaseUnlock(prog, s, item.id);
    assert.equal(result.success, false);
    assert.equal(isOwned(s, item.id), false);
  }
});

test('purchaseUnlock: bereits owned → success false', () => {
  const s = createUnlockState();
  const prog = { stars: 1000 };
  const owned = UNLOCKS.find(u => isOwned(s, u.id));
  if (owned) {
    const result = purchaseUnlock(prog, s, owned.id);
    assert.equal(result.success, false);
  }
});

/* ---------- getAvailableUnlocks / getOwnedUnlocks ---------- */

test('getAvailableUnlocks: gibt nur nicht-owned zurueck', () => {
  const s = createUnlockState();
  const available = getAvailableUnlocks(s);
  for (const u of available) {
    assert.equal(isOwned(s, u.id), false, `${u.id} sollte nicht owned sein`);
  }
});

test('getOwnedUnlocks: gibt nur owned zurueck', () => {
  const s = createUnlockState();
  const owned = getOwnedUnlocks(s);
  for (const u of owned) {
    assert.equal(isOwned(s, u.id), true, `${u.id} sollte owned sein`);
  }
});

/* ---------- Edge Cases ---------- */

test('purchaseUnlock: Sterne gehen nicht verloren bei fehlgeschlagenem Kauf', () => {
  const s = createUnlockState();
  const prog = { stars: 5 };
  const item = UNLOCKS.find(u => u.price > 10);
  if (item) {
    purchaseUnlock(prog, s, item.id);
    assert.equal(prog.stars, 5, 'Sterne sollten unveraendert bleiben');
  }
});