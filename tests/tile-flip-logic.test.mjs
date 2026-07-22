/**
 * Tile Flip — Logik-Tests (TDD)
 *
 * Testet die reine Spiellogik ohne Browser-Abhaengigkeiten.
 * Node 22 built-in test runner: node --test tests/tile-flip-logic.test.mjs
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createTileFlipState,
  getTile,
  flipTile,
  checkMatch,
  isGameOver,
  isComplete,
  useBooster,
  isPeeking,
  isFrozen,
  getTimeRemaining,
  getFinalScore,
} from '../js/tile-flip-logic.js';

/* ---------- createTileFlipState ---------- */

test('createTileFlipState: 4x4 Grid mit 8 Paaren', () => {
  const s = createTileFlipState({ rows: 4, cols: 4 });
  assert.equal(s.tiles.length, 16);
  assert.equal(s.rows, 4);
  assert.equal(s.cols, 4);
  assert.equal(s.pairsFound, 0);
  assert.equal(s.totalPairs, 8);
  assert.equal(s.score, 0);
  assert.equal(s.flips, 0);
  assert.equal(s.gameOver, false);
  assert.equal(s.boosters.size, 3);
});

test('createTileFlipState: unterstuetzt verschiedene Grid-Groessen', () => {
  const s = createTileFlipState({ rows: 2, cols: 3 });
  assert.equal(s.tiles.length, 6);
  assert.equal(s.totalPairs, 3);
});

test('createTileFlipState: ungerade Tiles wirft Fehler', () => {
  assert.throws(() => createTileFlipState({ rows: 3, cols: 3 }));
});

/* ---------- getTile ---------- */

test('getTile: gibt Kachel an Position zurueck', () => {
  const s = createTileFlipState({ rows: 4, cols: 4, seed: 12345 });
  const t = getTile(s, 0);
  assert.ok(t !== undefined);
  assert.equal(typeof t.symbol, 'number');
  assert.equal(t.flipped, false);
  assert.equal(t.matched, false);
});

/* ---------- flipTile ---------- */

test('flipTile: deckt Kachel auf', () => {
  const s = createTileFlipState({ rows: 4, cols: 4, seed: 12345 });
  const result = flipTile(s, 0);
  assert.equal(result.flipped, true);
  assert.equal(s.tiles[0].flipped, true);
  assert.equal(s.flips, 1);
});

test('flipTile: auf bereits aufgedeckte Kachel ignoriert', () => {
  const s = createTileFlipState({ rows: 4, cols: 4, seed: 12345 });
  flipTile(s, 0);
  const result = flipTile(s, 0);
  assert.equal(result.flipped, false);
  assert.equal(s.flips, 1);
});

test('flipTile: auf gematchte Kachel ignoriert', () => {
  const s = createTileFlipState({ rows: 4, cols: 4, seed: 12345 });
  s.tiles[0].matched = true;
  const result = flipTile(s, 0);
  assert.equal(result.flipped, false);
});

test('flipTile: mit 2 schon aufgedeckten Kacheln ignoriert', () => {
  const s = createTileFlipState({ rows: 4, cols: 4, seed: 12345 });
  flipTile(s, 0);
  flipTile(s, 1);
  const result = flipTile(s, 2);
  assert.equal(result.flipped, false);
});

/* ---------- checkMatch ---------- */

test('checkMatch: gleiches Symbol matched Paar', () => {
  const s = createTileFlipState({ rows: 4, cols: 4, seed: 12345 });
  let idx1 = -1, idx2 = -1;
  for (let i = 0; i < s.tiles.length; i++) {
    for (let j = i + 1; j < s.tiles.length; j++) {
      if (s.tiles[i].symbol === s.tiles[j].symbol) { idx1 = i; idx2 = j; break; }
    }
    if (idx1 >= 0) break;
  }
  flipTile(s, idx1);
  flipTile(s, idx2);
  const result = checkMatch(s);
  assert.equal(result.matched, true);
  assert.equal(s.tiles[idx1].matched, true);
  assert.equal(s.tiles[idx2].matched, true);
  assert.equal(s.pairsFound, 1);
  assert.equal(s.tiles[idx1].flipped, false);
  assert.equal(s.tiles[idx2].flipped, false);
});

test('checkMatch: unterschiedliches Symbol kein Match', () => {
  const s = createTileFlipState({ rows: 4, cols: 4, seed: 12345 });
  let idx1 = -1, idx2 = -1;
  for (let i = 0; i < s.tiles.length; i++) {
    for (let j = i + 1; j < s.tiles.length; j++) {
      if (s.tiles[i].symbol !== s.tiles[j].symbol) { idx1 = i; idx2 = j; break; }
    }
    if (idx1 >= 0) break;
  }
  flipTile(s, idx1);
  flipTile(s, idx2);
  const result = checkMatch(s);
  assert.equal(result.matched, false);
  assert.equal(s.tiles[idx1].flipped, false);
  assert.equal(s.tiles[idx2].flipped, false);
  assert.equal(s.pairsFound, 0);
});

