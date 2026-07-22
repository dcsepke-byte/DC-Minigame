/**
 * Daily Challenge — Logik-Tests (TDD)
 *
 * Testet: Daily Key, Seed, Game Selection, Bonus, Streak-System.
 * Reine Logik ohne Browser-Abhaengigkeiten.
 * Node 22 built-in test runner: node --test tests/daily-challenge-logic.test.mjs
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  getDailyKey,
  getDailySeed,
  getDailyGameId,
  getDailyBonusStars,
  getDailyXpMultiplier,
  createDailyState,
  canPlayDaily,
  recordDailyPlay,
  getStreakInfo,
} from '../js/daily-challenge-logic.js';

/* ---------- getDailyKey: Datum -> "YYYY-MM-DD" String ---------- */

test('getDailyKey: gibt String im Format YYYY-MM-DD zurueck', () => {
  const key = getDailyKey(new Date(2026, 6, 22)); // 22. Juli 2026
  assert.equal(key, '2026-07-22');
});

test('getDailyKey: verschiedene Tage geben verschiedene Keys', () => {
  const k1 = getDailyKey(new Date(2026, 6, 22));
  const k2 = getDailyKey(new Date(2026, 6, 23));
  assert.notEqual(k1, k2);
});

test('getDailyKey: gleicher Tag gibt gleichen Key bei verschiedenen Uhrzeiten', () => {
  const k1 = getDailyKey(new Date(2026, 6, 22, 8, 0, 0));
  const k2 = getDailyKey(new Date(2026, 6, 22, 23, 59, 59));
  assert.equal(k1, k2);
});

/* ---------- getDailySeed: deterministische Zahl aus Datum ---------- */

test('getDailySeed: gibt positive Zahl zurueck', () => {
  const seed = getDailySeed(new Date(2026, 6, 22));
  assert.ok(seed >= 0, 'Seed sollte >= 0 sein');
  assert.ok(Number.isInteger(seed), 'Seed sollte Integer sein');
});

test('getDailySeed: gleicher Tag = gleicher Seed', () => {
  const s1 = getDailySeed(new Date(2026, 6, 22, 8, 0, 0));
  const s2 = getDailySeed(new Date(2026, 6, 22, 20, 0, 0));
  assert.equal(s1, s2);
});

test('getDailySeed: verschiedene Tage geben verschiedene Seeds (meistens)', () => {
  const s1 = getDailySeed(new Date(2026, 6, 22));
  const s2 = getDailySeed(new Date(2026, 6, 23));
  assert.notEqual(s1, s2);
});

/* ---------- getDailyGameId: deterministische Spielauswahl ---------- */

test('getDailyGameId: gibt eine gueltige game ID zurueck', () => {
  const gameIds = ['towerstack', 'bubblepop', 'ninjaslash', 'dodgeball'];
  const id = getDailyGameId(new Date(2026, 6, 22), gameIds);
  assert.ok(gameIds.includes(id), `Sollte eine der IDs sein, bekam: ${id}`);
});

test('getDailyGameId: gleicher Tag = gleiches Spiel (deterministisch)', () => {
  const gameIds = ['towerstack', 'bubblepop', 'ninjaslash', 'dodgeball'];
  const id1 = getDailyGameId(new Date(2026, 6, 22, 8), gameIds);
  const id2 = getDailyGameId(new Date(2026, 6, 22, 20), gameIds);
  assert.equal(id1, id2);
});

test('getDailyGameId: verschiedene Tage koennen verschiedene Spiele geben', () => {
  const gameIds = ['towerstack', 'bubblepop', 'ninjaslash', 'dodgeball'];
  const ids = new Set();
  for (let d = 1; d <= 31; d++) {
    ids.add(getDailyGameId(new Date(2026, 6, d), gameIds));
  }
  // Bei 4 Spielen und 31 Tagen sollten mindestens 3 verschiedene vorkommen
  assert.ok(ids.size >= 3, `Sollte mindestens 3 verschiedene Spiele in 31 Tagen haben, bekam: ${ids.size}`);
});

test('getDailyGameId: leeres Array gibt null zurueck', () => {
  assert.equal(getDailyGameId(new Date(2026, 6, 22), []), null);
});

/* ---------- getDailyBonusStars: Bonus-Sterne basierend auf Streak ---------- */

test('getDailyBonusStars: Streak 0 gibt Basis-Bonus', () => {
  assert.equal(getDailyBonusStars(0), 3);
});

test('getDailyBonusStars: Streak 1 gibt Basis + 1', () => {
  assert.equal(getDailyBonusStars(1), 4);
});

test('getDailyBonusStars: Streak 5 gibt Basis + 5', () => {
  assert.equal(getDailyBonusStars(5), 8);
});

test('getDailyBonusStars: Streak 10 gibt max (nicht unendlich)', () => {
  const bonus = getDailyBonusStars(10);
  assert.ok(bonus <= 10, 'Bonus sollte beschraenkt sein');
});

/* ---------- getDailyXpMultiplier: XP-Multiplikator basierend auf Streak ---------- */

test('getDailyXpMultiplier: Streak 0 gibt 1.0', () => {
  assert.equal(getDailyXpMultiplier(0), 1.0);
});

