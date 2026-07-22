/**
 * Tile Flip — Paritaetstest: ESM-Logik vs Browser-IIFE-Logik
 *
 * Stellt sicher dass beide Implementierungen identische Ergebnisse liefern.
 * node --test tests/tile-flip-parity.test.mjs
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as ESM from '../js/tile-flip-logic.js';

/* Browser-IIFE in Node laden: window/this shim */
const sandbox = {};
global.window = sandbox;
await import('../js/tile-flip-logic-browser.js');
const IIFE = sandbox.TileFlipLogic;

const SEED = 12345;
const ROWS = 4, COLS = 4;

test('Paritaet: createTileFlipState erzeugt identische Tiles', () => {
  const a = ESM.createTileFlipState({ rows: ROWS, cols: COLS, seed: SEED });
  const b = IIFE.createTileFlipState({ rows: ROWS, cols: COLS, seed: SEED });
  assert.equal(a.tiles.length, b.tiles.length);
  for (let i = 0; i < a.tiles.length; i++) {
    assert.equal(a.tiles[i].symbol, b.tiles[i].symbol);
    assert.equal(a.tiles[i].flipped, b.tiles[i].flipped);
    assert.equal(a.tiles[i].matched, b.tiles[i].matched);
  }
  assert.equal(a.totalPairs, b.totalPairs);
  assert.equal(a.score, b.score);
  assert.equal(a.combo, b.combo);
  assert.equal(a.flips, b.flips);
});

test('Paritaet: flipTile identisch', () => {
  const a = ESM.createTileFlipState({ rows: ROWS, cols: COLS, seed: SEED });
  const b = IIFE.createTileFlipState({ rows: ROWS, cols: COLS, seed: SEED });
  const ra = ESM.flipTile(a, 0);
  const rb = IIFE.flipTile(b, 0);
  assert.equal(ra.flipped, rb.flipped);
  assert.equal(a.flips, b.flips);
  assert.equal(a.tiles[0].flipped, b.tiles[0].flipped);
});

test('Paritaet: checkMatch identisch bei Match', () => {
  const a = ESM.createTileFlipState({ rows: ROWS, cols: COLS, seed: SEED });
  const b = IIFE.createTileFlipState({ rows: ROWS, cols: COLS, seed: SEED });
  /* Finde gleiches Paar in beiden (gleicher Seed = gleiche Tiles) */
  let idx1 = -1, idx2 = -1;
  for (let i = 0; i < a.tiles.length; i++) {
    for (let j = i + 1; j < a.tiles.length; j++) {
      if (a.tiles[i].symbol === a.tiles[j].symbol) { idx1 = i; idx2 = j; break; }
    }
    if (idx1 >= 0) break;
  }
  ESM.flipTile(a, idx1);
  ESM.flipTile(a, idx2);
  IIFE.flipTile(b, idx1);
  IIFE.flipTile(b, idx2);
  const ra = ESM.checkMatch(a);
  const rb = IIFE.checkMatch(b);
  assert.equal(ra.matched, rb.matched);
  assert.equal(ra.points, rb.points);
  assert.equal(a.score, b.score);
  assert.equal(a.pairsFound, b.pairsFound);
});

test('Paritaet: checkMatch identisch bei Missmatch', () => {
  const a = ESM.createTileFlipState({ rows: ROWS, cols: COLS, seed: SEED });
  const b = IIFE.createTileFlipState({ rows: ROWS, cols: COLS, seed: SEED });
  let idx1 = -1, idx2 = -1;
  for (let i = 0; i < a.tiles.length; i++) {
    for (let j = i + 1; j < a.tiles.length; j++) {
      if (a.tiles[i].symbol !== a.tiles[j].symbol) { idx1 = i; idx2 = j; break; }
    }
    if (idx1 >= 0) break;
  }
  ESM.flipTile(a, idx1);
  ESM.flipTile(a, idx2);
  IIFE.flipTile(b, idx1);
  IIFE.flipTile(b, idx2);
  const ra = ESM.checkMatch(a);
  const rb = IIFE.checkMatch(b);
  assert.equal(ra.matched, rb.matched);
  assert.equal(a.missmatches, b.missmatches);
  assert.equal(a.combo, b.combo);
});

test('Paritaet: Booster identisch', () => {
  const a = ESM.createTileFlipState({ rows: ROWS, cols: COLS, seed: SEED });
  const b = IIFE.createTileFlipState({ rows: ROWS, cols: COLS, seed: SEED });
  assert.equal(ESM.useBooster(a, 'peek', 1000), IIFE.useBooster(b, 'peek', 1000));
  assert.equal(a.peekUntil, b.peekUntil);
  assert.equal(ESM.isPeeking(a, 1500), IIFE.isPeeking(b, 1500));
  assert.equal(ESM.isPeeking(a, 3500), IIFE.isPeeking(b, 3500));
});

