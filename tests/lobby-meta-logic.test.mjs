/**
 * Lobby-Meta-Logic Tests (TDD)
 *
 * Testet die reine Logik fuer die Lobby-Meta-Anzeige:
 * - createLobbyMeta: erzeugt Display-Daten aus Progression + Achievement-State
 * - getXpBarData: XP-Bar-Daten (current, needed, percent)
 * - getAchievementCount: Anzahl freigeschalteter Achievements
 * - getLevelDisplay: Level-Anzeige-Text
 * - getStarsDisplay: Stern-Anzeige-Text
 * - formatMetaSummary: Zusammenfassungs-Text fuer Lobby
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createLobbyMeta,
  getXpBarData,
  getAchievementCount,
  getLevelDisplay,
  getStarsDisplay,
  formatMetaSummary,
} from '../js/lobby-meta-logic.js';

/* ---------- createLobbyMeta ---------- */

test('createLobbyMeta: gibt vollstaendiges Display-Objekt zurueck', () => {
  const prog = { xp: 0, totalXp: 0, level: 0, stars: 0, gamesPlayed: 0 };
  const ach = { unlocked: {} };
  const meta = createLobbyMeta(prog, ach);
  assert.ok(meta);
  assert.equal(typeof meta, 'object');
});

test('createLobbyMeta: Level 0 fuer neuen Spieler', () => {
  const prog = { xp: 0, totalXp: 0, level: 0, stars: 0, gamesPlayed: 0 };
  const ach = { unlocked: {} };
  const meta = createLobbyMeta(prog, ach);
  assert.equal(meta.level, 0);
});

test('createLobbyMeta: Sterne werden korrekt uebernommen', () => {
  const prog = { xp: 0, totalXp: 0, level: 0, stars: 42, gamesPlayed: 5 };
  const ach = { unlocked: {} };
  const meta = createLobbyMeta(prog, ach);
  assert.equal(meta.stars, 42);
});

test('createLobbyMeta: gamesPlayed wird uebernommen', () => {
  const prog = { xp: 0, totalXp: 0, level: 0, stars: 0, gamesPlayed: 7 };
  const ach = { unlocked: {} };
  const meta = createLobbyMeta(prog, ach);
  assert.equal(meta.gamesPlayed, 7);
});

test('createLobbyMeta: Achievement-Anzahl ist 0 fuer neuen Spieler', () => {
  const prog = { xp: 0, totalXp: 0, level: 0, stars: 0, gamesPlayed: 0 };
  const ach = { unlocked: {} };
  const meta = createLobbyMeta(prog, ach);
  assert.equal(meta.achievementCount, 0);
});

test('createLobbyMeta: Achievement-Anzahl wird korrekt gezaehlt', () => {
  const prog = { xp: 0, totalXp: 0, level: 0, stars: 0, gamesPlayed: 0 };
  const ach = { unlocked: { first_game: true, veteran_10: true, level_5: true } };
  const meta = createLobbyMeta(prog, ach);
  assert.equal(meta.achievementCount, 3);
});

test('createLobbyMeta: enthaelt xpBar mit current, needed, percent', () => {
  const prog = { xp: 0, totalXp: 50, level: 0, stars: 0, gamesPlayed: 0 };
  const ach = { unlocked: {} };
  const meta = createLobbyMeta(prog, ach);
  assert.ok(meta.xpBar);
  assert.equal(typeof meta.xpBar.current, 'number');
  assert.equal(typeof meta.xpBar.needed, 'number');
  assert.equal(typeof meta.xpBar.percent, 'number');
});

test('createLobbyMeta: XP-Bar percent ist 0 fuer neuen Spieler', () => {
  const prog = { xp: 0, totalXp: 0, level: 0, stars: 0, gamesPlayed: 0 };
  const ach = { unlocked: {} };
  const meta = createLobbyMeta(prog, ach);
  assert.equal(meta.xpBar.percent, 0);
});

test('createLobbyMeta: XP-Bar percent ist 50 bei halbem Level', () => {
  const prog = { xp: 50, totalXp: 50, level: 0, stars: 0, gamesPlayed: 0 };
  const ach = { unlocked: {} };
  const meta = createLobbyMeta(prog, ach);
  assert.equal(meta.xpBar.percent, 50);
});

test('createLobbyMeta: XP-Bar percent ist 0 bei Level-Up Start', () => {
  const prog = { xp: 0, totalXp: 100, level: 1, stars: 4, gamesPlayed: 0 };
  const ach = { unlocked: {} };
  const meta = createLobbyMeta(prog, ach);
  assert.equal(meta.xpBar.percent, 0);
});

/* ---------- getXpBarData ---------- */

test('getXpBarData: current=0 needed=100 percent=0 fuer Level 0 Anfang', () => {
  const prog = { xp: 0, totalXp: 0, level: 0, stars: 0, gamesPlayed: 0 };
  const bar = getXpBarData(prog);
  assert.equal(bar.current, 0);
  assert.equal(bar.needed, 100);
  assert.equal(bar.percent, 0);
});