test('getDailyXpMultiplier: Streak 1 gibt 1.1', () => {
  assert.equal(getDailyXpMultiplier(1), 1.1);
});

test('getDailyXpMultiplier: Streak 10 gibt max 2.0', () => {
  assert.equal(getDailyXpMultiplier(10), 2.0);
});

test('getDailyXpMultiplier: Streak 20 gibt immer noch max 2.0', () => {
  assert.equal(getDailyXpMultiplier(20), 2.0);
});

/* ---------- createDailyState: Startzustand ---------- */

test('createDailyState: gibt leeren State zurueck', () => {
  const s = createDailyState();
  assert.equal(s.lastPlayedDate, null);
  assert.equal(s.streak, 0);
  assert.equal(s.totalCompleted, 0);
  assert.equal(s.bestStreak, 0);
});

/* ---------- canPlayDaily: darf heute noch spielen? ---------- */

test('canPlayDaily: frischer State kann spielen', () => {
  const s = createDailyState();
  assert.equal(canPlayDaily(s, new Date(2026, 6, 22)), true);
});

test('canPlayDaily: schon heute gespielt = false', () => {
  const s = createDailyState();
  s.lastPlayedDate = '2026-07-22';
  assert.equal(canPlayDaily(s, new Date(2026, 6, 22)), false);
});

test('canPlayDaily: gestern gespielt = heute wieder erlaubt', () => {
  const s = createDailyState();
  s.lastPlayedDate = '2026-07-21';
  assert.equal(canPlayDaily(s, new Date(2026, 6, 22)), true);
});

/* ---------- recordDailyPlay: Daily spielen und Streak updaten ---------- */

test('recordDailyPlay: erster Play setzt streak auf 1', () => {
  const s = createDailyState();
  const result = recordDailyPlay(s, new Date(2026, 6, 22), 500);
  assert.equal(s.streak, 1);
  assert.equal(s.totalCompleted, 1);
  assert.equal(s.bestStreak, 1);
  assert.equal(s.lastPlayedDate, '2026-07-22');
  assert.equal(result.newBestStreak, true);
});

test('recordDailyPlay: consecutive day erhoeht streak', () => {
  const s = createDailyState();
  s.lastPlayedDate = '2026-07-21';
  s.streak = 1;
  s.totalCompleted = 1;
  const result = recordDailyPlay(s, new Date(2026, 6, 22), 500);
  assert.equal(s.streak, 2);
  assert.equal(s.totalCompleted, 2);
  assert.equal(s.bestStreak, 2);
  assert.equal(result.newBestStreak, true);
});

test('recordDailyPlay: gap > 1 day resettet streak auf 1', () => {
  const s = createDailyState();
  s.lastPlayedDate = '2026-07-20'; // 2 Tage her
  s.streak = 5;
  s.bestStreak = 5;
  const result = recordDailyPlay(s, new Date(2026, 6, 22), 500);
  assert.equal(s.streak, 1);
  assert.equal(s.bestStreak, 5); // best bleibt
  assert.equal(result.newBestStreak, false);
});

test('recordDailyPlay: same day Play ignoriert (schon gespielt)', () => {
  const s = createDailyState();
  s.lastPlayedDate = '2026-07-22';
  s.streak = 3;
  s.totalCompleted = 3;
  const result = recordDailyPlay(s, new Date(2026, 6, 22), 500);
  assert.equal(s.streak, 3); // unveraendert
  assert.equal(s.totalCompleted, 3); // unveraendert
  assert.equal(result.alreadyPlayed, true);
});

test('recordDailyPlay: gibt Bonus-Sterne zurueck', () => {
  const s = createDailyState();
  const result = recordDailyPlay(s, new Date(2026, 6, 22), 500);
  assert.ok(result.bonusStars >= 3, 'Sollte mindestens 3 Bonus-Sterne geben');
});

test('recordDailyPlay: gibt XP-Multiplikator zurueck', () => {
  const s = createDailyState();
  s.lastPlayedDate = '2026-07-21';
  s.streak = 2;
  const result = recordDailyPlay(s, new Date(2026, 6, 22), 500);
  assert.ok(result.xpMultiplier > 1.0, 'Streak sollte Multiplikator > 1.0 geben');
});

test('recordDailyPlay: bestStreak wird nicht ueberschrieben bei niedrigerem streak', () => {
  const s = createDailyState();
  s.lastPlayedDate = '2026-07-20';
  s.streak = 3;
  s.bestStreak = 10;
  const result = recordDailyPlay(s, new Date(2026, 6, 22), 500);
  assert.equal(s.streak, 1);
  assert.equal(s.bestStreak, 10);
  assert.equal(result.newBestStreak, false);
});

/* ---------- getStreakInfo: Info fuer UI ---------- */

test('getStreakInfo: gibt streak, bestStreak, totalCompleted zurueck', () => {
  const s = createDailyState();
  s.streak = 5;
  s.bestStreak = 10;
  s.totalCompleted = 20;
  const info = getStreakInfo(s);
  assert.equal(info.streak, 5);
  assert.equal(info.bestStreak, 10);
  assert.equal(info.totalCompleted, 20);
});