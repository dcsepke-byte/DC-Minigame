/**
 * Meta-Progression — Spiellogik (Browser-Kompatibel, IIFE)
 *
 * Gleiche Logik wie meta-progression-logic.js (ESM),
 * aber als IIFE fuer <script>-Tag ohne Module-Loader.
 *
 * Konzept:
 *  - XP/Level-System mit progressiver Kurve
 *  - Sternen-Waehrung aus Platzierung und Level-Up
 *  - Achievements (10+ Definitionen)
 *  - Unlock-Shop: Charaktere und Trails gegen Sterne
 */
(function () {
  'use strict';

  /* ---------- XP / Level ---------- */

  function xpForLevel(level) {
    if (level < 0) level = 0;
    return Math.floor(100 * Math.pow(1.5, Math.max(0, level - 1)));
  }

  function totalXpForLevel(level) {
    if (level <= 0) return 0;
    var total = 0;
    for (var i = 0; i < level; i++) {
      total += xpForLevel(i);
    }
    return total;
  }

  function levelFromXp(xp) {
    if (xp <= 0) return 0;
    var level = 0;
    var remaining = xp;
    while (remaining >= xpForLevel(level)) {
      remaining -= xpForLevel(level);
      level++;
      if (level > 999) break;
    }
    return level;
  }

  function xpToNextLevel(xp) {
    var lvl = levelFromXp(xp);
    var spent = totalXpForLevel(lvl);
    var need = xpForLevel(lvl);
    return Math.max(0, need - (xp - spent));
  }

  function currentLevelXp(xp) {
    var lvl = levelFromXp(xp);
    return xp - totalXpForLevel(lvl);
  }

  function xpFromGameScore(score) {
    if (score <= 0) return 0;
    return Math.floor(Math.sqrt(score) * 2);
  }

  function starRewardForLevel(level) {
    if (level <= 0) return 0;
    return 3 + level;
  }

  function starsFromPlacement(placement, playerCount) {
    if (placement <= 0) return 0;
    if (placement === 1) return 5;
    if (placement === 2) return 3;
    if (placement === 3) return 2;
    return 1;
  }

  function createProgression() {
    return { xp: 0, totalXp: 0, level: 0, stars: 0, gamesPlayed: 0 };
  }

  function addXp(state, amount) {
    if (amount < 0) amount = 0;
    var oldLevel = state.level;
    state.xp += amount;
    state.totalXp += amount;
    if (state.xp < 0) { state.xp = 0; state.totalXp = Math.max(0, state.totalXp); }
    state.level = levelFromXp(state.totalXp);
    var leveledUp = state.level > oldLevel;
    var starsEarned = 0;
    if (leveledUp) {
      for (var l = oldLevel + 1; l <= state.level; l++) {
        starsEarned += starRewardForLevel(l);
      }
      state.stars += starsEarned;
    }
    return { leveledUp: leveledUp, newLevel: state.level, starsEarned: starsEarned };
  }

  function applyGameResult(state, result) {
    state.gamesPlayed++;
    var xpEarned = xpFromGameScore(result.score);
    var placementStars = starsFromPlacement(result.placement, result.playerCount);
    state.stars += placementStars;
    var xpResult = addXp(state, xpEarned);
    return {
      leveledUp: xpResult.leveledUp,
      newLevel: xpResult.newLevel,
      xpEarned: xpEarned,
      starsEarned: placementStars + xpResult.starsEarned,
      levelStars: xpResult.starsEarned,
    };
  }

  /* ---------- Achievements ---------- */

  var ACHIEVEMENTS = [
    { id: 'first_game',    label: 'Erstes Spiel',    desc: 'Spiele dein erstes Minispiel',  icon: '\u{1F3AE}', check: function(p) { return p.gamesPlayed >= 1; } },
    { id: 'veteran_10',    label: 'Veteran',         desc: 'Spiele 10 Minispiele',          icon: '\u{1F396}\u{FE0F}', check: function(p) { return p.gamesPlayed >= 10; } },
    { id: 'veteran_50',    label: 'Minispiel-Profi', desc: 'Spiele 50 Minispiele',          icon: '\u{1F3C5}', check: function(p) { return p.gamesPlayed >= 50; } },
    { id: 'level_5',       label: 'Aufsteiger',      desc: 'Erreiche Level 5',              icon: '\u{2B50}', check: function(p) { return p.level >= 5; } },
    { id: 'level_10',      label: 'Champion',        desc: 'Erreiche Level 10',             icon: '\u{1F3C6}', check: function(p) { return p.level >= 10; } },
    { id: 'level_25',      label: 'Legende',         desc: 'Erreiche Level 25',             icon: '\u{1F451}', check: function(p) { return p.level >= 25; } },
    { id: 'star_collector_50',  label: 'Sternensammler',  desc: 'Sammle 50 Sterne',         icon: '\u{2728}', check: function(p) { return p.stars >= 50; } },
    { id: 'star_collector_200', label: 'Sternenmillionaer', desc: 'Sammle 200 Sterne',       icon: '\u{1F4AB}', check: function(p) { return p.stars >= 200; } },
    { id: 'high_scorer',   label: 'Punktejaeger',    desc: 'Erreiche 1000 XP insgesamt',    icon: '\u{1F525}', check: function(p) { return p.totalXp >= 1000; } },
    { id: 'dedicated',     label: 'Eingeschworen',   desc: 'Erreiche 5000 XP insgesamt',    icon: '\u{1F48E}', check: function(p) { return p.totalXp >= 5000; } },
  ];

  function createAchievementState() {
    return { unlocked: {} };
  }

  function checkAchievements(prog, achState) {
    var newly = [];
    for (var i = 0; i < ACHIEVEMENTS.length; i++) {
      var def = ACHIEVEMENTS[i];
      if (achState.unlocked[def.id]) continue;
      if (def.check(prog)) {
        achState.unlocked[def.id] = true;
        newly.push({ id: def.id, label: def.label, desc: def.desc, icon: def.icon });
      }
    }
    return newly;
  }

  function getUnlockedAchievements(achState) {
    return ACHIEVEMENTS.filter(function(a) { return achState.unlocked[a.id]; });
  }

  /* ---------- Unlock-System ---------- */

  var UNLOCKS = [
    { id: 'char_rocket',  name: 'Rakete',   type: 'character', price: 0,  icon: '\u{1F680}', color: '#ff3cac' },
    { id: 'char_cat',     name: 'Katze',    type: 'character', price: 15, icon: '\u{1F431}', color: '#00f0ff' },
    { id: 'char_fox',     name: 'Fuchs',    type: 'character', price: 15, icon: '\u{1F98A}', color: '#ff6a00' },
    { id: 'char_frog',    name: 'Frosch',   type: 'character', price: 20, icon: '\u{1F438}', color: '#2bffb9' },
    { id: 'char_panda',   name: 'Panda',    type: 'character', price: 25, icon: '\u{1F43C}', color: '#ffffff' },
    { id: 'char_unicorn', name: 'Einhorn',  type: 'character', price: 40, icon: '\u{1F984}', color: '#7b2ff7' },
    { id: 'char_robot',   name: 'Roboter',  type: 'character', price: 40, icon: '\u{1F916}', color: '#3a86ff' },
    { id: 'char_octopus', name: 'Oktopus',  type: 'character', price: 50, icon: '\u{1F419}', color: '#ff4d6d' },
    { id: 'trail_sparkle', name: 'Funken',     type: 'trail', price: 10, icon: '\u{2728}' },
    { id: 'trail_rainbow', name: 'Regenbogen', type: 'trail', price: 30, icon: '\u{1F308}' },
    { id: 'trail_fire',    name: 'Feuer',      type: 'trail', price: 20, icon: '\u{1F525}' },
  ];

  var UNLOCK_BY_ID = {};
  for (var i = 0; i < UNLOCKS.length; i++) UNLOCK_BY_ID[UNLOCKS[i].id] = UNLOCKS[i];

  function createUnlockState() {
    var owned = {};
    for (var i = 0; i < UNLOCKS.length; i++) {
      if (UNLOCKS[i].price === 0) owned[UNLOCKS[i].id] = true;
    }
    return { owned: owned };
  }

  function isOwned(state, id) {
    return !!state.owned[id];
  }

  function canAfford(prog, unlockState, id) {
    var item = UNLOCK_BY_ID[id];
    if (!item) return false;
    if (isOwned(unlockState, id)) return false;
    return prog.stars >= item.price;
  }

  function purchaseUnlock(prog, unlockState, id) {
    var item = UNLOCK_BY_ID[id];
    if (!item) return { success: false, reason: 'unknown' };
    if (isOwned(unlockState, id)) return { success: false, reason: 'owned' };
    if (prog.stars < item.price) return { success: false, reason: 'insufficient_stars' };
    prog.stars -= item.price;
    unlockState.owned[id] = true;
    return { success: true };
  }

  function getAvailableUnlocks(state) {
    return UNLOCKS.filter(function(u) { return !isOwned(state, u.id); });
  }

  function getOwnedUnlocks(state) {
    return UNLOCKS.filter(function(u) { return isOwned(state, u.id); });
  }

  function getUnlocksByType(type) {
    return UNLOCKS.filter(function(u) { return u.type === type; });
  }

  /* ---------- Export ---------- */
  window.MetaProgressionLogic = {
    xpForLevel: xpForLevel,
    totalXpForLevel: totalXpForLevel,
    levelFromXp: levelFromXp,
    xpToNextLevel: xpToNextLevel,
    currentLevelXp: currentLevelXp,
    xpFromGameScore: xpFromGameScore,
    starRewardForLevel: starRewardForLevel,
    starsFromPlacement: starsFromPlacement,
    createProgression: createProgression,
    addXp: addXp,
    applyGameResult: applyGameResult,
    ACHIEVEMENTS: ACHIEVEMENTS,
    createAchievementState: createAchievementState,
    checkAchievements: checkAchievements,
    getUnlockedAchievements: getUnlockedAchievements,
    UNLOCKS: UNLOCKS,
    createUnlockState: createUnlockState,
    isOwned: isOwned,
    canAfford: canAfford,
    purchaseUnlock: purchaseUnlock,
    getAvailableUnlocks: getAvailableUnlocks,
    getOwnedUnlocks: getOwnedUnlocks,
    getUnlocksByType: getUnlocksByType,
  };
})();