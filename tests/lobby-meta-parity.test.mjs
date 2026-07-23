/**
 * Lobby-Meta Paritaetstest (ESM vs Browser-IIFE)
 *
 * Stellt sicher dass beide Versionen identische Ergebnisse liefern.
 */
import { test } from 'node:test';
import assert from 'node:assert';
import * as ESM from '../js/lobby-meta-logic.js';

// Browser-IIFE laden
import { readFileSync } from 'fs';
import { join } from 'path';
import vm from 'vm';

const browserCode = readFileSync(join(process.cwd(), 'js/lobby-meta-logic-browser.js'), 'utf8');
const sandbox = { window: {}, Math, JSON, Object, console };
vm.createContext(sandbox);
vm.runInContext(browserCode, sandbox);
const IIFE = sandbox.window.LobbyMetaLogic;

/* ---------- getXpBarData ---------- */

test('Paritaet: getXpBarData fuer neuen Spieler', () => {
  const prog = { xp: 0, totalXp: 0, level: 0, stars: 0, gamesPlayed: 0 };
  assert.deepEqual(ESM.getXpBarData(prog), IIFE.getXpBarData(prog));
});

test('Paritaet: getXpBarData bei 50 XP', () => {
  const prog = { xp: 50, totalXp: 50, level: 0, stars: 0, gamesPlayed: 0 };
  assert.deepEqual(ESM.getXpBarData(prog), IIFE.getXpBarData(prog));
});

test('Paritaet: getXpBarData bei Level 2', () => {
  const prog = { xp: 50, totalXp: 250, level: 2, stars: 9, gamesPlayed: 5 };
  assert.deepEqual(ESM.getXpBarData(prog), IIFE.getXpBarData(prog));
});

test('Paritaet: getXpBarData null-safe', () => {
  assert.deepEqual(ESM.getXpBarData(null), IIFE.getXpBarData(null));
});

/* ---------- getAchievementCount ---------- */

test('Paritaet: getAchievementCount leer', () => {
  assert.equal(ESM.getAchievementCount({ unlocked: {} }), IIFE.getAchievementCount({ unlocked: {} }));
});

test('Paritaet: getAchievementCount mit 3', () => {
  const ach = { unlocked: { first_game: true, veteran_10: true, level_5: true } };
  assert.equal(ESM.getAchievementCount(ach), IIFE.getAchievementCount(ach));
});

test('Paritaet: getAchievementCount null-safe', () => {
  assert.equal(ESM.getAchievementCount(null), IIFE.getAchievementCount(null));
});

/* ---------- getLevelDisplay ---------- */

test('Paritaet: getLevelDisplay Level 0', () => {
  const prog = { xp: 0, totalXp: 0, level: 0, stars: 0, gamesPlayed: 0 };
  assert.equal(ESM.getLevelDisplay(prog), IIFE.getLevelDisplay(prog));
});

test('Paritaet: getLevelDisplay Level 5', () => {
  const prog = { xp: 0, totalXp: 500, level: 5, stars: 30, gamesPlayed: 10 };
  assert.equal(ESM.getLevelDisplay(prog), IIFE.getLevelDisplay(prog));
});

/* ---------- getStarsDisplay ---------- */

test('Paritaet: getStarsDisplay 0', () => {
  const prog = { xp: 0, totalXp: 0, level: 0, stars: 0, gamesPlayed: 0 };
  assert.equal(ESM.getStarsDisplay(prog), IIFE.getStarsDisplay(prog));
});

test('Paritaet: getStarsDisplay 42', () => {
  const prog = { xp: 0, totalXp: 0, level: 0, stars: 42, gamesPlayed: 5 };
  assert.equal(ESM.getStarsDisplay(prog), IIFE.getStarsDisplay(prog));
});

/* ---------- createLobbyMeta ---------- */

test('Paritaet: createLobbyMeta fuer neuen Spieler', () => {
  const prog = { xp: 0, totalXp: 0, level: 0, stars: 0, gamesPlayed: 0 };
  const ach = { unlocked: {} };
  assert.deepEqual(ESM.createLobbyMeta(prog, ach), IIFE.createLobbyMeta(prog, ach));
});

test('Paritaet: createLobbyMeta mit Werten', () => {
  const prog = { xp: 50, totalXp: 250, level: 2, stars: 15, gamesPlayed: 7 };
  const ach = { unlocked: { first_game: true, veteran_10: true } };
  assert.deepEqual(ESM.createLobbyMeta(prog, ach), IIFE.createLobbyMeta(prog, ach));
});

/* ---------- formatMetaSummary ---------- */

test('Paritaet: formatMetaSummary fuer neuen Spieler', () => {
  const prog = { xp: 0, totalXp: 0, level: 0, stars: 0, gamesPlayed: 0 };
  const ach = { unlocked: {} };
  assert.equal(ESM.formatMetaSummary(prog, ach), IIFE.formatMetaSummary(prog, ach));
});

test('Paritaet: formatMetaSummary mit Werten', () => {
  const prog = { xp: 0, totalXp: 500, level: 5, stars: 30, gamesPlayed: 10 };
  const ach = { unlocked: { first_game: true, veteran_10: true, level_5: true } };
  assert.equal(ESM.formatMetaSummary(prog, ach), IIFE.formatMetaSummary(prog, ach));
});