test('getXpBarData: current=50 needed=100 percent=50 bei 50 XP', () => {
  const prog = { xp: 50, totalXp: 50, level: 0, stars: 0, gamesPlayed: 0 };
  const bar = getXpBarData(prog);
  assert.equal(bar.current, 50);
  assert.equal(bar.needed, 100);
  assert.equal(bar.percent, 50);
});

test('getXpBarData: Level 1 braucht 100 XP (gleicher Basis wie Level 0)', () => {
  const prog = { xp: 0, totalXp: 100, level: 1, stars: 4, gamesPlayed: 0 };
  const bar = getXpBarData(prog);
  assert.equal(bar.current, 0);
  assert.equal(bar.needed, 100);
  assert.equal(bar.percent, 0);
});

test('getXpBarData: Level 2 braucht 150 XP (1.5x Basis)', () => {
  const prog = { xp: 0, totalXp: 200, level: 2, stars: 9, gamesPlayed: 0 };
  const bar = getXpBarData(prog);
  assert.equal(bar.current, 0);
  assert.equal(bar.needed, 150);
  assert.equal(bar.percent, 0);
});

test('getXpBarData: percent ist 33 bei 50/150 XP in Level 2', () => {
  const prog = { xp: 50, totalXp: 250, level: 2, stars: 9, gamesPlayed: 0 };
  const bar = getXpBarData(prog);
  assert.equal(bar.current, 50);
  assert.equal(bar.needed, 150);
  assert.equal(bar.percent, 33);
});

test('getXpBarData: percent ist 0 wenn needed=0 (safety)', () => {
  const prog = { xp: 0, totalXp: 0, level: 0, stars: 0, gamesPlayed: 0 };
  const bar = getXpBarData(prog);
  assert.equal(bar.percent, 0);
});

/* ---------- getAchievementCount ---------- */

test('getAchievementCount: 0 fuer leeren State', () => {
  const ach = { unlocked: {} };
  assert.equal(getAchievementCount(ach), 0);
});

test('getAchievementCount: 3 bei drei freigeschalteten', () => {
  const ach = { unlocked: { first_game: true, veteran_10: true, level_5: true } };
  assert.equal(getAchievementCount(ach), 3);
});

test('getAchievementCount: 10 bei allen freigeschaltet', () => {
  const ach = { unlocked: {
    first_game: true, veteran_10: true, veteran_50: true,
    level_5: true, level_10: true, level_25: true,
    star_collector_50: true, star_collector_200: true,
    high_scorer: true, dedicated: true,
  }};
  assert.equal(getAchievementCount(ach), 10);
});

test('getAchievementCount: null-safe gibt 0 zurueck', () => {
  assert.equal(getAchievementCount(null), 0);
  assert.equal(getAchievementCount(undefined), 0);
});

/* ---------- getLevelDisplay ---------- */

test('getLevelDisplay: "Level 0" fuer neuen Spieler', () => {
  const prog = { xp: 0, totalXp: 0, level: 0, stars: 0, gamesPlayed: 0 };
  assert.equal(getLevelDisplay(prog), 'Level 0');
});

test('getLevelDisplay: "Level 5" bei Level 5', () => {
  const prog = { xp: 0, totalXp: 500, level: 5, stars: 30, gamesPlayed: 10 };
  assert.equal(getLevelDisplay(prog), 'Level 5');
});

test('getLevelDisplay: "Level 25" bei Level 25', () => {
  const prog = { xp: 0, totalXp: 99999, level: 25, stars: 200, gamesPlayed: 50 };
  assert.equal(getLevelDisplay(prog), 'Level 25');
});

/* ---------- getStarsDisplay ---------- */

test('getStarsDisplay: "0" fuer 0 Sterne', () => {
  const prog = { xp: 0, totalXp: 0, level: 0, stars: 0, gamesPlayed: 0 };
  assert.equal(getStarsDisplay(prog), 0);
});

test('getStarsDisplay: "42" bei 42 Sternen', () => {
  const prog = { xp: 0, totalXp: 0, level: 0, stars: 42, gamesPlayed: 5 };
  assert.equal(getStarsDisplay(prog), 42);
});

/* ---------- formatMetaSummary ---------- */

test('formatMetaSummary: enthaelt Level, Sterne, Spiele, Achievements', () => {
  const prog = { xp: 50, totalXp: 50, level: 0, stars: 12, gamesPlayed: 5 };
  const ach = { unlocked: { first_game: true, veteran_10: false } };
  const summary = formatMetaSummary(prog, ach);
  assert.ok(summary.includes('Level'));
  assert.ok(summary.includes('12'));
  assert.ok(summary.includes('5'));
});

test('formatMetaSummary: enthaelt Achievement-Zaehler als X/10', () => {
  const prog = { xp: 0, totalXp: 0, level: 0, stars: 0, gamesPlayed: 0 };
  const ach = { unlocked: { first_game: true } };
  const summary = formatMetaSummary(prog, ach);
  assert.ok(summary.includes('1/10'));
});

test('formatMetaSummary: 0/10 bei neuem Spieler', () => {
  const prog = { xp: 0, totalXp: 0, level: 0, stars: 0, gamesPlayed: 0 };
  const ach = { unlocked: {} };
  const summary = formatMetaSummary(prog, ach);
  assert.ok(summary.includes('0/10'));
});