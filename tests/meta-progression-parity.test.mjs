/**
 * Paritaets-Test: meta-progression-logic.js (ESM) vs meta-progression-logic-browser.js (IIFE)
 *
 * Stellt sicher dass beide Implementierungen identische Ergebnisse liefern.
 * Verwendet JSON.stringify-Vergleich wegen VM-Context Prototype-Unterschieden.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as ESM from '../js/meta-progression-logic.js';

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const browserCode = readFileSync(join(__dirname, '..', 'js', 'meta-progression-logic-browser.js'), 'utf-8');

const window = {};
const sandbox = { window, Math, console };
const vm = await import('node:vm');
const ctx = vm.createContext(sandbox);
vm.runInContext(browserCode, ctx);
const IIFE = window.MetaProgressionLogic;

/* ---------- Einfache Funktionen ---------- */

const scalarCases = [
  ['xpForLevel', [1]],
  ['xpForLevel', [2]],
  ['xpForLevel', [5]],
  ['xpForLevel', [10]],
  ['xpForLevel', [0]],
  ['totalXpForLevel', [0]],
  ['totalXpForLevel', [1]],
  ['totalXpForLevel', [5]],
  ['totalXpForLevel', [10]],
  ['levelFromXp', [0]],
  ['levelFromXp', [100]],
  ['levelFromXp', [250]],
  ['levelFromXp', [1000]],
  ['xpToNextLevel', [0]],
  ['xpToNextLevel', [50]],
  ['xpToNextLevel', [100]],
  ['currentLevelXp', [0]],
  ['currentLevelXp', [50]],
  ['currentLevelXp', [250]],
  ['xpFromGameScore', [0]],
  ['xpFromGameScore', [100]],
  ['xpFromGameScore', [500]],
  ['xpFromGameScore', [10000]],
  ['starRewardForLevel', [0]],
  ['starRewardForLevel', [1]],
  ['starRewardForLevel', [10]],
  ['starsFromPlacement', [1, 4]],
  ['starsFromPlacement', [2, 4]],
  ['starsFromPlacement', [3, 4]],
  ['starsFromPlacement', [4, 4]],
];

for (const [fn, args] of scalarCases) {
  test(`Paritaet: ${fn}(${args.join(', ')})`, () => {
    const esmResult = ESM[fn](...args);
    const iifeResult = IIFE[fn](...args);
    assert.equal(esmResult, iifeResult);
  });
}

/* ---------- State-basierte Tests ---------- */

test('Paritaet: createProgression', () => {
  const e = ESM.createProgression();
  const i = IIFE.createProgression();
  assert.equal(JSON.stringify(e), JSON.stringify(i));
});

test('Paritaet: addXp Sequenz', () => {
  const esmState = ESM.createProgression();
  const iifeState = IIFE.createProgression();
  const amounts = [50, 60, 200, 10, -5, 500, 100, 1000];
  for (const amt of amounts) {
    const esmResult = ESM.addXp(esmState, amt);
    const iifeResult = IIFE.addXp(iifeState, amt);
    assert.equal(JSON.stringify(esmResult), JSON.stringify(iifeResult));
    assert.equal(JSON.stringify(esmState), JSON.stringify(iifeState));
  }
});

test('Paritaet: applyGameResult Sequenz', () => {
  const esmState = ESM.createProgression();
  const iifeState = IIFE.createProgression();
  const results = [
    { score: 500, placement: 1, playerCount: 4 },
    { score: 200, placement: 3, playerCount: 4 },
    { score: 1000, placement: 2, playerCount: 6 },
    { score: 0, placement: 4, playerCount: 4 },
  ];
  for (const r of results) {
    const esmResult = ESM.applyGameResult(esmState, r);
    const iifeResult = IIFE.applyGameResult(iifeState, r);
    assert.equal(JSON.stringify(esmResult), JSON.stringify(iifeResult));
    assert.equal(JSON.stringify(esmState), JSON.stringify(iifeState));
  }
});

/* ---------- Achievement Paritaet ---------- */

test('Paritaet: ACHIEVEMENTS Struktur', () => {
  assert.equal(ESM.ACHIEVEMENTS.length, IIFE.ACHIEVEMENTS.length);
  for (let i = 0; i < ESM.ACHIEVEMENTS.length; i++) {
    const e = ESM.ACHIEVEMENTS[i];
    const f = IIFE.ACHIEVEMENTS[i];
    assert.equal(e.id, f.id);
    assert.equal(e.label, f.label);
    assert.equal(e.desc, f.desc);
    assert.equal(e.icon, f.icon);
  }
});

test('Paritaet: checkAchievements', () => {
  const esmAch = ESM.createAchievementState();
  const iifeAch = IIFE.createAchievementState();
  const progs = [
    { gamesPlayed: 1, level: 0, stars: 0, totalXp: 50 },
    { gamesPlayed: 10, level: 5, stars: 60, totalXp: 1000 },
    { gamesPlayed: 50, level: 10, stars: 200, totalXp: 5000 },
  ];
  for (const prog of progs) {
    const esmNewly = ESM.checkAchievements(prog, esmAch);
    const iifeNewly = IIFE.checkAchievements(prog, iifeAch);
    assert.equal(JSON.stringify(esmNewly), JSON.stringify(iifeNewly));
    assert.equal(JSON.stringify(esmAch.unlocked), JSON.stringify(iifeAch.unlocked));
  }
});

/* ---------- Unlock Paritaet ---------- */

test('Paritaet: UNLOCKS Struktur', () => {
  assert.equal(ESM.UNLOCKS.length, IIFE.UNLOCKS.length);
  for (let i = 0; i < ESM.UNLOCKS.length; i++) {
    const e = ESM.UNLOCKS[i];
    const f = IIFE.UNLOCKS[i];
    assert.equal(e.id, f.id);
    assert.equal(e.name, f.name);
    assert.equal(e.price, f.price);
    assert.equal(e.type, f.type);
    assert.equal(e.icon, f.icon);
  }
});

test('Paritaet: createUnlockState', () => {
  const e = ESM.createUnlockState();
  const i = IIFE.createUnlockState();
  assert.equal(JSON.stringify(e.owned), JSON.stringify(i.owned));
});

test('Paritaet: purchaseUnlock Sequenz', () => {
  const esmProg = { stars: 200 };
  const iifeProg = { stars: 200 };
  const esmUnlock = ESM.createUnlockState();
  const iifeUnlock = IIFE.createUnlockState();
  const purchases = ['char_cat', 'char_fox', 'char_unicorn', 'trail_fire', 'trail_rainbow'];
  for (const id of purchases) {
    const e = ESM.purchaseUnlock(esmProg, esmUnlock, id);
    const f = IIFE.purchaseUnlock(iifeProg, iifeUnlock, id);
    assert.equal(JSON.stringify(e), JSON.stringify(f));
    assert.equal(esmProg.stars, iifeProg.stars);
    assert.equal(JSON.stringify(esmUnlock.owned), JSON.stringify(iifeUnlock.owned));
  }
});