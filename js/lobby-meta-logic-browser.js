/**
 * Lobby-Meta-Logic — Browser-Kompatibel, IIFE
 *
 * Gleiche Logik wie lobby-meta-logic.js (ESM),
 * aber als IIFE fuer <script>-Tag ohne Module-Loader.
 */
(function () {
  'use strict';

  /* ---------- Hilfsfunktionen (gleiche Logik wie meta-progression-logic.js) ---------- */

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

  /* ---------- Lobby-Meta-Logik ---------- */

  function getXpBarData(prog) {
    if (!prog) return { current: 0, needed: 0, percent: 0 };
    var lvl = prog.level || 0;
    var totalXp = prog.totalXp || 0;

    var need = xpForLevel(lvl);
    var spent = totalXpForLevel(lvl);
    var current = totalXp - spent;
    var percent = need > 0 ? Math.floor((current / need) * 100) : 0;

    return {
      current: Math.max(0, current),
      needed: need,
      percent: Math.max(0, Math.min(100, percent)),
    };
  }

  function getAchievementCount(achState) {
    if (!achState || !achState.unlocked) return 0;
    var count = 0;
    var keys = Object.keys(achState.unlocked);
    for (var i = 0; i < keys.length; i++) {
      if (achState.unlocked[keys[i]]) count++;
    }
    return count;
  }

  function getLevelDisplay(prog) {
    if (!prog) return 'Level 0';
    return 'Level ' + (prog.level || 0);
  }

  function getStarsDisplay(prog) {
    if (!prog) return 0;
    return prog.stars || 0;
  }

  function createLobbyMeta(prog, achState) {
    return {
      level: prog.level || 0,
      stars: prog.stars || 0,
      gamesPlayed: prog.gamesPlayed || 0,
      achievementCount: getAchievementCount(achState),
      xpBar: getXpBarData(prog),
    };
  }

  function formatMetaSummary(prog, achState) {
    var level = prog.level || 0;
    var stars = prog.stars || 0;
    var games = prog.gamesPlayed || 0;
    var achCount = getAchievementCount(achState);
    return 'Level ' + level + ' | ' + stars + ' Sterne | ' + games + ' Spiele | ' + achCount + '/10 Achievements';
  }

  /* ---------- Export ---------- */
  window.LobbyMetaLogic = {
    getXpBarData: getXpBarData,
    getAchievementCount: getAchievementCount,
    getLevelDisplay: getLevelDisplay,
    getStarsDisplay: getStarsDisplay,
    createLobbyMeta: createLobbyMeta,
    formatMetaSummary: formatMetaSummary,
  };
})();