test('checkMatch: ohne zwei aufgedeckte Kacheln gibt null', () => {
  const s = createTileFlipState({ rows: 4, cols: 4, seed: 12345 });
  flipTile(s, 0);
  const result = checkMatch(s);
  assert.equal(result, null);
});

/* ---------- Score ---------- */

test('checkMatch: Match gibt Punkte basierend auf Paar-Nummer', () => {
  const s = createTileFlipState({ rows: 4, cols: 4, seed: 12345 });
  let idx1 = -1, idx2 = -1;
  for (let i = 0; i < s.tiles.length; i++) {
    for (let j = i + 1; j < s.tiles.length; j++) {
      if (s.tiles[i].symbol === s.tiles[j].symbol) { idx1 = i; idx2 = j; break; }
    }
    if (idx1 >= 0) break;
  }
  flipTile(s, idx1);
  flipTile(s, idx2);
  const result = checkMatch(s);
  assert.ok(result.points > 0);
  assert.equal(s.score, result.points);
});

/* ---------- isGameOver / isComplete ---------- */

test('isGameOver: true wenn alle Paare gefunden', () => {
  const s = createTileFlipState({ rows: 2, cols: 2, seed: 999 });
  for (let i = 0; i < s.tiles.length; i++) {
    for (let j = i + 1; j < s.tiles.length; j++) {
      if (s.tiles[i].symbol === s.tiles[j].symbol && !s.tiles[i].matched) {
        s.tiles[i].matched = true;
        s.tiles[j].matched = true;
        s.pairsFound++;
      }
    }
  }
  assert.equal(isGameOver(s), true);
  assert.equal(isComplete(s), true);
});

test('isComplete: false wenn nicht alle Paare gefunden', () => {
  const s = createTileFlipState({ rows: 4, cols: 4, seed: 12345 });
  assert.equal(isComplete(s), false);
});

/* ---------- Booster: Peek ---------- */

test('Peek-Booster: deckt alle Kacheln kurz auf', () => {
  const s = createTileFlipState({ rows: 4, cols: 4, seed: 12345 });
  assert.ok(s.boosters.has('peek'));
  const result = useBooster(s, 'peek');
  assert.equal(result, true);
  assert.ok(!s.boosters.has('peek'));
  assert.ok(s.peekUntil > 0);
  assert.equal(isPeeking(s, s.peekUntil + 1), false);
  assert.equal(isPeeking(s, s.peekUntil - 1), true);
});

test('Booster: nur einmal verwendbar', () => {
  const s = createTileFlipState({ rows: 4, cols: 4, seed: 12345 });
  useBooster(s, 'peek');
  const result = useBooster(s, 'peek');
  assert.equal(result, false);
});

/* ---------- Booster: Shuffle ---------- */

test('Shuffle-Booster: mischt unmatched Kacheln neu', () => {
  const s = createTileFlipState({ rows: 4, cols: 4, seed: 12345 });
  let idx1 = -1, idx2 = -1;
  for (let i = 0; i < s.tiles.length; i++) {
    for (let j = i + 1; j < s.tiles.length; j++) {
      if (s.tiles[i].symbol === s.tiles[j].symbol) { idx1 = i; idx2 = j; break; }
    }
    if (idx1 >= 0) break;
  }
  flipTile(s, idx1);
  flipTile(s, idx2);
  checkMatch(s);
  const beforeSymbols = s.tiles.map(t => t.symbol);
  useBooster(s, 'shuffle');
  const afterSymbols = s.tiles.map(t => t.symbol);
  assert.equal(s.tiles[idx1].matched, true);
  assert.equal(s.tiles[idx2].matched, true);
  const beforeSorted = beforeSymbols.slice().sort((a, b) => a - b);
  const afterSorted = afterSymbols.slice().sort((a, b) => a - b);
  assert.deepEqual(afterSorted, beforeSorted);
  for (let i = 0; i < s.tiles.length; i++) {
    if (!s.tiles[i].matched) assert.equal(s.tiles[i].flipped, false);
  }
});

/* ---------- Booster: Freeze ---------- */

test('Freeze-Booster: stoppt Timer', () => {
  const s = createTileFlipState({ rows: 4, cols: 4, seed: 12345 });
  assert.ok(s.boosters.has('freeze'));
  const result = useBooster(s, 'freeze');
  assert.equal(result, true);
  assert.ok(s.freezeUntil > 0);
  assert.equal(isFrozen(s, s.freezeUntil - 1), true);
  assert.equal(isFrozen(s, s.freezeUntil + 1), false);
});

/* ---------- getTimeRemaining ---------- */

