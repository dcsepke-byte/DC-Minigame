/**
 * Meta-Progression — Achievement-Tests (TDD)
 *
 * Testet Achievement-Definitionen, -Pruefung und -Vergabe.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ACHIEVEMENTS,
  checkAchievements,
  createAchievementState,
} from '../js/meta-progression-logic.js';

/* ---------- ACHIEVEMENTS: Definitionen existieren ---------- */

test('ACHIEVEMENTS: ist ein Array mit mindestens 10 Eintraegen', () => {
  assert.ok(Array.isArray(ACHIEVEMENTS), 'ACHIEVEMENTS sollte ein Array sein');
  assert.ok(ACHIEVEMENTS.length >= 10, `Mindestens 10 Achievements, hat ${ACHIEVEMENTS.length}`);
});

test('ACHIEVEMENTS: jeder Eintrag hat id, label, desc, icon', () => {
  for (const a of ACHIEVEMENTS) {
    assert.ok(typeof a.id === 'string' && a.id.length > 0, `id fehlt: ${JSON.stringify(a)}`);
    assert.ok(typeof a.label === 'string', `label fehlt bei ${a.id}`);
    assert.ok(typeof a.desc === 'string', `desc fehlt bei ${a.id}`);
    assert.ok(typeof a.icon === 'string', `icon fehlt bei ${a.id}`);
  }
});

test('ACHIEVEMENTS: ids sind eindeutig', () => {
  const ids = ACHIEVEMENTS.map(a => a.id);
  const unique = new Set(ids);
  assert.equal(ids.length, unique.size, 'Achievement-IDs sollten eindeutig sein');
});

/* ---------- createAchievementState ---------- */

test('createAchievementState: leerer Start, keine freigeschalteten Achievements', () => {
  const a = createAchievementState();
  assert.ok(typeof a.unlocked === 'object' || Array.isArray(a.unlocked),
    'unlocked sollte Objekt oder Array sein');
  assert.equal(Object.keys(a.unlocked).length, 0);
});

/* ---------- checkAchievements: erste Spiele ---------- */

test('checkAchievements: erstes Spiel freischaltet "First Game"', () => {
  const ach = createAchievementState();
  const prog = { gamesPlayed: 1, level: 0, stars: 0, totalXp: 50 };
  const newly = checkAchievements(prog, ach);
  assert.ok(newly.length > 0, 'Erstes Spiel sollte Achievement freischalten');
  assert.ok(newly.some(a => a.id === 'first_game'), 'first_game Achievement erwartet');
});

test('checkAchievements: kein Spiel → kein Achievement', () => {
  const ach = createAchievementState();
  const prog = { gamesPlayed: 0, level: 0, stars: 0, totalXp: 0 };
  const newly = checkAchievements(prog, ach);
  assert.equal(newly.length, 0);
});

test('checkAchievements: bereits freigeschaltet → nicht erneut zurueckgeben', () => {
  const ach = createAchievementState();
  const prog = { gamesPlayed: 1, level: 0, stars: 0, totalXp: 50 };
  checkAchievements(prog, ach); // first_game freischalten
  const newly2 = checkAchievements(prog, ach); // erneut pruefen
  assert.equal(newly2.length, 0, 'Bereits freigeschaltete Achievements nicht erneut melden');
});

/* ---------- checkAchievements: Level-basierte Achievements ---------- */

test('checkAchievements: Level 5 erreicht → entsprechendes Achievement', () => {
  const ach = createAchievementState();
  const prog = { gamesPlayed: 10, level: 5, stars: 20, totalXp: 1000 };
  const newly = checkAchievements(prog, ach);
  assert.ok(newly.some(a => a.id === 'level_5'), 'level_5 Achievement erwartet');
});

test('checkAchievements: Level 10 erreicht → entsprechendes Achievement', () => {
  const ach = createAchievementState();
  const prog = { gamesPlayed: 20, level: 10, stars: 50, totalXp: 5000 };
  const newly = checkAchievements(prog, ach);
  assert.ok(newly.some(a => a.id === 'level_10'), 'level_10 Achievement erwartet');
});

/* ---------- checkAchievements: Spiele-Anzahl Achievements ---------- */

test('checkAchievements: 10 Spiele → "Veteran" Achievement', () => {
  const ach = createAchievementState();
  const prog = { gamesPlayed: 10, level: 1, stars: 5, totalXp: 200 };
  const newly = checkAchievements(prog, ach);
  assert.ok(newly.some(a => a.id === 'veteran_10'), 'veteran_10 Achievement erwartet');
});

/* ---------- checkAchievements: Sterne-Sammel-Achievement ---------- */

test('checkAchievements: 50 Sterne → "Star Collector" Achievement', () => {
  const ach = createAchievementState();
  const prog = { gamesPlayed: 15, level: 3, stars: 50, totalXp: 800 };
  const newly = checkAchievements(prog, ach);
  assert.ok(newly.some(a => a.id === 'star_collector_50'), 'star_collector_50 erwartet');
});

/* ---------- Edge Cases ---------- */

test('checkAchievements: mehrfache Achievements gleichzeitig freischalten', () => {
  const ach = createAchievementState();
  // first_game + veteran_10 + level_5 gleichzeitig
  const prog = { gamesPlayed: 10, level: 5, stars: 60, totalXp: 1000 };
  const newly = checkAchievements(prog, ach);
  assert.ok(newly.length >= 3, `Sollte mehrere Achievements gleichzeitig freischalten: ${newly.length}`);
});