/**
 * Meta-Progression — Logik-Tests (TDD)
 *
 * Testet XP/Level-System, Sternen-Waehrung, Achievements.
 * Reine Logik ohne Browser-Abhaengigkeiten.
 * Node 22 built-in test runner: node --test tests/
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  xpForLevel,
  totalXpForLevel,
  levelFromXp,
  addXp,
  createProgression,
  xpFromGameScore,
  applyGameResult,
  starRewardForLevel,
} from '../js/meta-progression-logic.js';

/* ---------- xpForLevel: XP die fuer den naechsten Level-Aufstieg noetig sind ---------- */

test('xpForLevel: Level 1 → 2 braucht 100 XP', () => {
  assert.equal(xpForLevel(1), 100);
});

test('xpForLevel: Level 2 → 3 braucht mehr als Level 1 → 2 (Steigung)', () => {
  const lvl1 = xpForLevel(1);
  const lvl2 = xpForLevel(2);
  assert.ok(lvl2 > lvl1, `Level 2 sollte mehr XP brauchen als Level 1: ${lvl2} > ${lvl1}`);
});

test('xpForLevel: Level 10 braucht deutlich mehr als Level 1', () => {
  assert.ok(xpForLevel(10) > xpForLevel(1) * 2, 'Level 10 sollte mindestens doppelt so viele XP brauchen');
});

/* ---------- totalXpForLevel: kumulierte XP ab Level 0 um Level N zu erreichen ---------- */

test('totalXpForLevel: Level 0 braucht 0 XP', () => {
  assert.equal(totalXpForLevel(0), 0);
});

test('totalXpForLevel: Level 1 = xpForLevel(0) falls Level 0 Start', () => {
  // Level 1 erreicht man nach dem ersten Aufstieg
  assert.ok(totalXpForLevel(1) > 0, 'Level 1 sollte XP brauchen');
});

test('totalXpForLevel: monoton steigend', () => {
  for (let i = 0; i < 20; i++) {
    assert.ok(totalXpForLevel(i + 1) > totalXpForLevel(i),
      `totalXpForLevel sollte monoton steigen: L${i+1} > L${i}`);
  }
});

/* ---------- levelFromXp: welches Level hat man bei X XP ---------- */

test('levelFromXp: 0 XP → Level 0', () => {
  assert.equal(levelFromXp(0), 0);
});

test('levelFromXp: genug XP fuer Level 1 → Level 1', () => {
  const xp1 = totalXpForLevel(1);
  assert.equal(levelFromXp(xp1), 1);
});

test('levelFromXp: fast Level 2 → noch Level 1', () => {
  const xp2 = totalXpForLevel(2);
  assert.equal(levelFromXp(xp2 - 1), 1);
});

test('levelFromXp: genau Level 2', () => {
  const xp2 = totalXpForLevel(2);
  assert.equal(levelFromXp(xp2), 2);
});

/* ---------- createProgression: Startprofil eines neuen Spielers ---------- */

test('createProgression: Startzustand — Level 0, 0 XP, 0 Sterne', () => {
  const p = createProgression();
  assert.equal(p.level, 0);
  assert.equal(p.xp, 0);
  assert.equal(p.totalXp, 0);
  assert.equal(p.stars, 0);
  assert.equal(p.gamesPlayed, 0);
  assert.equal(p.achievements, undefined); // keine hardcoded leere Liste
});

/* ---------- addXp: XP hinzufuegen und Level-Up berechnen ---------- */

test('addXp: 50 XP zu neuem Spieler → Level 0, 50 XP gesamt', () => {
  const p = createProgression();
  const result = addXp(p, 50);
  assert.equal(p.xp, 50);
  assert.equal(p.level, 0);
  assert.equal(p.totalXp, 50);
  assert.equal(result.leveledUp, false);
});

test('addXp: 100 XP zu neuem Spieler → Level-Up auf 1', () => {
  const p = createProgression();
  const result = addXp(p, 100);
  assert.equal(result.leveledUp, true);
  assert.equal(result.newLevel, 1);
  assert.equal(p.level, 1);
});

test('addXp: XP die fuer 2 Level-Up reichen → newLevel = 2', () => {
  const p = createProgression();
  const xpNeeded = totalXpForLevel(2);
  const result = addXp(p, xpNeeded);
  assert.equal(result.leveledUp, true);
  assert.equal(result.newLevel, 2);
  assert.equal(p.level, 2);
});