test('getTimeRemaining: berechnet Restzeit korrekt', () => {
  const s = createTileFlipState({ rows: 4, cols: 4, seed: 12345, timeLimit: 60000 });
  assert.equal(getTimeRemaining(s, 0), 60000);
  assert.equal(getTimeRemaining(s, 30000), 30000);
  assert.equal(getTimeRemaining(s, 60000), 0);
  assert.equal(getTimeRemaining(s, 70000), 0);
});

test('getTimeRemaining: mit Freeze stoppt Zeit', () => {
  const s = createTileFlipState({ rows: 4, cols: 4, seed: 12345, timeLimit: 60000 });
  useBooster(s, 'freeze', 0);
  s.freezeUntil = 5000;
  s.freezeStartTime = 0;
  assert.equal(getTimeRemaining(s, 3000, 0), 60000);
  assert.equal(getTimeRemaining(s, 6000, 0), 59000);
});

/* ---------- getFinalScore ---------- */

test('getFinalScore: fuegt Zeitbonus hinzu bei Completion', () => {
  const s = createTileFlipState({ rows: 4, cols: 4, seed: 12345, timeLimit: 60000 });
  for (let i = 0; i < s.tiles.length; i++) {
    for (let j = i + 1; j < s.tiles.length; j++) {
      if (s.tiles[i].symbol === s.tiles[j].symbol && !s.tiles[i].matched) {
        flipTile(s, i);
        flipTile(s, j);
        checkMatch(s);
      }
    }
  }
  const baseScore = s.score;
  const final = getFinalScore(s, 20000, 0);
  assert.ok(final > baseScore, 'Final score muss Base + Zeitbonus sein');
});

/* ---------- Missmatch / Combo ---------- */

test('Falscher Match: bricht Combo und zaehlt Missmatch', () => {
  const s = createTileFlipState({ rows: 4, cols: 4, seed: 12345 });
  let idx1 = -1, idx2 = -1;
  for (let i = 0; i < s.tiles.length; i++) {
    for (let j = i + 1; j < s.tiles.length; j++) {
      if (s.tiles[i].symbol !== s.tiles[j].symbol) { idx1 = i; idx2 = j; break; }
    }
    if (idx1 >= 0) break;
  }
  flipTile(s, idx1);
  flipTile(s, idx2);
  const result = checkMatch(s);
  assert.equal(result.matched, false);
  assert.equal(s.missmatches, 1);
  assert.equal(s.combo, 0);
});

test('Combo: aufeinanderfolgende Matches bauen Combo auf', () => {
  const s = createTileFlipState({ rows: 4, cols: 4, seed: 12345 });
  const pairs = [];
  const used = new Set();
  for (let i = 0; i < s.tiles.length; i++) {
    if (used.has(i)) continue;
    for (let j = i + 1; j < s.tiles.length; j++) {
      if (used.has(j)) continue;
      if (s.tiles[i].symbol === s.tiles[j].symbol) {
        pairs.push([i, j]);
        used.add(i); used.add(j);
        break;
      }
    }
  }
  flipTile(s, pairs[0][0]);
  flipTile(s, pairs[0][1]);
  const r1 = checkMatch(s);
  assert.equal(s.combo, 1);
  flipTile(s, pairs[1][0]);
  flipTile(s, pairs[1][1]);
  const r2 = checkMatch(s);
  assert.equal(s.combo, 2);
  assert.ok(r2.points > r1.points, 'Zweites Paar mit Combo gibt mehr Punkte');
});

/* ---------- Vollstaendiges Spiel ---------- */

test('Vollstaendiges Spiel: alle Paare finden und isComplete true', () => {
  const s = createTileFlipState({ rows: 4, cols: 4, seed: 42, timeLimit: 60000 });
  const pairs = [];
  const used = new Set();
  for (let i = 0; i < s.tiles.length; i++) {
    if (used.has(i)) continue;
    for (let j = i + 1; j < s.tiles.length; j++) {
      if (used.has(j)) continue;
      if (s.tiles[i].symbol === s.tiles[j].symbol) {
        pairs.push([i, j]);
        used.add(i); used.add(j);
        break;
      }
    }
  }
  assert.equal(pairs.length, 8);
  for (const [a, b] of pairs) {
    flipTile(s, a);
    flipTile(s, b);
    const r = checkMatch(s);
    assert.equal(r.matched, true);
  }
  assert.equal(isComplete(s), true);
  assert.equal(s.pairsFound, 8);
  assert.ok(s.score > 0);
});

/* ---------- Flip-Zaehler ---------- */

test('Flips: werden korrekt gezaehlt', () => {
  const s = createTileFlipState({ rows: 4, cols: 4, seed: 12345 });
  flipTile(s, 0);
  flipTile(s, 1);
  checkMatch(s); /* Kacheln wieder verdeckt -> neue koennen aufgedeckt werden */
  flipTile(s, 2);
  assert.equal(s.flips, 3);
});