test('Paritaet: Freeze identisch', () => {
  const a = ESM.createTileFlipState({ rows: ROWS, cols: COLS, seed: SEED });
  const b = IIFE.createTileFlipState({ rows: ROWS, cols: COLS, seed: SEED });
  assert.equal(ESM.useBooster(a, 'freeze', 1000), IIFE.useBooster(b, 'freeze', 1000));
  assert.equal(a.freezeUntil, b.freezeUntil);
  assert.equal(a.freezeStartTime, b.freezeStartTime);
  assert.equal(ESM.isFrozen(a, 3000), IIFE.isFrozen(b, 3000));
  assert.equal(ESM.isFrozen(a, 7000), IIFE.isFrozen(b, 7000));
});

test('Paritaet: getTimeRemaining identisch', () => {
  const a = ESM.createTileFlipState({ rows: ROWS, cols: COLS, seed: SEED, timeLimit: 60000 });
  const b = IIFE.createTileFlipState({ rows: ROWS, cols: COLS, seed: SEED, timeLimit: 60000 });
  for (const t of [0, 5000, 15000, 30000, 45000, 60000, 70000]) {
    assert.equal(ESM.getTimeRemaining(a, t, 0), IIFE.getTimeRemaining(b, t, 0));
  }
});

test('Paritaet: getFinalScore identisch', () => {
  const a = ESM.createTileFlipState({ rows: ROWS, cols: COLS, seed: SEED, timeLimit: 60000 });
  const b = IIFE.createTileFlipState({ rows: ROWS, cols: COLS, seed: SEED, timeLimit: 60000 });
  /* Match alle Paare in beiden */
  const pairs = [];
  const used = new Set();
  for (let i = 0; i < a.tiles.length; i++) {
    if (used.has(i)) continue;
    for (let j = i + 1; j < a.tiles.length; j++) {
      if (used.has(j)) continue;
      if (a.tiles[i].symbol === a.tiles[j].symbol) {
        pairs.push([i, j]);
        used.add(i); used.add(j);
        break;
      }
    }
  }
  for (const [x, y] of pairs) {
    ESM.flipTile(a, x); ESM.flipTile(a, y); ESM.checkMatch(a);
    IIFE.flipTile(b, x); IIFE.flipTile(b, y); IIFE.checkMatch(b);
  }
  assert.equal(a.score, b.score);
  assert.equal(ESM.getFinalScore(a, 20000, 0), IIFE.getFinalScore(b, 20000, 0));
});

test('Paritaet: Shuffle identisch', () => {
  const a = ESM.createTileFlipState({ rows: ROWS, cols: COLS, seed: SEED });
  const b = IIFE.createTileFlipState({ rows: ROWS, cols: COLS, seed: SEED });
  /* Match ein Paar */
  let idx1 = -1, idx2 = -1;
  for (let i = 0; i < a.tiles.length; i++) {
    for (let j = i + 1; j < a.tiles.length; j++) {
      if (a.tiles[i].symbol === a.tiles[j].symbol) { idx1 = i; idx2 = j; break; }
    }
    if (idx1 >= 0) break;
  }
  ESM.flipTile(a, idx1); ESM.flipTile(a, idx2); ESM.checkMatch(a);
  IIFE.flipTile(b, idx1); IIFE.flipTile(b, idx2); IIFE.checkMatch(b);
  ESM.useBooster(a, 'shuffle');
  IIFE.useBooster(b, 'shuffle');
  for (let i = 0; i < a.tiles.length; i++) {
    assert.equal(a.tiles[i].symbol, b.tiles[i].symbol);
  }
});

test('Paritaet: isGameOver/isComplete identisch', () => {
  const a = ESM.createTileFlipState({ rows: 2, cols: 2, seed: 999 });
  const b = IIFE.createTileFlipState({ rows: 2, cols: 2, seed: 999 });
  assert.equal(ESM.isGameOver(a), IIFE.isGameOver(b));
  assert.equal(ESM.isComplete(a), IIFE.isComplete(b));
  /* Match alle */
  const pairs = [];
  const used = new Set();
  for (let i = 0; i < a.tiles.length; i++) {
    if (used.has(i)) continue;
    for (let j = i + 1; j < a.tiles.length; j++) {
      if (used.has(j)) continue;
      if (a.tiles[i].symbol === a.tiles[j].symbol) {
        pairs.push([i, j]);
        used.add(i); used.add(j);
        break;
      }
    }
  }
  for (const [x, y] of pairs) {
    ESM.flipTile(a, x); ESM.flipTile(a, y); ESM.checkMatch(a);
    IIFE.flipTile(b, x); IIFE.flipTile(b, y); IIFE.checkMatch(b);
  }
  assert.equal(ESM.isGameOver(a), IIFE.isGameOver(b));
  assert.equal(ESM.isComplete(a), IIFE.isComplete(b));
});