test('addXp: negativ abgerundet auf 0', () => {
  const p = createProgression();
  addXp(p, 50);
  addXp(p, -100);
  assert.ok(p.xp >= 0, `XP sollten nicht negativ sein: ${p.xp}`);
  assert.ok(p.totalXp >= 0, `totalXp sollte nicht negativ sein: ${p.totalXp}`);
});

test('addXp: kein Level-Up bei kleinen XP ohne Schwelle', () => {
  const p = createProgression();
  addXp(p, 30);
  addXp(p, 30);
  assert.equal(p.level, 0);
  assert.equal(p.xp, 60);
});

/* ---------- xpFromGameScore: XP aus Minispiel-Punktzahl ---------- */

test('xpFromGameScore: 0 Punkte → 0 XP', () => {
  assert.equal(xpFromGameScore(0), 0);
});

test('xpFromGameScore: positive Punkte → positive XP', () => {
  assert.ok(xpFromGameScore(500) > 0, '500 Punkte sollten XP geben');
});

test('xpFromGameScore: sehr viele Punkte → gedeckeltes XP (kein exploit)', () => {
  const xp1000 = xpFromGameScore(1000);
  const xp10000 = xpFromGameScore(10000);
  assert.ok(xp10000 < xp1000 * 10, '10000 Punkte sollten nicht 10x so viel XP geben wie 1000 (Diminishing Returns)');
});

test('xpFromGameScore: negative Punkte → 0 XP', () => {
  assert.equal(xpFromGameScore(-100), 0);
});

/* ---------- applyGameResult: komplettes Spielergebnis anwenden ---------- */

test('applyGameResult: gibt XP und Sterne, erhoeht gamesPlayed', () => {
  const p = createProgression();
  const result = applyGameResult(p, { score: 500, placement: 1, playerCount: 4 });
  assert.ok(p.gamesPlayed >= 1, 'gamesPlayed sollte erhoeht werden');
  assert.ok(p.xp > 0 || p.totalXp > 0, ' XP sollte hinzugefuegt werden');
  assert.ok(typeof result.starsEarned === 'number', 'starsEarned sollte eine Zahl sein');
});

test('applyGameResult: 1. Platz gibt mehr Sterne als 4. Platz', () => {
  const p1 = createProgression();
  const p4 = createProgression();
  const r1 = applyGameResult(p1, { score: 100, placement: 1, playerCount: 4 });
  const r4 = applyGameResult(p4, { score: 100, placement: 4, playerCount: 4 });
  assert.ok(r1.starsEarned > r4.starsEarned,
    `1. Platz sollte mehr Sterne geben als 4.: ${r1.starsEarned} > ${r4.starsEarned}`);
});

test('applyGameResult: Sterne werden zum Profil addiert', () => {
  const p = createProgression();
  const result = applyGameResult(p, { score: 300, placement: 1, playerCount: 4 });
  assert.equal(p.stars, result.starsEarned);
});

/* ---------- starRewardForLevel: Sterne-Belohnung beim Level-Up ---------- */

test('starRewardForLevel: Level 1 gibt positive Sterne', () => {
  assert.ok(starRewardForLevel(1) > 0, 'Level 1 sollte Sterne geben');
});

test('starRewardForLevel: hoehere Level geben mehr Sterne', () => {
  assert.ok(starRewardForLevel(10) > starRewardForLevel(1),
    'Level 10 sollte mehr Sterne geben als Level 1');
});

/* ---------- Edge Cases ---------- */

test('addXp: mehrere kleine XP-Schritte aequivalent zu einer grossen Zahl', () => {
  const p1 = createProgression();
  const p2 = createProgression();
  addXp(p1, 250);
  for (let i = 0; i < 25; i++) addXp(p2, 10);
  assert.equal(p1.level, p2.level, `Level sollten gleich sein: ${p1.level} vs ${p2.level}`);
  assert.equal(p1.totalXp, p2.totalXp);
});

test('addXp: Level-Up gibt Sterne-Belohnung', () => {
  const p = createProgression();
  const initialStars = p.stars;
  const result = addXp(p, 100); // Level 1
  if (result.leveledUp) {
    assert.ok(p.stars > initialStars, 'Level-Up sollte Sterne geben');
    assert.ok(typeof result.starsEarned === 'number', 'starsEarned im Ergebnis');
  }
});