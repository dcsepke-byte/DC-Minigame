/**
 * Daily Challenge — Spiellogik (Browser-Kompatibel, IIFE)
 *
 * Gleiche Logik wie daily-challenge-logic.js (ESM),
 * aber als IIFE fuer <script>-Tag ohne Module-Loader.
 */
(function () {
  'use strict';

  function getDailyKey(date) {
    var y = date.getFullYear();
    var m = String(date.getMonth() + 1).padStart(2, '0');
    var d = String(date.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + d;
  }

  function getDailySeed(date) {
    var key = getDailyKey(date);
    var hash = 0;
    for (var i = 0; i < key.length; i++) {
      hash = ((hash << 5) - hash + key.charCodeAt(i)) | 0;
    }
    return Math.abs(hash);
  }

  function getDailyGameId(date, gameIds) {
    if (!gameIds || gameIds.length === 0) return null;
    var seed = getDailySeed(date);
    return gameIds[seed % gameIds.length];
  }

  function getDailyBonusStars(streak) {
    return Math.min(10, 3 + Math.max(0, streak));
  }

  function getDailyXpMultiplier(streak) {
    return Math.min(2.0, 1.0 + 0.1 * Math.max(0, streak));
  }

  function createDailyState() {
    return { lastPlayedDate: null, streak: 0, totalCompleted: 0, bestStreak: 0 };
  }

  function canPlayDaily(state, now) {
    if (!state.lastPlayedDate) return true;
    return state.lastPlayedDate !== getDailyKey(now);
  }

  function isConsecutiveDay(prev, curr) {
    var p = new Date(prev + 'T00:00:00');
    var c = new Date(curr + 'T00:00:00');
    var diff = Math.round((c - p) / (1000 * 60 * 60 * 24));
    return diff === 1;
  }

  function recordDailyPlay(state, now, score) {
    var todayKey = getDailyKey(now);

    if (state.lastPlayedDate === todayKey) {
      return {
        alreadyPlayed: true,
        bonusStars: 0,
        xpMultiplier: 1.0,
        newBestStreak: false,
        streak: state.streak,
      };
    }

    if (state.lastPlayedDate && isConsecutiveDay(state.lastPlayedDate, todayKey)) {
      state.streak += 1;
    } else {
      state.streak = 1;
    }

    state.totalCompleted += 1;
    state.lastPlayedDate = todayKey;

    var newBestStreak = state.streak > state.bestStreak;
    if (newBestStreak) {
      state.bestStreak = state.streak;
    }

    var bonusStars = getDailyBonusStars(state.streak - 1);
    var xpMultiplier = getDailyXpMultiplier(state.streak - 1);

    return {
      alreadyPlayed: false,
      bonusStars: bonusStars,
      xpMultiplier: xpMultiplier,
      newBestStreak: newBestStreak,
      streak: state.streak,
    };
  }

  function getStreakInfo(state) {
    return {
      streak: state.streak,
      bestStreak: state.bestStreak,
      totalCompleted: state.totalCompleted,
    };
  }

  /* ---------- localStorage Persistenz ---------- */

  function loadDailyState() {
    try {
      var raw = localStorage.getItem('pa_daily_challenge');
      if (raw) {
        var parsed = JSON.parse(raw);
        return {
          lastPlayedDate: parsed.lastPlayedDate || null,
          streak: parsed.streak || 0,
          totalCompleted: parsed.totalCompleted || 0,
          bestStreak: parsed.bestStreak || 0,
        };
      }
    } catch (_) {}
    return createDailyState();
  }

  function saveDailyState(state) {
    try { localStorage.setItem('pa_daily_challenge', JSON.stringify(state)); } catch (_) {}
  }

  /* ---------- Export ---------- */
  window.DailyChallengeLogic = {
    getDailyKey: getDailyKey,
    getDailySeed: getDailySeed,
    getDailyGameId: getDailyGameId,
    getDailyBonusStars: getDailyBonusStars,
    getDailyXpMultiplier: getDailyXpMultiplier,
    createDailyState: createDailyState,
    canPlayDaily: canPlayDaily,
    recordDailyPlay: recordDailyPlay,
    getStreakInfo: getStreakInfo,
    loadDailyState: loadDailyState,
    saveDailyState: saveDailyState,
  };
})();